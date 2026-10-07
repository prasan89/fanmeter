package com.fanclash.api.repository;

import com.fanclash.api.entity.Contestant;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ContestantRepository extends JpaRepository<Contestant, Long> {
    List<Contestant> findBySeasonIdOrderByNameAsc(Long seasonId);
    List<Contestant> findBySeasonIdAndStatus(Long seasonId, String status);

    @EntityGraph(attributePaths = {"season", "season.show"})
    Optional<Contestant> findBySlug(String slug);

    @EntityGraph(attributePaths = {"season", "season.show"})
    @Query("SELECT c FROM Contestant c WHERE " +
           "LOWER(c.name) LIKE LOWER(CONCAT('%', :q, '%')) " +
           "ORDER BY c.status ASC, c.name ASC")
    List<Contestant> searchByQuery(@Param("q") String q);
}
