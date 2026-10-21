package com.fanclash.api.chat.repository;

import com.fanclash.api.chat.entity.ChatReport;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface ChatReportRepository extends JpaRepository<ChatReport, Long> {

    Optional<ChatReport> findByMessageIdAndReporterToken(Long messageId, String reporterToken);

    @Query("SELECT COUNT(r) FROM ChatReport r WHERE r.reporterToken = :token AND r.createdAt > :since")
    long countRecentByReporter(@Param("token") String token, @Param("since") Instant since);

    @Query("SELECT r FROM ChatReport r WHERE r.reviewedAt IS NULL ORDER BY r.priority DESC, r.createdAt ASC")
    List<ChatReport> findPendingReports(Pageable pageable);

    List<ChatReport> findByReportedToken(String reportedToken);
}
