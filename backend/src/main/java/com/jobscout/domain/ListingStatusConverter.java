package com.jobscout.domain;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter(autoApply = true)
public class ListingStatusConverter implements AttributeConverter<ListingStatus, String> {

    @Override
    public String convertToDatabaseColumn(ListingStatus attribute) {
        return attribute == null ? null : attribute.name().toLowerCase();
    }

    @Override
    public ListingStatus convertToEntityAttribute(String dbData) {
        return dbData == null ? null : ListingStatus.valueOf(dbData.toUpperCase());
    }
}
