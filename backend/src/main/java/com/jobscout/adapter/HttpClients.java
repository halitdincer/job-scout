package com.jobscout.adapter;

import java.time.Duration;
import org.springframework.boot.web.client.RestClientCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.ClientHttpRequestFactory;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

@Configuration
class HttpClients {

    @Bean
    RestClient adapterRestClient(RestClient.Builder builder) {
        return builder
            .requestFactory(timeoutFactory(Duration.ofSeconds(30)))
            .defaultHeader("User-Agent", "job-scout/1.0")
            .build();
    }

    @Bean
    RestClient detailRestClient(RestClient.Builder builder) {
        return builder
            .requestFactory(timeoutFactory(Duration.ofSeconds(15)))
            .defaultHeader("User-Agent", "job-scout/1.0")
            .build();
    }

    @Bean
    RestClientCustomizer adapterRestClientCustomizer() {
        return restClientBuilder -> { /* no-op; per-bean config above */ };
    }

    private static ClientHttpRequestFactory timeoutFactory(Duration timeout) {
        SimpleClientHttpRequestFactory f = new SimpleClientHttpRequestFactory();
        f.setConnectTimeout((int) timeout.toMillis());
        f.setReadTimeout((int) timeout.toMillis());
        return f;
    }
}
