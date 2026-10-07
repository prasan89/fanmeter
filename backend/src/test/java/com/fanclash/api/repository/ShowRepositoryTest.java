package com.fanclash.api.repository;

import com.fanclash.api.entity.Show;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.context.ActiveProfiles;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@ActiveProfiles("test")
class ShowRepositoryTest {

    @Autowired
    private ShowRepository showRepository;

    @Test
    void findBySlugReturnsShow() {
        Optional<Show> show = showRepository.findBySlug("bigg-boss-tamil");
        assertThat(show).isPresent();
        assertThat(show.get().getName()).isEqualTo("Bigg Boss Tamil");
    }

    @Test
    void findByStatusReturnsLiveShows() {
        List<Show> liveShows = showRepository.findByStatus("live");
        assertThat(liveShows).isNotEmpty();
        assertThat(liveShows).allMatch(s -> "live".equals(s.getStatus()));
    }

    @Test
    void findAllByOrderByCreatedAtDescReturnsAll() {
        List<Show> shows = showRepository.findAllByOrderByCreatedAtDesc();
        assertThat(shows).hasSizeGreaterThanOrEqualTo(4);
    }
}
