package com.jobscout.api;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jobscout.security.CurrentUserService;
import com.jobscout.security.SecurityConfig;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(controllers = AuthController.class)
@Import({SecurityConfig.class, AuthCsrfTest.TestBeans.class})
class AuthCsrfTest {

    @Autowired
    MockMvc mockMvc;

    @MockitoBean
    CurrentUserService currentUserService;

    @Test
    void csrfPassesWhenCookieValueIsEchoedInHeader() throws Exception {
        String token = "csrf-token-value";

        // Cookie value verbatim as X-CSRFToken. The default Spring Security 6
        // XorCsrfTokenRequestAttributeHandler would 403 here because it
        // expects an XOR-encoded header value; the plain
        // CsrfTokenRequestAttributeHandler our config installs accepts the
        // raw value, so we land in the auth code path and get 401 for
        // unknown credentials.
        mockMvc.perform(post("/api/v1/auth/login")
                .cookie(new Cookie("csrftoken", token))
                .header("X-CSRFToken", token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"username\":\"nope\",\"password\":\"nope\"}"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void csrfRejectsWhenHeaderIsMissing() throws Exception {
        mockMvc.perform(post("/api/v1/auth/login")
                .cookie(new Cookie("csrftoken", "any"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"username\":\"nope\",\"password\":\"nope\"}"))
            .andExpect(status().isForbidden());
    }

    @Test
    void csrfRejectsWhenHeaderDoesNotMatchCookie() throws Exception {
        mockMvc.perform(post("/api/v1/auth/login")
                .cookie(new Cookie("csrftoken", "expected"))
                .header("X-CSRFToken", "different")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"username\":\"nope\",\"password\":\"nope\"}"))
            .andExpect(status().isForbidden());
    }

    @TestConfiguration
    static class TestBeans {
        @Bean
        UserDetailsService userDetailsService() {
            return username -> {
                throw new UsernameNotFoundException(username);
            };
        }
    }
}
