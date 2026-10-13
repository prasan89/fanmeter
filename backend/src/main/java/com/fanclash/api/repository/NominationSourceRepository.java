package com.fanclash.api.repository;

import com.fanclash.api.entity.NominationSource;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface NominationSourceRepository extends JpaRepository<NominationSource, Long> {

    List<NominationSource> findByPollId(Long pollId);
}
