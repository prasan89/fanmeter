package com.fanclash.api.chat.repository;

import com.fanclash.api.chat.entity.ChatViolationCount;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;

public interface ChatViolationCountRepository extends JpaRepository<ChatViolationCount, String> {

    @Modifying
    @Query(value =
        "INSERT INTO chat_violation_counts (guest_token, minor_count, serious_count, last_violation, updated_at) " +
        "VALUES (:token, :minor, :serious, :ts, :ts) " +
        "ON CONFLICT (guest_token) DO UPDATE SET " +
        "minor_count = chat_violation_counts.minor_count + :minor, " +
        "serious_count = chat_violation_counts.serious_count + :serious, " +
        "last_violation = :ts, updated_at = :ts",
        nativeQuery = true)
    void incrementViolations(
            @Param("token")   String token,
            @Param("minor")   int minor,
            @Param("serious") int serious,
            @Param("ts")      Instant ts);
}
