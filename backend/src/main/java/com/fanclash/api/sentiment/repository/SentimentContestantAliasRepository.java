package com.fanclash.api.sentiment.repository;

import com.fanclash.api.sentiment.entity.SentimentContestantAlias;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface SentimentContestantAliasRepository extends JpaRepository<SentimentContestantAlias, Long> {
    Optional<SentimentContestantAlias> findBySourceIdAndAliasSlug(Long sourceId, String aliasSlug);
    List<SentimentContestantAlias> findBySourceIdAndAliasNameIgnoreCase(Long sourceId, String aliasName);
    List<SentimentContestantAlias> findByContestantId(Long contestantId);
}
