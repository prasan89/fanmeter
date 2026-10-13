package com.fanclash.api.config;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

/**
 * Validates the X-Admin-Secret header for all /api/admin/** endpoints.
 * No Spring Security dependency — a single shared secret in an env var is
 * sufficient for an internal admin API accessed by a password-gated UI.
 */
@Component
public class AdminAuthInterceptor implements HandlerInterceptor {

    @Value("${fanclash.admin.secret:dev-secret}")
    private String adminSecret;

    @Override
    public boolean preHandle(HttpServletRequest request,
                             HttpServletResponse response,
                             Object handler) throws Exception {
        String header = request.getHeader("X-Admin-Secret");
        if (adminSecret.equals(header)) return true;
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.getWriter().write("{\"success\":false,\"message\":\"Unauthorized\"}");
        return false;
    }
}
