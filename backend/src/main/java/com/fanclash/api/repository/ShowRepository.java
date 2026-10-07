package com.fanclash.api.repository;

import com.fanclash.api.entity.Show;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ShowRepository extends JpaRepository<Show, Long> {
    Optional<Show> findBySlug(String slug);
    List<Show> findByCategory(String category);
    List<Show> findByStatus(String status);
    List<Show> findAllByOrderByCreatedAtDesc();
}
