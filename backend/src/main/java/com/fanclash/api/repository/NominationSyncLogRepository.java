package com.fanclash.api.repository;

import com.fanclash.api.entity.NominationSyncLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface NominationSyncLogRepository extends JpaRepository<NominationSyncLog, Long> {

    List<NominationSyncLog> findTop20ByOrderByStartedAtDesc();

    List<NominationSyncLog> findTop10ByShowSlugOrderByStartedAtDesc(String showSlug);
}
