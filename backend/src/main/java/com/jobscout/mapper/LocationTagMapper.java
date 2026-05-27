package com.jobscout.mapper;

import com.jobscout.api.generated.model.LocationTag;

public final class LocationTagMapper {
    private LocationTagMapper() {}

    public static LocationTag toDto(com.jobscout.domain.LocationTag entity) {
        LocationTag dto = new LocationTag(entity.getId(), entity.getName());
        dto.setCountryCode(entity.getCountryCode());
        dto.setRegionCode(entity.getRegionCode());
        dto.setCity(entity.getCity());
        dto.setGeoKey(entity.getGeoKey());
        return dto;
    }
}
