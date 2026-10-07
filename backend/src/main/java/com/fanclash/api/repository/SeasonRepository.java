package com.fanclash.api.repository;

import com.fanclash.api.entity.Season;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SeasonRepository extends JpaRepository<Season, Long> {
    List<Season> findByShowIdOrderBySeasonNumberDesc(Long showId);
    List<Season> findByStatus(String status);
}
