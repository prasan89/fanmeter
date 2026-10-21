package com.fanclash.api.chat.repository;

import com.fanclash.api.chat.entity.ChatMessage;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {

    @Query("SELECT m FROM ChatMessage m WHERE m.roomId = :roomId AND m.deletedAt IS NULL " +
           "ORDER BY m.createdAt DESC")
    List<ChatMessage> findRecentByRoomId(@Param("roomId") String roomId, Pageable pageable);

    @Query("SELECT m FROM ChatMessage m WHERE m.roomId = :roomId AND m.deletedAt IS NULL " +
           "AND m.createdAt < :before ORDER BY m.createdAt DESC")
    List<ChatMessage> findBeforeByRoomId(@Param("roomId") String roomId,
                                          @Param("before") Instant before,
                                          Pageable pageable);

    @Query("SELECT m FROM ChatMessage m WHERE m.roomId = :roomId AND m.idempotencyKey = :key")
    Optional<ChatMessage> findByRoomIdAndIdempotencyKey(@Param("roomId") String roomId,
                                                         @Param("key") String key);

    @Query("SELECT COUNT(m) FROM ChatMessage m WHERE m.guestToken = :token AND m.roomId = :roomId " +
           "AND m.createdAt >= :since AND m.deletedAt IS NULL")
    long countRecentByGuestTokenAndRoom(@Param("token") String token,
                                         @Param("roomId") String roomId,
                                         @Param("since") Instant since);
}
