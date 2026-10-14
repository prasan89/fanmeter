package com.fanclash.api.repository;

import com.fanclash.api.entity.NominationSource;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface NominationSourceRepository extends JpaRepository<NominationSource, Long> {

    List<NominationSource> findByPollId(Long pollId);

    Optional<NominationSource> findTopByPollIdOrderByRetrievedAtDesc(Long pollId);

    /** Fetch the latest source row for each poll in the given set — one query instead of N. */
    @Query("SELECT s FROM NominationSource s WHERE s.poll.id IN :pollIds AND s.retrievedAt = " +
           "(SELECT MAX(s2.retrievedAt) FROM NominationSource s2 WHERE s2.poll.id = s.poll.id)")
    List<NominationSource> findLatestByPollIds(@Param("pollIds") Collection<Long> pollIds);
}
