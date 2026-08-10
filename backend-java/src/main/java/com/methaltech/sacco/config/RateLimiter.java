package com.methaltech.sacco.config;

import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.net.URI;
import java.net.URISyntaxException;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.LongSupplier;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * A small, dependency-free, thread-safe token-bucket rate limiter facade.
 *
 * <p>The default store is memory, which matches the current single-node deployment. The store
 * boundary is explicit so horizontal scale can move the same caller contract to Redis without
 * changing filters/controllers.
 */
@Component
public class RateLimiter {

    private final RateLimitStore store;

    @Autowired
    public RateLimiter(
            @Value("${sacco.rate-limit.store:memory}") String storeName,
            @Value("${sacco.redis.url:}") String redisUrl) {
        this(storeFor(storeName, System::nanoTime, redisUrl));
    }

    // Visible for testing: lets tests drive virtual time deterministically.
    RateLimiter(LongSupplier nanoClock) {
        this(new InMemoryRateLimitStore(nanoClock));
    }

    RateLimiter(String storeName, RedisRateLimitCommands redisCommands) {
        this(storeFor(storeName, System::nanoTime, "", redisCommands));
    }

    RateLimiter(RateLimitStore store) {
        this.store = store;
    }

    /**
     * Attempts to consume a single token for {@code key}.
     *
     * @return {@code true} if the request is allowed, {@code false} if the limit is exceeded.
     */
    public boolean tryAcquire(String key, int capacity, Duration refillPeriod) {
        return store.tryAcquire(key, capacity, refillPeriod);
    }

    private static RateLimitStore storeFor(String storeName, LongSupplier nanoClock, String redisUrl) {
        return storeFor(storeName, nanoClock, redisUrl, null);
    }

    private static RateLimitStore storeFor(
            String storeName,
            LongSupplier nanoClock,
            String redisUrl,
            RedisRateLimitCommands testRedisCommands) {
        String normalized = storeName == null ? "memory" : storeName.trim().toLowerCase();
        if (normalized.isBlank() || "memory".equals(normalized)) {
            return new InMemoryRateLimitStore(nanoClock);
        }
        if ("redis".equals(normalized)) {
            RedisRateLimitCommands commands = testRedisCommands;
            if (commands == null) {
                if (redisUrl == null || redisUrl.isBlank()) {
                    throw new IllegalStateException(
                            "SACCO_RATE_LIMIT_STORE=redis requires SACCO_REDIS_URL.");
                }
                commands = new RespRedisRateLimitCommands(redisUrl);
            }
            return new RedisFixedWindowRateLimitStore(commands);
        }
        throw new IllegalStateException("Unsupported SACCO_RATE_LIMIT_STORE: " + storeName);
    }
}

interface RateLimitStore {
    boolean tryAcquire(String key, int capacity, Duration refillPeriod);
}

interface RedisRateLimitCommands {
    long incrementAndExpire(String key, Duration ttl);
}

class RedisFixedWindowRateLimitStore implements RateLimitStore {

    private final RedisRateLimitCommands commands;

    RedisFixedWindowRateLimitStore(RedisRateLimitCommands commands) {
        this.commands = commands;
    }

    @Override
    public boolean tryAcquire(String key, int capacity, Duration refillPeriod) {
        if (capacity <= 0) {
            return true;
        }
        long count = commands.incrementAndExpire("sacco:rate-limit:" + key, refillPeriod);
        return count <= capacity;
    }
}

class RespRedisRateLimitCommands implements RedisRateLimitCommands {

    private static final String INCREMENT_WITH_TTL = """
            local count = redis.call('INCR', KEYS[1])
            if count == 1 then
              redis.call('PEXPIRE', KEYS[1], ARGV[1])
            end
            return count
            """;

    private final RedisEndpoint endpoint;

    RespRedisRateLimitCommands(String redisUrl) {
        this.endpoint = RedisEndpoint.parse(redisUrl);
    }

    @Override
    public long incrementAndExpire(String key, Duration ttl) {
        try (Socket socket = new Socket()) {
            socket.connect(new InetSocketAddress(endpoint.host(), endpoint.port()), endpoint.timeoutMillis());
            socket.setSoTimeout(endpoint.timeoutMillis());
            BufferedInputStream input = new BufferedInputStream(socket.getInputStream());
            BufferedOutputStream output = new BufferedOutputStream(socket.getOutputStream());

            if (endpoint.password() != null && !endpoint.password().isBlank()) {
                List<String> auth = endpoint.username() == null || endpoint.username().isBlank()
                        ? List.of("AUTH", endpoint.password())
                        : List.of("AUTH", endpoint.username(), endpoint.password());
                writeCommand(output, auth);
                readSimpleOk(input);
            }
            if (endpoint.database() > 0) {
                writeCommand(output, List.of("SELECT", String.valueOf(endpoint.database())));
                readSimpleOk(input);
            }

            writeCommand(output, List.of(
                    "EVAL",
                    INCREMENT_WITH_TTL,
                    "1",
                    key,
                    String.valueOf(Math.max(1L, ttl.toMillis()))));
            return readInteger(input);
        } catch (IOException ex) {
            throw new IllegalStateException("Redis rate-limit store is unavailable at " + endpoint.safeUrl(), ex);
        }
    }

