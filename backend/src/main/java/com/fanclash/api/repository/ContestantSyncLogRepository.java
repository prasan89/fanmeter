package com.fanclash.api.repository;

import com.fanclash.api.entity.ContestantSyncLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ContestantSyncLogRepository extends JpaRepository<ContestantSyncLog, Long> {
    List<ContestantSyncLog> findTop10ByOrderByStartedAtDesc();
    ContestantSyncLog findFirstByOrderByStartedAtDesc();
}
