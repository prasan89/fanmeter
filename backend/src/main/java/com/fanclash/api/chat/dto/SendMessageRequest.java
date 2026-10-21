package com.fanclash.api.chat.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SendMessageRequest(
    @NotBlank @Size(max = 64)  String guestToken,
    @NotBlank @Size(max = 500) String messageText,
    @Size(max = 64)            String idempotencyKey
) {}
