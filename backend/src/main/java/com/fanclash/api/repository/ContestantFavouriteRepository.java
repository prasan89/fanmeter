package com.fanclash.api.repository;

import com.fanclash.api.entity.ContestantFavourite;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ContestantFavouriteRepository extends JpaRepository<ContestantFavourite, Long> {

    boolean existsByIdempotencyKey(String idempotencyKey);

    Optional<ContestantFavourite> findByIdempotencyKey(String idempotencyKey);
}
