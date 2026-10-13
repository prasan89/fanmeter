package com.fanclash.api.repository;

import com.fanclash.api.entity.FanVote;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface FanVoteRepository extends JpaRepository<FanVote, Long> {

    boolean existsByVotingRoundIdAndContestantIdAndVoterKey(
        Long votingRoundId, Long contestantId, String voterKey);

    @Query("SELECT v.contestant.id, COUNT(v) FROM FanVote v " +
           "WHERE v.votingRound.id = :roundId GROUP BY v.contestant.id")
    List<Object[]> countVotesByRound(@Param("roundId") Long roundId);

    long countByVoterKeyAndVotingRoundIdAndCreatedAtAfter(
        String voterKey, Long votingRoundId, LocalDateTime since);
}
