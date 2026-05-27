package com.jobscout.ingestion;

import java.util.ArrayList;
import java.util.List;

public class IngestionResult {
    public int sourcesProcessed = 0;
    public int listingsCreated = 0;
    public int listingsUpdated = 0;
    public int listingsExpired = 0;
    public final List<String> errors = new ArrayList<>();

    public boolean hasErrors() { return !errors.isEmpty(); }
}
