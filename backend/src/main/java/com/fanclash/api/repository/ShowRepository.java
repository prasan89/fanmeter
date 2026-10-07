package com.fanclash.api.repository;

import com.fanclash.api.entity.Show;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ShowRepository extends JpaRepository<Show, Long> {
    Optional<Show> findBySlug(String slug);
    List<Show> findByCategory(String category);
    List<Show> findByStatus(String status);
    List<Show> findAllByOrderByCreatedAtDesc();

    @Query("SELECT s FROM Show s WHERE " +
           "(:category IS NULL OR s.category = :category) AND " +
           "(:language IS NULL OR LOWER(s.language) = LOWER(:language)) AND " +
           "(:status IS NULL OR s.status = :status) " +
           "ORDER BY s.createdAt DESC")
    List<Show> findByFilters(@Param("category") String category,
                             @Param("language") String language,
                             @Param("status") String status);

    @Query("SELECT s FROM Show s WHERE " +
           "LOWER(s.name) LIKE LOWER(CONCAT('%', :q, '%')) OR " +
           "LOWER(s.description) LIKE LOWER(CONCAT('%', :q, '%')) " +
           "ORDER BY s.status ASC, s.createdAt DESC")
    List<Show> searchByQuery(@Param("q") String q);
}
