package com.jobscout.adapter;

import com.jobscout.domain.Platform;
import java.util.List;

/**
 * Pulls active listings from one ATS board.
 * <p>
 * Implementations must be stateless: a single bean is shared across all
 * {@code Source}s of its platform.
 */
public interface Adapter {

    /** Which platform this adapter handles. */
    Platform platform();

    /**
     * Fetch every active listing on the given board.
     * <p>
     * {@code boardId} format is platform-specific (e.g. {@code "stripe"} for
     * Greenhouse, {@code "tmx:wd3:TMX_Careers"} for Workday).
     */
    List<FetchedListing> fetchListings(String boardId);
}
