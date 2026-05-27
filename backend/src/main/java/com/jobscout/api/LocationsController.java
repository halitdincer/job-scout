package com.jobscout.api;

import com.jobscout.api.generated.api.LocationsApi;
import com.jobscout.api.generated.model.LocationTag;
import com.jobscout.mapper.LocationTagMapper;
import com.jobscout.repository.LocationTagRepository;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
class LocationsController implements LocationsApi {

    private final LocationTagRepository repo;

    LocationsController(LocationTagRepository repo) { this.repo = repo; }

    @Override
    public ResponseEntity<List<LocationTag>> listLocations() {
        List<LocationTag> body = repo.findAll().stream()
            .map(LocationTagMapper::toDto)
            .toList();
        return ResponseEntity.ok(body);
    }
}
