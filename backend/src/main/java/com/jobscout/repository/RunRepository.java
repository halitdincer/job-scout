package com.jobscout.repository;

import com.jobscout.domain.Run;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RunRepository extends JpaRepository<Run, Long> {
}
