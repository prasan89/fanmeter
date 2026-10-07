package com.fanclash.api.service;

import com.fanclash.api.dto.*;
import com.fanclash.api.entity.*;
import com.fanclash.api.exception.ResourceNotFoundException;
import com.fanclash.api.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ShowService {

    private final ShowRepository showRepository;
    private final SeasonRepository seasonRepository;
    private final ContestantRepository contestantRepository;
    private final EpisodeRepository episodeRepository;

    public List<ShowDto> getAllShows() {
        return showRepository.findAllByOrderByCreatedAtDesc()
                .stream()
                .map(this::toShowDto)
                .toList();
    }

    public List<ShowDto> getShowsByFilters(String category, String language, String status) {
        return showRepository.findByFilters(category, language, status)
                .stream()
                .map(this::toShowDto)
                .toList();
    }

    public SearchResultDto search(String q) {
        if (q == null || q.isBlank() || q.length() < 2) {
            return new SearchResultDto(List.of(), List.of(), 0);
        }
        String trimmed = q.trim();
        List<ShowDto> shows = showRepository.searchByQuery(trimmed)
                .stream()
                .limit(10)
                .map(this::toShowDto)
                .toList();
        List<ContestantDto> contestants = contestantRepository.searchByQuery(trimmed)
                .stream()
                .limit(10)
                .map(this::toContestantDto)
                .toList();
        return new SearchResultDto(shows, contestants, shows.size() + contestants.size());
    }

    public ShowDto getShowBySlug(String slug) {
        Show show = showRepository.findBySlug(slug)
                .orElseThrow(() -> new ResourceNotFoundException("Show not found: " + slug));
        return toShowDto(show);
    }

    public List<SeasonDto> getSeasonsByShowSlug(String slug) {
        Show show = showRepository.findBySlug(slug)
                .orElseThrow(() -> new ResourceNotFoundException("Show not found: " + slug));
        return seasonRepository.findByShowIdOrderBySeasonNumberDesc(show.getId())
                .stream()
                .map(s -> toSeasonDto(s, show))
                .toList();
    }

    public SeasonDto getSeasonById(Long id) {
        Season season = seasonRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Season not found: " + id));
        return toSeasonDto(season, season.getShow());
    }

    public List<ContestantDto> getContestantsBySeasonId(Long seasonId) {
        if (!seasonRepository.existsById(seasonId)) {
            throw new ResourceNotFoundException("Season not found: " + seasonId);
        }
        return contestantRepository.findBySeasonIdOrderByNameAsc(seasonId)
                .stream()
                .map(this::toContestantDto)
                .toList();
    }

    public ContestantDto getContestantBySlug(String slug) {
        Contestant c = contestantRepository.findBySlug(slug)
                .orElseThrow(() -> new ResourceNotFoundException("Contestant not found: " + slug));
        return toContestantDto(c);
    }

    public List<EpisodeDto> getEpisodesBySeasonId(Long seasonId) {
        if (!seasonRepository.existsById(seasonId)) {
            throw new ResourceNotFoundException("Season not found: " + seasonId);
        }
        return episodeRepository.findBySeasonIdOrderByEpisodeNumberDesc(seasonId)
                .stream()
                .map(this::toEpisodeDto)
                .toList();
    }

    public EpisodeDto getEpisodeById(Long id) {
        Episode episode = episodeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Episode not found: " + id));
        return toEpisodeDto(episode);
    }

    private ShowDto toShowDto(Show show) {
        return new ShowDto(
                show.getId(),
                show.getName(),
                show.getSlug(),
                show.getCategory(),
                show.getDescription(),
                show.getStatus(),
                show.getImageUrl(),
                show.getLanguage(),
                show.getCreatedAt(),
                show.getUpdatedAt()
        );
    }

    private SeasonDto toSeasonDto(Season season, Show show) {
        return new SeasonDto(
                season.getId(),
                show.getId(),
                show.getName(),
                show.getSlug(),
                season.getName(),
                season.getSeasonNumber(),
                season.getStatus(),
                season.getDescription(),
                season.getHeroImage(),
                season.getStartDate(),
                season.getEndDate(),
                season.getCreatedAt(),
                season.getUpdatedAt()
        );
    }

    private EpisodeDto toEpisodeDto(Episode e) {
        return new EpisodeDto(
                e.getId(),
                e.getSeason().getId(),
                e.getEpisodeNumber(),
                e.getTitle(),
                e.getDescription(),
                e.getThumbnail(),
                e.getDurationMinutes(),
                e.getAirDate(),
                e.getStatus(),
                e.getCreatedAt(),
                e.getUpdatedAt()
        );
    }

    private ContestantDto toContestantDto(Contestant c) {
        return new ContestantDto(
                c.getId(),
                c.getSeason().getId(),
                c.getName(),
                c.getSlug(),
                c.getProfileImage(),
                c.getCoverImage(),
                c.getBio(),
                c.getStatus(),
                c.getCreatedAt(),
                c.getUpdatedAt()
        );
    }
}
