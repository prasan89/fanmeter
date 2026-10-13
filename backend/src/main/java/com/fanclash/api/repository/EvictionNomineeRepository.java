package com.fanclash.api.repository;

import com.fanclash.api.entity.EvictionNominee;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface EvictionNomineeRepository extends JpaRepository<EvictionNominee, Long> {

    List<EvictionNominee> findByPollId(Long pollId);

    boolean existsByPollIdAndContestantId(Long pollId, Long contestantId);

    Optional<EvictionNominee> findByPollIdAndContestantId(Long pollId, Long contestantId);

    void deleteByPollId(Long pollId);
}
