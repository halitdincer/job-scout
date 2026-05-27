package com.jobscout.mapper;

import com.jobscout.api.generated.model.Source;
import com.jobscout.api.generated.model.SourcePlatform;

public final class SourceMapper {
    private SourceMapper() {}

    public static Source toDto(com.jobscout.domain.Source entity) {
        return new Source(
            entity.getId(),
            entity.getName(),
            SourcePlatform.valueOf(entity.getPlatform().name()),
            entity.getBoardId(),
            entity.isActive()
        );
    }
}
