package com.fanclash.api.chat.repository;

import com.fanclash.api.chat.entity.ChatGuestToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;

public interface ChatGuestTokenRepository extends JpaRepository<ChatGuestToken, String> {

    @Modifying
    @Query("UPDATE ChatGuestToken t SET t.lastSeenAt = :now WHERE t.token = :token")
    void touchLastSeen(@Param("token") String token, @Param("now") Instant now);
}
