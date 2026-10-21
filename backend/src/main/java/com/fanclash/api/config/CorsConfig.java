package com.fanclash.api.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;

import java.util.Arrays;
import java.util.List;

@Configuration
public class CorsConfig {

    @Value("${fanclash.cors.allowed-origins:http://localhost:3000}")
    private String allowedOrigins;

    @Bean
    public CorsFilter corsFilter() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOriginPatterns(Arrays.asList(allowedOrigins.split(",")));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", config);

        // SSE streams require explicit Allow-Headers for EventSource
        CorsConfiguration sseConfig = new CorsConfiguration();
        sseConfig.setAllowedOriginPatterns(Arrays.asList(allowedOrigins.split(",")));
        sseConfig.setAllowedMethods(List.of("GET", "OPTIONS"));
        sseConfig.setAllowedHeaders(List.of("*"));
        sseConfig.setAllowCredentials(true);
        source.registerCorsConfiguration("/api/chat/*/stream", sseConfig);

        return new CorsFilter(source);
    }
}
