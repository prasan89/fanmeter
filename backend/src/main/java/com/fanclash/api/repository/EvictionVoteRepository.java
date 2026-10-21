package com.fanclash.api.repository;

import com.fanclash.api.entity.EvictionVote;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface EvictionVoteRepository extends JpaRepository<EvictionVote, Long> {

    boolean existsByPollIdAndContestantIdAndVoterKey(Long pollId, Long contestantId, String voterKey);

    long countByVoterKeyAndPollIdAndCreatedAtAfter(String voterKey, Long pollId, LocalDateTime after);

    @Query("SELECT v.contestant.id, COUNT(v) FROM EvictionVote v WHERE v.poll.id = :pollId GROUP BY v.contestant.id")
    List<Object[]> countVotesByPoll(@Param("pollId") Long pollId);

    long countByPollIdAndContestantId(Long pollId, Long contestantId);

    void deleteByPollId(Long pollId);
}
