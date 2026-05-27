package com.jobscout.api;

import com.jobscout.api.generated.api.HealthApi;
import com.jobscout.api.generated.model.HealthStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
public class HealthController implements HealthApi {

    @Override
    public ResponseEntity<HealthStatus> getHealth() {
        HealthStatus body = new HealthStatus(HealthStatus.StatusEnum.OK);
        return ResponseEntity.ok(body);
    }
}
