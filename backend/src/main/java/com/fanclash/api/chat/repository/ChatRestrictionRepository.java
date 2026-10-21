package com.fanclash.api.chat.repository;

import com.fanclash.api.chat.entity.ChatRestriction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;

public interface ChatRestrictionRepository extends JpaRepository<ChatRestriction, Long> {

    /**
     * Find active restrictions for a token that apply globally or to a specific room/event scope.
     * A restriction is active if not revoked and not expired.
     * We use a native query to support the LIKE pattern match for EVENT scope.
     */
    @Query(value =
        "SELECT * FROM chat_restrictions r " +
        "WHERE r.guest_token = :token " +
        "  AND r.revoked_at IS NULL " +
        "  AND (r.expires_at IS NULL OR r.expires_at > :now) " +
        "  AND (r.scope = 'GLOBAL' " +
        "       OR (r.scope = 'ROOM' AND r.scope_ref = :roomId) " +
        "       OR (r.scope = 'EVENT' AND :roomId LIKE CONCAT('event:', r.scope_ref, '%'))) " +
        "ORDER BY r.created_at DESC",
        nativeQuery = true)
    List<ChatRestriction> findActiveForTokenInRoom(
            @Param("token") String token,
            @Param("roomId") String roomId,
            @Param("now") Instant now);

    @Query("SELECT r FROM ChatRestriction r WHERE r.guestToken = :token ORDER BY r.createdAt DESC")
    List<ChatRestriction> findAllByToken(@Param("token") String token);

    @Query("SELECT COUNT(r) FROM ChatRestriction r " +
           "WHERE r.guestToken = :token " +
           "  AND r.revokedAt IS NULL " +
           "  AND (r.expiresAt IS NULL OR r.expiresAt > :since)")
    long countViolationsAfter(@Param("token") String token, @Param("since") Instant since);

    List<ChatRestriction> findByAppealStatus(ChatRestriction.AppealStatus appealStatus);
}
