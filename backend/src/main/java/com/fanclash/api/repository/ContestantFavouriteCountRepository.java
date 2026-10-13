package com.fanclash.api.repository;

import com.fanclash.api.entity.ContestantFavouriteCount;
import com.fanclash.api.entity.ContestantFavouriteCountId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ContestantFavouriteCountRepository
        extends JpaRepository<ContestantFavouriteCount, ContestantFavouriteCountId> {

    List<ContestantFavouriteCount> findBySeasonId(Long seasonId);

    /**
     * Atomic increment via JPQL UPDATE … + 1.
     * V11 migration pre-seeds a row for every contestant, so this always matches.
     * Single SQL statement → no read-modify-write, no lost updates under concurrent load.
     */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE ContestantFavouriteCount c SET c.total = c.total + 1, c.updatedAt = CURRENT_TIMESTAMP " +
           "WHERE c.seasonId = :seasonId AND c.contestantId = :contestantId")
    int atomicIncrement(@Param("seasonId") Long seasonId,
                        @Param("contestantId") Long contestantId);

    @Query(value = "SELECT total FROM contestant_favourite_counts " +
                   "WHERE season_id = :seasonId AND contestant_id = :contestantId",
           nativeQuery = true)
    Long findTotalNative(@Param("seasonId") Long seasonId,
                         @Param("contestantId") Long contestantId);
}
