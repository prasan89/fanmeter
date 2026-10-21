package com.fanclash.api.chat.repository;

import com.fanclash.api.chat.entity.ChatModerationLog;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ChatModerationLogRepository extends JpaRepository<ChatModerationLog, Long> {
}
