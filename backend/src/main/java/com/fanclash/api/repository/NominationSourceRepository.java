package com.fanclash.api.repository;

import com.fanclash.api.entity.NominationSource;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface NominationSourceRepository extends JpaRepository<NominationSource, Long> {

    List<NominationSource> findByPollId(Long pollId);

    Optional<NominationSource> findTopByPollIdOrderByRetrievedAtDesc(Long pollId);
}
