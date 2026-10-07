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

    public List<ShowDto> getAllShows() {
        return showRepository.findAllByOrderByCreatedAtDesc()
                .stream()
                .map(this::toDto)
                .toList();
    }

    public ShowDto getShowBySlug(String slug) {
        Show show = showRepository.findBySlug(slug)
                .orElseThrow(() -> new ResourceNotFoundException("Show not found: " + slug));
        return toDto(show);
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

    private ShowDto toDto(Show show) {
        return new ShowDto(
                show.getId(),
                show.getName(),
                show.getSlug(),
                show.getCategory(),
                show.getDescription(),
                show.getStatus(),
                show.getImageUrl(),
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
                season.getStartDate(),
                season.getEndDate(),
                season.getCreatedAt(),
                season.getUpdatedAt()
        );
    }

    private ContestantDto toContestantDto(Contestant c) {
        return new ContestantDto(
                c.getId(),
                c.getSeason().getId(),
                c.getName(),
                c.getSlug(),
                c.getProfileImage(),
                c.getBio(),
                c.getStatus(),
                c.getCreatedAt(),
                c.getUpdatedAt()
        );
    }
}
