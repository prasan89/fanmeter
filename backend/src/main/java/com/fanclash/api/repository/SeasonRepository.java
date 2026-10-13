package com.fanclash.api.repository;

import com.fanclash.api.entity.Season;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SeasonRepository extends JpaRepository<Season, Long> {
    List<Season> findByShowIdOrderBySeasonNumberDesc(Long showId);
    List<Season> findByStatus(String status);

    @Query("SELECT s FROM Season s WHERE s.show.slug = :showSlug AND s.status = :status ORDER BY s.seasonNumber DESC")
    List<Season> findByShowSlugAndStatus(@Param("showSlug") String showSlug, @Param("status") String status);
}
