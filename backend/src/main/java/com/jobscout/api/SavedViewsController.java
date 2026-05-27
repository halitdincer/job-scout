package com.jobscout.api;

import com.jobscout.api.generated.api.SavedViewsApi;
import com.jobscout.api.generated.model.SavedView;
import com.jobscout.api.generated.model.SavedViewCreateRequest;
import com.jobscout.mapper.SavedViewMapper;
import com.jobscout.service.SavedViewService;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
class SavedViewsController implements SavedViewsApi {

    private final SavedViewService service;
    private final SavedViewMapper mapper;

    SavedViewsController(SavedViewService service, SavedViewMapper mapper) {
        this.service = service;
        this.mapper = mapper;
    }

    @Override
    public ResponseEntity<List<SavedView>> listSavedViews() {
        List<SavedView> body = service.listForCurrentUser().stream()
            .map(mapper::toDto)
            .toList();
        return ResponseEntity.ok(body);
    }

    @Override
    public ResponseEntity<SavedView> createSavedView(SavedViewCreateRequest req) {
        var created = service.create(req);
        return ResponseEntity
            .created(java.net.URI.create("/api/v1/views/" + created.getId()))
            .body(mapper.toDto(created));
    }

    @Override
    public ResponseEntity<SavedView> getSavedView(Long id) {
        return ResponseEntity.ok(mapper.toDto(service.get(id)));
    }

    @Override
    public ResponseEntity<SavedView> updateSavedView(Long id, SavedViewCreateRequest req) {
        return ResponseEntity.ok(mapper.toDto(service.update(id, req)));
    }

    @Override
    public ResponseEntity<Void> deleteSavedView(Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
