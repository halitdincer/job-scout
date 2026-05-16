import { describe, expect, it } from "vitest";

import { formatDateTime, joinValues, mapJobRow } from "./formatters";

describe("job formatters", () => {
  it("formats dates in a stable UTC shape", () => {
    expect(formatDateTime("2025-01-02T03:04:00Z")).toBe("Jan 02, 2025 03:04");
    expect(formatDateTime(null)).toBe("");
  });

  it("joins array values", () => {
    expect(joinValues(["CA", "US"])).toBe("CA, US");
    expect(joinValues(null)).toBe("");
  });

  it("maps API rows into grid rows", () => {
    const row = mapJobRow({
      id: 1,
      source_id: 2,
      source_name: "Source",
      external_id: "ext-1",
      title: "Listing",
      department: null,
      locations: [
        {
          name: "Toronto",
          country_code: "CA",
          region_code: "ON",
          city: "Toronto",
          geo_key: "ON-Toronto",
        },
      ],
      url: "https://example.com",
      status: "active",
      team: null,
      employment_type: "full_time",
      workplace_type: "remote",
      country: ["CA"],
      region: ["ON"],
      city: ["Toronto"],
      expired_at: null,
      published_at: null,
      updated_at_source: null,
      first_seen_at: "2025-01-01T00:00:00Z",
      last_seen_at: "2025-01-02T00:00:00Z",
      seen: false,
    });

    expect(row.department).toBe("");
    expect(row.team).toBe("");
    expect(row.locations_display).toBe("Toronto");
    expect(row.employment_type_label).toBe("Full-time");
    expect(row.workplace_type_label).toBe("Remote");

    const unmapped = mapJobRow({
      ...row,
      department: null,
      team: null,
      locations: [],
      employment_type: null,
      workplace_type: null,
    });
    expect(unmapped.locations_display).toBe("");
    expect(unmapped.employment_type_label).toBe("");
    expect(unmapped.workplace_type_label).toBe("");
  });
});
