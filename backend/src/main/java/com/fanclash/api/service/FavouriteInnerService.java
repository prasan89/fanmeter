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
     * Atomically inserts the favourite row AND increments the counter in one REQUIRES_NEW
     * transaction. Returns true if a new row was inserted (count incremented), false if the
     * idempotency key already existed (idempotent retry — no double-count).
     *
     * Using a single transaction eliminates the atomicity gap that existed when insert and
     * increment ran in separate REQUIRES_NEW transactions.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public boolean tryInsertAndIncrement(ContestantFavourite fav) {
        try {
            favouriteRepository.saveAndFlush(fav);
            countRepository.atomicIncrement(fav.getSeason().getId(), fav.getContestant().getId());
            return true;
        } catch (DataIntegrityViolationException e) {
            return false;
        }
    }
}
