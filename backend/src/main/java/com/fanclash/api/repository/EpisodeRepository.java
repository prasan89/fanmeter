package com.fanclash.api.repository;

import com.fanclash.api.entity.Episode;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface EpisodeRepository extends JpaRepository<Episode, Long> {
    List<Episode> findBySeasonIdOrderByEpisodeNumberAsc(Long seasonId);
    List<Episode> findBySeasonIdOrderByEpisodeNumberDesc(Long seasonId);

    @EntityGraph(attributePaths = {"season", "season.show"})
    Optional<Episode> findById(Long id);
}
