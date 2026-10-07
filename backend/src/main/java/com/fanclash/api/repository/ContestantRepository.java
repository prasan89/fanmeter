package com.fanclash.api.repository;

import com.fanclash.api.entity.Contestant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ContestantRepository extends JpaRepository<Contestant, Long> {
    List<Contestant> findBySeasonIdOrderByNameAsc(Long seasonId);
    List<Contestant> findBySeasonIdAndStatus(Long seasonId, String status);
}
