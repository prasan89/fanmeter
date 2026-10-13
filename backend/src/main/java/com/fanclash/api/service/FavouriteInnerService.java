package com.fanclash.api.service;

import com.fanclash.api.entity.*;
import com.fanclash.api.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * Inner service whose methods run in REQUIRES_NEW transactions.
 * Isolates constraint violations so they don't poison the outer transaction.
 */
@Service
@RequiredArgsConstructor
public class FavouriteInnerService {

    private final ContestantFavouriteRepository      favouriteRepository;
    private final ContestantFavouriteCountRepository countRepository;

    /**
     * Attempts to insert a favourite row.
     * Returns true if inserted (new click), false if the idempotency key already existed.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public boolean tryInsertFavourite(ContestantFavourite fav) {
        try {
            favouriteRepository.saveAndFlush(fav);
            return true;
        } catch (DataIntegrityViolationException e) {
            return false;
        }
    }

    /**
     * Atomically increments the pre-seeded aggregate counter via a single UPDATE.
     * V11 migration ensures every contestant has a row, so UPDATE always matches.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void incrementCount(Long seasonId, Long contestantId) {
        countRepository.atomicIncrement(seasonId, contestantId);
    }
}
