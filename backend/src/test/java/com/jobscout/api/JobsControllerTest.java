package com.jobscout.api;

import static org.assertj.core.api.Assertions.assertThat;

import java.lang.reflect.Method;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.core.annotation.AnnotatedElementUtils;
import org.springframework.transaction.annotation.Transactional;

class JobsControllerTest {

    /**
     * The mapper for /api/v1/jobs walks lazy associations on JobListing
     * (source, locations). With Spring Boot's default open-in-view=false,
     * the JPA session closes when the repository call returns, so the
     * mapping has to happen inside a transactional method or it throws
     * LazyInitializationException at serialization time.
     */
    @Test
    void listJobsIsReadOnlyTransactional() throws NoSuchMethodException {
        Method method = JobsController.class.getDeclaredMethod(
            "listJobs", Integer.class, Integer.class, List.class, String.class);

        Transactional ann = AnnotatedElementUtils.findMergedAnnotation(
            method, Transactional.class);

        assertThat(ann)
            .as("listJobs must declare @Transactional to keep the JPA "
                + "session open through mapping (open-in-view=false)")
            .isNotNull();
        assertThat(ann.readOnly())
            .as("/api/v1/jobs is a read endpoint")
            .isTrue();
    }
}
