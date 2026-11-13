package com.methaltech.sacco.config;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.net.ServerSocket;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.Test;

class RedisProtocolAdapterTest {

    @Test
    void parsesRedisEndpointsWithoutLeakingCredentials() {
        RedisEndpoint plain = RedisEndpoint.parse("redis://localhost");
        assertEquals("localhost", plain.host());
        assertEquals(6379, plain.port());
        assertEquals(0, plain.database());
        assertEquals("", plain.username());
        assertEquals("", plain.password());

        RedisEndpoint passwordOnly = RedisEndpoint.parse("redis://secret@localhost:6380/4");
        assertEquals("", passwordOnly.username());
        assertEquals("secret", passwordOnly.password());
        assertEquals("redis://localhost:6380/4", passwordOnly.safeUrl());

        RedisEndpoint credentials = RedisEndpoint.parse("redis://service:p%40ss@127.0.0.1:6381/2");
        assertEquals("service", credentials.username());
        assertEquals("p@ss", credentials.password());
        assertEquals(2, credentials.database());

        assertThrows(IllegalArgumentException.class, () -> RedisEndpoint.parse("http://localhost:6379"));
        assertThrows(IllegalArgumentException.class, () -> RedisEndpoint.parse("rediss://localhost:6379"));
        assertThrows(IllegalArgumentException.class, () -> RedisEndpoint.parse("redis:///1"));
        assertThrows(IllegalArgumentException.class, () -> RedisEndpoint.parse("redis://local host"));
        assertThrows(NumberFormatException.class, () -> RedisEndpoint.parse("redis://localhost/not-a-number"));
    }

    @Test
    void rateLimitAdapterAuthenticatesSelectsAndEvaluatesAtomically() throws Exception {
        try (FakeRedisServer redis = new FakeRedisServer(List.of("+OK", "+OK", ":2"))) {
            RespRedisRateLimitCommands commands = new RespRedisRateLimitCommands(
                    "redis://service:p%40ss@127.0.0.1:" + redis.port() + "/3");

            assertEquals(2, commands.incrementAndExpire("rate:key", Duration.ZERO));
            List<List<String>> received = redis.awaitCommands();
            assertEquals(List.of("AUTH", "service", "p@ss"), received.get(0));
            assertEquals(List.of("SELECT", "3"), received.get(1));
            assertEquals("EVAL", received.get(2).get(0));
            assertEquals("rate:key", received.get(2).get(3));
            assertEquals("1", received.get(2).get(4));
        }
    }

    @Test
    void rateLimitAdapterSupportsPasswordOnlyAndRejectsUnexpectedReplies() throws Exception {
        try (FakeRedisServer redis = new FakeRedisServer(List.of("+OK", ":1"))) {
            RespRedisRateLimitCommands commands = new RespRedisRateLimitCommands(
                    "redis://secret@127.0.0.1:" + redis.port());
            assertEquals(1, commands.incrementAndExpire("rate:password", Duration.ofSeconds(2)));
            assertEquals(List.of("AUTH", "secret"), redis.awaitCommands().get(0));
        }

        try (FakeRedisServer redis = new FakeRedisServer(List.of("+PONG"))) {
            RespRedisRateLimitCommands commands = new RespRedisRateLimitCommands(
                    "redis://127.0.0.1:" + redis.port());
            IllegalStateException exception = assertThrows(IllegalStateException.class,
                    () -> commands.incrementAndExpire("rate:bad", Duration.ofSeconds(1)));
            assertTrue(exception.getMessage().contains("Redis rate-limit store is unavailable"));
        }
    }

    @Test
    void idempotencyAdapterHandlesReservationsDuplicatesAndProtocolFailures() throws Exception {
        try (FakeRedisServer redis = new FakeRedisServer(List.of("+OK", "+OK", "+OK"))) {
            RespRedisIdempotencyCommands commands = new RespRedisIdempotencyCommands(
                    "redis://service:secret@127.0.0.1:" + redis.port() + "/5");
            assertTrue(commands.setIfAbsent("idem:key", Duration.ZERO));
            List<List<String>> received = redis.awaitCommands();
            assertEquals(List.of("AUTH", "service", "secret"), received.get(0));
            assertEquals(List.of("SELECT", "5"), received.get(1));
            assertEquals(List.of("SET", "idem:key", "1", "PX", "1", "NX"), received.get(2));
        }

        try (FakeRedisServer redis = new FakeRedisServer(List.of("$-1"))) {
            RespRedisIdempotencyCommands commands = new RespRedisIdempotencyCommands(
                    "redis://127.0.0.1:" + redis.port());
            assertFalse(commands.setIfAbsent("idem:duplicate", Duration.ofSeconds(3)));
        }

        try (FakeRedisServer redis = new FakeRedisServer(List.of("-ERR invalid password"))) {
            RespRedisIdempotencyCommands commands = new RespRedisIdempotencyCommands(
                    "redis://bad@127.0.0.1:" + redis.port());
            IllegalStateException exception = assertThrows(IllegalStateException.class,
                    () -> commands.setIfAbsent("idem:error", Duration.ofSeconds(1)));
            assertTrue(exception.getMessage().contains("redis://127.0.0.1:" + redis.port() + "/0"));
            assertFalse(exception.getMessage().contains("bad@"));
        }
    }

    private static final class FakeRedisServer implements AutoCloseable {
        private final ServerSocket server;
        private final List<String> responses;
        private final CompletableFuture<List<List<String>>> commands = new CompletableFuture<>();
        private final Thread thread;

        private FakeRedisServer(List<String> responses) throws IOException {
            this.server = new ServerSocket(0);
            this.responses = responses;
            this.thread = new Thread(this::serve, "fake-redis");
            this.thread.start();
        }

        private int port() {
            return server.getLocalPort();
        }

        private List<List<String>> awaitCommands() throws Exception {
            return commands.get(5, TimeUnit.SECONDS);
        }

        private void serve() {
            List<List<String>> received = new ArrayList<>();
            try (Socket socket = server.accept();
                    BufferedInputStream input = new BufferedInputStream(socket.getInputStream());
                    BufferedOutputStream output = new BufferedOutputStream(socket.getOutputStream())) {
                for (String response : responses) {
                    received.add(readCommand(input));
                    output.write((response + "\r\n").getBytes(StandardCharsets.UTF_8));
                    output.flush();
                }
                commands.complete(received);
            } catch (Exception exception) {
                commands.completeExceptionally(exception);
            }
        }

        private static List<String> readCommand(BufferedInputStream input) throws IOException {
            String array = readLine(input);
            int parts = Integer.parseInt(array.substring(1));
            List<String> command = new ArrayList<>(parts);
            for (int index = 0; index < parts; index++) {
                int length = Integer.parseInt(readLine(input).substring(1));
                byte[] value = input.readNBytes(length);
                if (value.length != length) {
                    throw new IOException("Incomplete Redis command.");
                }
                if (input.read() != '\r' || input.read() != '\n') {
                    throw new IOException("Invalid Redis command terminator.");
                }
                command.add(new String(value, StandardCharsets.UTF_8));
            }
            return command;
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
            throw new IOException("Connection closed.");
        }

        @Override
        public void close() throws Exception {
            server.close();
            thread.join(5_000);
        }
    }
}
