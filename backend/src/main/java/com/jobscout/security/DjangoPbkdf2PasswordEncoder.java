package com.jobscout.security;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.security.spec.KeySpec;
import java.util.Base64;
import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.PBEKeySpec;
import org.springframework.security.crypto.password.PasswordEncoder;

/**
 * Verifies Django's built-in PBKDF2-SHA256 password format:
 * pbkdf2_sha256$iterations$salt$base64Hash.
 */
public class DjangoPbkdf2PasswordEncoder implements PasswordEncoder {

    private static final String PREFIX = "pbkdf2_sha256";
    private static final int DEFAULT_ITERATIONS = 870_000;
    private static final int KEY_LENGTH_BITS = 256;
    private static final String SALT_CHARS =
        "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

    private final SecureRandom random = new SecureRandom();

    @Override
    public String encode(CharSequence rawPassword) {
        String salt = randomSalt();
        byte[] hash = pbkdf2(rawPassword, salt, DEFAULT_ITERATIONS);
        return PREFIX + "$" + DEFAULT_ITERATIONS + "$" + salt + "$"
            + Base64.getEncoder().encodeToString(hash);
    }

    @Override
    public boolean matches(CharSequence rawPassword, String encodedPassword) {
        if (encodedPassword == null || encodedPassword.isBlank()) {
            return false;
        }
        String[] parts = encodedPassword.split("\\$", 4);
        if (parts.length != 4 || !PREFIX.equals(parts[0])) {
            return false;
        }

        int iterations;
        try {
            iterations = Integer.parseInt(parts[1]);
        } catch (NumberFormatException e) {
            return false;
        }

        byte[] expected;
        try {
            expected = Base64.getDecoder().decode(parts[3]);
        } catch (IllegalArgumentException e) {
            return false;
        }

        byte[] actual = pbkdf2(rawPassword, parts[2], iterations);
        return MessageDigest.isEqual(actual, expected);
    }

    private byte[] pbkdf2(CharSequence rawPassword, String salt, int iterations) {
        try {
            KeySpec spec = new PBEKeySpec(
                rawPassword.toString().toCharArray(),
                salt.getBytes(StandardCharsets.UTF_8),
                iterations,
                KEY_LENGTH_BITS);
            return SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256")
                .generateSecret(spec)
                .getEncoded();
        } catch (Exception e) {
            throw new IllegalStateException("Unable to calculate PBKDF2-SHA256 hash", e);
        }
    }

    private String randomSalt() {
        StringBuilder salt = new StringBuilder(12);
        for (int i = 0; i < 12; i++) {
            salt.append(SALT_CHARS.charAt(random.nextInt(SALT_CHARS.length())));
        }
        return salt.toString();
    }
}
