package com.jobscout.api;

import com.jobscout.api.generated.api.SourcesApi;
import com.jobscout.api.generated.model.Source;
import com.jobscout.mapper.SourceMapper;
import com.jobscout.repository.SourceRepository;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
class SourcesController implements SourcesApi {

    private final SourceRepository repo;

    SourcesController(SourceRepository repo) { this.repo = repo; }

    @Override
    public ResponseEntity<List<Source>> listSources() {
        List<Source> body = repo.findAll().stream().map(SourceMapper::toDto).toList();
        return ResponseEntity.ok(body);
    }
}
