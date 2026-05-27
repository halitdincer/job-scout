package com.jobscout.mapper;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.jobscout.api.generated.model.ColumnDef;
import com.jobscout.api.generated.model.SavedView;
import com.jobscout.api.generated.model.SavedViewCreateRequest;
import com.jobscout.api.generated.model.SortSpec;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Component;

@Component
public class SavedViewMapper {

    private static final TypeReference<List<Map<String, Object>>> LIST_OF_MAPS =
        new TypeReference<>() {};
    private static final TypeReference<Map<String, Object>> MAP_TYPE =
        new TypeReference<>() {};

    private final ObjectMapper mapper;

    public SavedViewMapper(ObjectMapper mapper) {
        this.mapper = mapper;
    }

    public SavedView toDto(com.jobscout.domain.SavedView entity) {
        SavedView dto = new SavedView(
            entity.getId(),
            entity.getName(),
            entity.getColumns().stream()
                .map(m -> mapper.convertValue(m, ColumnDef.class)).toList(),
            entity.getSort().stream()
                .map(m -> mapper.convertValue(m, SortSpec.class)).toList(),
            Times.toOffset(entity.getCreatedAt()),
            Times.toOffset(entity.getUpdatedAt())
        );
        Map<String, Object> config = entity.getConfig();
        if (config != null) dto.setConfig(new HashMap<>(config));
        // filterExpression on the DTO is the typed FilterExpression oneOf;
        // we store as a raw map and let the frontend reinterpret. Bypass the
        // typed setter and serialize directly via Jackson if/when needed.
        return dto;
    }

    public void applyRequest(com.jobscout.domain.SavedView entity, SavedViewCreateRequest req) {
        entity.setName(req.getName());
        entity.setColumns(toListOfMaps(req.getColumns()));
        entity.setSort(toListOfMaps(req.getSort()));
        entity.setConfig(req.getConfig() != null
            ? new HashMap<>(req.getConfig())
            : new HashMap<>());
        entity.setFilterExpression(req.getFilterExpression() == null
            ? null
            : mapper.convertValue(req.getFilterExpression(), MAP_TYPE));
    }

    private List<Map<String, Object>> toListOfMaps(Object list) {
        if (list == null) return new ArrayList<>();
        return mapper.convertValue(list, LIST_OF_MAPS);
    }
}