    private static void writeCommand(BufferedOutputStream output, List<String> parts) throws IOException {
        output.write(("*" + parts.size() + "\r\n").getBytes(StandardCharsets.UTF_8));
        for (String part : parts) {
            byte[] bytes = part.getBytes(StandardCharsets.UTF_8);
            output.write(("$" + bytes.length + "\r\n").getBytes(StandardCharsets.UTF_8));
            output.write(bytes);
            output.write("\r\n".getBytes(StandardCharsets.UTF_8));
        }
        output.flush();
    }

    private static void readSimpleOk(BufferedInputStream input) throws IOException {
        String response = readLine(input);
        if (!"+OK".equals(response)) {
            throw redisError(response);
        }
    }

    private static long readInteger(BufferedInputStream input) throws IOException {
        String response = readLine(input);
        if (response.startsWith(":")) {
            return Long.parseLong(response.substring(1));
        }
        throw redisError(response);
    }

    private static IOException redisError(String response) {
        return new IOException("Unexpected Redis response: " + response);
    }

    private static String readLine(BufferedInputStream input) throws IOException {
        ByteArrayOutputStream buffer = new ByteArrayOutputStream();
        int previous = -1;
        int current;
        while ((current = input.read()) != -1) {
            if (previous == '\r' && current == '\n') {
                byte[] bytes = buffer.toByteArray();
                return new String(bytes, 0, bytes.length - 1, StandardCharsets.UTF_8);
            }
            buffer.write(current);
            previous = current;
        }
        throw new IOException("Redis closed the connection before sending a response.");
    }
}

record RedisEndpoint(String host, int port, String username, String password, int database, int timeoutMillis) {

    static RedisEndpoint parse(String redisUrl) {
        try {
            URI uri = new URI(redisUrl);
            if (!"redis".equalsIgnoreCase(uri.getScheme()) && !"rediss".equalsIgnoreCase(uri.getScheme())) {
                throw new IllegalArgumentException("SACCO_REDIS_URL must start with redis:// or rediss://");
            }
            if ("rediss".equalsIgnoreCase(uri.getScheme())) {
                throw new IllegalArgumentException("rediss:// is not supported by the dependency-free rate-limit adapter yet.");
            }
            String host = uri.getHost();
            if (host == null || host.isBlank()) {
                throw new IllegalArgumentException("SACCO_REDIS_URL must include a Redis host.");
            }
            int port = uri.getPort() > 0 ? uri.getPort() : 6379;
            Credentials credentials = Credentials.parse(uri.getRawUserInfo());
            int database = parseDatabase(uri.getPath());
            return new RedisEndpoint(host, port, credentials.username(), credentials.password(), database, 2_000);
        } catch (URISyntaxException ex) {
            throw new IllegalArgumentException("SACCO_REDIS_URL is not a valid Redis URL.", ex);
        }
    }

    String safeUrl() {
        return "redis://" + host + ":" + port + "/" + database;
    }

    private static int parseDatabase(String path) {
        if (path == null || path.isBlank() || "/".equals(path)) {
            return 0;
        }
        return Integer.parseInt(path.replaceFirst("^/", ""));
    }
}

record Credentials(String username, String password) {

    static Credentials parse(String rawUserInfo) {
        if (rawUserInfo == null || rawUserInfo.isBlank()) {
            return new Credentials("", "");
        }
        String decoded = java.net.URLDecoder.decode(rawUserInfo, StandardCharsets.UTF_8);
        int separator = decoded.indexOf(':');
        if (separator < 0) {
            return new Credentials("", decoded);
        }
        return new Credentials(decoded.substring(0, separator), decoded.substring(separator + 1));
    }
}

class InMemoryRateLimitStore implements RateLimitStore {

    private static final int CLEANUP_THRESHOLD = 10_000;

    private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();
    private final LongSupplier nanoClock;

    InMemoryRateLimitStore(LongSupplier nanoClock) {
        this.nanoClock = nanoClock;
    }

    @Override
    public boolean tryAcquire(String key, int capacity, Duration refillPeriod) {
        if (capacity <= 0) {
            return true;
        }
        if (buckets.size() > CLEANUP_THRESHOLD) {
            evictIdleBuckets();
        }
        long nanosPerToken = Math.max(1L, refillPeriod.toNanos() / capacity);
        Bucket bucket = buckets.computeIfAbsent(key, k -> new Bucket(capacity, nanoClock.getAsLong()));
        return bucket.tryAcquire(capacity, nanosPerToken, nanoClock.getAsLong());
    }

    private void evictIdleBuckets() {
        buckets.forEach((key, bucket) -> {
            if (bucket.isFull()) {
                buckets.remove(key, bucket);
            }
        });
    }

    private static final class Bucket {
        private double tokens;
        private long lastRefillNanos;

        Bucket(int capacity, long now) {
            this.tokens = capacity;
            this.lastRefillNanos = now;
        }

        synchronized boolean tryAcquire(int capacity, long nanosPerToken, long now) {
            refill(capacity, nanosPerToken, now);
            if (tokens >= 1.0) {
                tokens -= 1.0;
                return true;
            }
            return false;
        }

        synchronized boolean isFull() {
            return tokens >= 0.999;
        }

        private void refill(int capacity, long nanosPerToken, long now) {
            long elapsed = now - lastRefillNanos;
            if (elapsed <= 0) {
                return;
            }
            double refilled = (double) elapsed / (double) nanosPerToken;
            if (refilled > 0) {
                tokens = Math.min(capacity, tokens + refilled);
                lastRefillNanos = now;
            }
        }
    }
}
