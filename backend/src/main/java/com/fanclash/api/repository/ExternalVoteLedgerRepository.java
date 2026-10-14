package com.fanclash.api.repository;

import com.fanclash.api.entity.ExternalVoteLedger;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ExternalVoteLedgerRepository extends JpaRepository<ExternalVoteLedger, Long> {

    Optional<ExternalVoteLedger> findBySourceKeyAndShowSlugAndContestantId(
        String sourceKey, String showSlug, Long contestantId);

    List<ExternalVoteLedger> findBySourceKeyAndShowSlug(String sourceKey, String showSlug);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query(value = """
        INSERT INTO external_vote_ledger (source_key, show_slug, contestant_id, last_raw_count, last_applied_at)
        VALUES (:sourceKey, :showSlug, :contestantId, :rawCount, NOW())
        ON CONFLICT (source_key, show_slug, contestant_id)
        DO UPDATE SET last_raw_count = :rawCount, last_applied_at = NOW()
        """, nativeQuery = true)
    void upsert(@Param("sourceKey") String sourceKey,
                @Param("showSlug") String showSlug,
                @Param("contestantId") Long contestantId,
                @Param("rawCount") long rawCount);
}
