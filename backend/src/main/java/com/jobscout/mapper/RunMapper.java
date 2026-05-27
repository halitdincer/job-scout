package com.jobscout.mapper;

import com.jobscout.api.generated.model.Run;
import com.jobscout.api.generated.model.RunPage;
import com.jobscout.api.generated.model.RunStatus;
import java.util.List;
import org.springframework.data.domain.Page;

public final class RunMapper {
    private RunMapper() {}

    public static Run toDto(com.jobscout.domain.Run entity) {
        Run dto = new Run(
            entity.getId(),
            RunStatus.valueOf(entity.getStatus().name()),
            entity.getSourcesProcessed(),
            entity.getListingsCreated(),
            entity.getListingsUpdated(),
            entity.getListingsExpired(),
            Times.toOffset(entity.getCreatedAt())
        );
        dto.setStartedAt(Times.toOffset(entity.getStartedAt()));
        dto.setFinishedAt(Times.toOffset(entity.getFinishedAt()));
        dto.setErrorMessage(entity.getErrorMessage());
        return dto;
    }

    public static RunPage toPage(Page<com.jobscout.domain.Run> page) {
        List<Run> items = page.getContent().stream().map(RunMapper::toDto).toList();
        return new RunPage(
            items, page.getNumber(), page.getSize(),
            (int) page.getTotalElements(), page.hasNext());
    }
}
