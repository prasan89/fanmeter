package com.fanclash.api.sentiment;

import com.fanclash.api.sentiment.adapter.SentimentSourceAdapter.CandidateObservation;
import com.fanclash.api.sentiment.adapter.SentimentSourceAdapter.FetchResult;
import com.fanclash.api.sentiment.adapter.TamilGlitzSentimentAdapter;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class TamilGlitzSentimentAdapterTest {

    private TamilGlitzSentimentAdapter adapter;

    // Minimal fixture that mirrors the actual polls.polldaddy.com/vote-js.php response
    private static final String FIXTURE_RESPONSE = """
        PD_button11073604.className='pds-vote-button';
        document.getElementById('PDI_container11073604').innerHTML=
        '<ul class="pds-answer" id="pds-results">
          <li class="pds-feedback-group">
            <label class="pds-feedback-label">
              <span class="pds-answer-text" title="TTF Vasan"> TTF Vasan </span>
              <span class="pds-feedback-result">
                <span class="pds-feedback-per">&nbsp;68.54%</span>
                <span class="pds-feedback-votes">&nbsp; (324,480 votes)</span>
              </span>
            </label>
            <div class="pds-answer-feedback">
              <div class="pds-answer-feedback-bar" style="width:68.54%"></div>
            </div>
          </li>
          <li class="pds-feedback-group">
            <label class="pds-feedback-label">
              <span class="pds-answer-text" title="Shathika"> Shathika </span>
              <span class="pds-feedback-result">
                <span class="pds-feedback-per">&nbsp;7.82%</span>
                <span class="pds-feedback-votes">&nbsp; (37,028 votes)</span>
              </span>
            </label>
          </li>
          <li class="pds-feedback-group">
            <label class="pds-feedback-label">
              <span class="pds-answer-text" title="Mukesh"> Mukesh </span>
              <span class="pds-feedback-result">
                <span class="pds-feedback-per">&nbsp;4.65%</span>
                <span class="pds-feedback-votes">&nbsp; (22,036 votes)</span>
              </span>
            </label>
          </li>
        </ul>
        <div class="pds-total-votes">Total Votes: <span>473,447</span></div>';
        """;

    private static final String FIXTURE_NO_DATA = """
        PD_button11073604.className='pds-vote-button';
        document.getElementById('PDI_container11073604').innerHTML='<div>Loading...</div>';
        """;

    @BeforeEach
    void setUp() {
        adapter = new TamilGlitzSentimentAdapter();
    }

    @Test
    @DisplayName("sourceKey returns tamilglitz")
    void sourceKey() {
        assertThat(adapter.getSourceKey()).isEqualTo("tamilglitz");
    }

    @Test
    @DisplayName("buildPollUrl returns Polldaddy endpoint for Tamil")
    void buildPollUrlTamil() {
        String url = adapter.buildPollUrl("bigg-boss-tamil", "season-10");
        assertThat(url).contains("polls.polldaddy.com").contains("11073604");
    }

    @Test
    @DisplayName("buildPollUrl returns Polldaddy endpoint for Telugu")
    void buildPollUrlTelugu() {
        String url = adapter.buildPollUrl("bigg-boss-telugu", "season-10");
        assertThat(url).contains("polls.polldaddy.com").contains("10967724");
    }

    @Test
    @DisplayName("buildPollUrl returns null for shows without a poll")
    void buildPollUrlUnknownShow() {
        assertThat(adapter.buildPollUrl("bigg-boss-hindi", "season-20")).isNull();
        assertThat(adapter.buildPollUrl("bigg-boss-bangla", "season-3")).isNull();
    }

    @Test
    @DisplayName("parseResponse: extracts contestant names, vote counts, and percentages")
    void parseResponseExtractsData() {
        FetchResult result = adapter.parseResponse("bigg-boss-tamil",
            "https://polls.polldaddy.com/vote-js.php?p=11073604", FIXTURE_RESPONSE);

        assertThat(result.success()).isTrue();
        assertThat(result.observations()).hasSize(3);
        assertThat(result.totalVotes()).isEqualTo(473_447L);

        CandidateObservation first = result.observations().get(0);
        assertThat(first.sourceName()).isEqualTo("TTF Vasan");
        assertThat(first.rawCount()).isEqualTo(324_480L);
        assertThat(first.sharePct()).isEqualTo(68.54, offset(0.01));
        assertThat(first.rankPosition()).isEqualTo(1);

        CandidateObservation second = result.observations().get(1);
        assertThat(second.sourceName()).isEqualTo("Shathika");
        assertThat(second.rawCount()).isEqualTo(37_028L);

        CandidateObservation third = result.observations().get(2);
        assertThat(third.sourceName()).isEqualTo("Mukesh");
        assertThat(third.rawCount()).isEqualTo(22_036L);
    }

    @Test
    @DisplayName("parseResponse: rank positions are assigned in order")
    void parseResponseRankOrder() {
        FetchResult result = adapter.parseResponse("bigg-boss-tamil",
            "https://polls.polldaddy.com/vote-js.php?p=11073604", FIXTURE_RESPONSE);

        assertThat(result.observations().get(0).rankPosition()).isEqualTo(1);
        assertThat(result.observations().get(1).rankPosition()).isEqualTo(2);
        assertThat(result.observations().get(2).rankPosition()).isEqualTo(3);
    }

    @Test
    @DisplayName("parseResponse: returns failure when no vote data found")
    void parseResponseNoData() {
        FetchResult result = adapter.parseResponse("bigg-boss-tamil",
            "https://polls.polldaddy.com/vote-js.php?p=11073604", FIXTURE_NO_DATA);

        assertThat(result.success()).isFalse();
        assertThat(result.observations()).isEmpty();
    }

    @Test
    @DisplayName("fetchPoll: returns failure for shows without a configured poll")
    void fetchPollUnknownShow() {
        FetchResult result = adapter.fetchPoll("bigg-boss-malayalam", null);
        assertThat(result.success()).isFalse();
        assertThat(result.errorMessage()).contains("no poll configured");
    }

    private static org.assertj.core.data.Offset<Double> offset(double d) {
        return org.assertj.core.data.Offset.offset(d);
    }
}
