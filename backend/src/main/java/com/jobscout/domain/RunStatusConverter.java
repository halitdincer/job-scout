package com.jobscout.domain;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter(autoApply = true)
public class RunStatusConverter implements AttributeConverter<RunStatus, String> {

    @Override
    public String convertToDatabaseColumn(RunStatus attribute) {
        return attribute == null ? null : attribute.name().toLowerCase();
    }

    @Override
    public RunStatus convertToEntityAttribute(String dbData) {
        return dbData == null ? null : RunStatus.valueOf(dbData.toUpperCase());
    }
}
