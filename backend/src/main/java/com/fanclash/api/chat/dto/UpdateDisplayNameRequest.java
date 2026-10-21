package com.fanclash.api.chat.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateDisplayNameRequest(
    @NotBlank @Size(min = 3, max = 24) String displayName
) {}
