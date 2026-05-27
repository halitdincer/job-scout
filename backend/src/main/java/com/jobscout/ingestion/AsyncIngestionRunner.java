package com.jobscout.ingestion;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

/**
 * Wraps {@link IngestionService#ingestAll(Long)} so the controller can call
 * it asynchronously. Lives in its own bean so the {@code @Async} proxy
 * doesn't interfere with the controller's interface-derived {@code @RequestMapping}s.
 */
@Component
public class AsyncIngestionRunner {

    private static final Logger log = LoggerFactory.getLogger(AsyncIngestionRunner.class);

    private final IngestionService ingestion;

    public AsyncIngestionRunner(IngestionService ingestion) {
        this.ingestion = ingestion;
    }

    @Async
    public void run(Long runId) {
        try {
            ingestion.ingestAll(runId);
        } catch (Exception e) {
            log.error("Async ingestion run {} failed", runId, e);
        }
    }
}
