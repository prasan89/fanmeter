package com.fanclash.api.chat.repository;

import com.fanclash.api.chat.entity.ChatModQueueItem;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface ChatModQueueRepository extends JpaRepository<ChatModQueueItem, Long> {

    @Query("SELECT q FROM ChatModQueueItem q WHERE q.status != 'RESOLVED' ORDER BY q.severity DESC, q.createdAt ASC")
    List<ChatModQueueItem> findPending(Pageable pageable);
}
