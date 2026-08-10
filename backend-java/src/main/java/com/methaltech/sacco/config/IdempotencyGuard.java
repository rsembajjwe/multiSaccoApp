package com.methaltech.sacco.config;

import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Shared idempotency-key reservation for write paths that must not be processed twice.
 *
 * <p>The default memory store is for development and single-node deployments. Multi-instance
 * production should use {@code sacco.idempotency.store=redis} with {@code sacco.redis.url}.
 */
@Component
public class IdempotencyGuard {

    private final IdempotencyStore store;
    private final Duration ttl;

    @Autowired
    public IdempotencyGuard(
            @Value("${sacco.idempotency.store:memory}") String storeName,
            @Value("${sacco.redis.url:}") String redisUrl,
            @Value("${sacco.idempotency.ttl:PT24H}") Duration ttl) {
        this(storeFor(storeName, redisUrl), ttl);
    }

    IdempotencyGuard(String storeName, IdempotencyCommands commands, Duration ttl) {
        this(storeFor(storeName, "", commands), ttl);
    }

    IdempotencyGuard(IdempotencyStore store, Duration ttl) {
        this.store = store;
        this.ttl = ttl;
    }

    public boolean reserve(String scope, String idempotencyKey) {
        if (idempotencyKey == null || idempotencyKey.isBlank()) {
            return true;
        }
        String namespacedKey = "sacco:idempotency:" + normalize(scope) + ":" + idempotencyKey.trim();
        return store.reserve(namespacedKey, ttl);
    }

    private static IdempotencyStore storeFor(String storeName, String redisUrl) {
        return storeFor(storeName, redisUrl, null);
    }

    private static IdempotencyStore storeFor(String storeName, String redisUrl, IdempotencyCommands testCommands) {
        String normalized = storeName == null ? "memory" : storeName.trim().toLowerCase();
        if (normalized.isBlank() || "memory".equals(normalized)) {
            return new InMemoryIdempotencyStore();
        }
        if ("redis".equals(normalized)) {
            IdempotencyCommands commands = testCommands;
            if (commands == null) {
                if (redisUrl == null || redisUrl.isBlank()) {
                    throw new IllegalStateException("SACCO_IDEMPOTENCY_STORE=redis requires SACCO_REDIS_URL.");
                }
                commands = new RespRedisIdempotencyCommands(redisUrl);
            }
            return new RedisIdempotencyStore(commands);
        }
        throw new IllegalStateException("Unsupported SACCO_IDEMPOTENCY_STORE: " + storeName);
    }

    private static String normalize(String scope) {
        return scope == null || scope.isBlank() ? "global" : scope.trim().toLowerCase().replaceAll("[^a-z0-9_.:-]", "_");
    }
}

interface IdempotencyStore {
    boolean reserve(String key, Duration ttl);
}

class InMemoryIdempotencyStore implements IdempotencyStore {

    private final Map<String, Long> reservations = new ConcurrentHashMap<>();

    @Override
    public boolean reserve(String key, Duration ttl) {
        long expiresAt = System.nanoTime() + Math.max(1L, ttl.toNanos());
        Long previous = reservations.putIfAbsent(key, expiresAt);
        if (previous == null) {
            return true;
        }
        if (previous <= System.nanoTime() && reservations.replace(key, previous, expiresAt)) {
            return true;
        }
        return false;
    }
}

interface IdempotencyCommands {
    boolean setIfAbsent(String key, Duration ttl);
}

class RedisIdempotencyStore implements IdempotencyStore {

    private final IdempotencyCommands commands;

    RedisIdempotencyStore(IdempotencyCommands commands) {
        this.commands = commands;
    }

    @Override
    public boolean reserve(String key, Duration ttl) {
        return commands.setIfAbsent(key, ttl);
    }
}

class RespRedisIdempotencyCommands implements IdempotencyCommands {

    private final RedisEndpoint endpoint;

    RespRedisIdempotencyCommands(String redisUrl) {
        this.endpoint = RedisEndpoint.parse(redisUrl);
    }

    @Override
    public boolean setIfAbsent(String key, Duration ttl) {
        try (Socket socket = new Socket()) {
            socket.connect(new InetSocketAddress(endpoint.host(), endpoint.port()), endpoint.timeoutMillis());
            socket.setSoTimeout(endpoint.timeoutMillis());
            BufferedInputStream input = new BufferedInputStream(socket.getInputStream());
            BufferedOutputStream output = new BufferedOutputStream(socket.getOutputStream());

            authenticate(input, output);
            selectDatabase(input, output);
            writeCommand(output, List.of("SET", key, "1", "PX", String.valueOf(Math.max(1L, ttl.toMillis())), "NX"));
            String response = readLine(input);
            return "+OK".equals(response);
        } catch (IOException ex) {
            throw new IllegalStateException("Redis idempotency store is unavailable at " + endpoint.safeUrl(), ex);
        }
    }

    private void authenticate(BufferedInputStream input, BufferedOutputStream output) throws IOException {
        if (endpoint.password() == null || endpoint.password().isBlank()) {
            return;
        }
        List<String> auth = endpoint.username() == null || endpoint.username().isBlank()
                ? List.of("AUTH", endpoint.password())
                : List.of("AUTH", endpoint.username(), endpoint.password());
        writeCommand(output, auth);
        readSimpleOk(input);
    }

    private void selectDatabase(BufferedInputStream input, BufferedOutputStream output) throws IOException {
        if (endpoint.database() <= 0) {
            return;
        }
        writeCommand(output, List.of("SELECT", String.valueOf(endpoint.database())));
        readSimpleOk(input);
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
            throw new IOException("Unexpected Redis response: " + response);
        }
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
