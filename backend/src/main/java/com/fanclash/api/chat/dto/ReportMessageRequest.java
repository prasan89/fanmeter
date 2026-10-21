package com.fanclash.api.chat.dto;

import com.fanclash.api.chat.entity.ChatReport;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ReportMessageRequest(
    @NotBlank @Size(max = 64) String reporterToken,
    @NotNull ChatReport.Category category
) {}
