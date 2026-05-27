package com.jobscout.security;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class DjangoPbkdf2PasswordEncoderTest {

    private final DjangoPbkdf2PasswordEncoder encoder = new DjangoPbkdf2PasswordEncoder();

    @Test
    void matchesDjangoPbkdf2Sha256Hash() {
        String encoded = "pbkdf2_sha256$260000$testsalt$PVWfp8yyd7eHuTIoewBVfzreVnm+jU2o45Sn/SwzvmQ=";

        assertThat(encoder.matches("s3cret!", encoded)).isTrue();
        assertThat(encoder.matches("wrong", encoded)).isFalse();
    }

    @Test
    void rejectsUnsupportedOrMalformedHashes() {
        assertThat(encoder.matches("s3cret!", null)).isFalse();
        assertThat(encoder.matches("s3cret!", "")).isFalse();
        assertThat(encoder.matches("s3cret!", "bcrypt$abc")).isFalse();
        assertThat(encoder.matches("s3cret!", "pbkdf2_sha256$bad$testsalt$abc")).isFalse();
        assertThat(encoder.matches("s3cret!", "pbkdf2_sha256$260000$testsalt$not-base64")).isFalse();
    }

    @Test
    void encodesInDjangoCompatibleFormat() {
        String encoded = encoder.encode("s3cret!");

        assertThat(encoded).startsWith("pbkdf2_sha256$");
        assertThat(encoder.matches("s3cret!", encoded)).isTrue();
    }
}
