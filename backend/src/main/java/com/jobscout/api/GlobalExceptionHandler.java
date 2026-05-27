package com.jobscout.api;

import com.jobscout.api.generated.model.Problem;
import com.jobscout.api.generated.model.ProblemErrorsInner;
import com.jobscout.filter.FilterExpressionEvaluator.InvalidFilterException;
import jakarta.persistence.EntityNotFoundException;
import java.net.URI;
import java.util.ArrayList;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.AuthenticationException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

/**
 * Translates exceptions into RFC 7807 Problem responses described in the
 * OpenAPI spec.
 */
@RestControllerAdvice
class GlobalExceptionHandler {

    @ExceptionHandler(EntityNotFoundException.class)
    ResponseEntity<Problem> notFound(EntityNotFoundException e) {
        return problem(HttpStatus.NOT_FOUND, "Not Found", e.getMessage(), null);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    ResponseEntity<Problem> badRequest(IllegalArgumentException e) {
        return problem(HttpStatus.BAD_REQUEST, "Bad Request", e.getMessage(), null);
    }

    @ExceptionHandler(InvalidFilterException.class)
    ResponseEntity<Problem> badFilter(InvalidFilterException e) {
        return problem(HttpStatus.BAD_REQUEST, "Bad Request", e.getMessage(), null);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<Problem> validation(MethodArgumentNotValidException e) {
        List<ProblemErrorsInner> details = new ArrayList<>();
        e.getBindingResult().getFieldErrors().forEach(fe ->
            details.add(new ProblemErrorsInner(fe.getField(), fe.getDefaultMessage())));
        return problem(HttpStatus.UNPROCESSABLE_ENTITY, "Validation Failed",
            "Request body has invalid fields", details);
    }

    @ExceptionHandler(AuthenticationException.class)
    ResponseEntity<Problem> authentication(AuthenticationException e) {
        return problem(HttpStatus.UNAUTHORIZED, "Unauthorized", e.getMessage(), null);
    }

    @ExceptionHandler(ResponseStatusException.class)
    ResponseEntity<Problem> statusEx(ResponseStatusException e) {
        HttpStatus status = HttpStatus.valueOf(e.getStatusCode().value());
        return problem(status, status.getReasonPhrase(), e.getReason(), null);
    }

    private static ResponseEntity<Problem> problem(
        HttpStatus status, String title, String detail, List<ProblemErrorsInner> errors
    ) {
        Problem p = new Problem(URI.create("about:blank"), title, status.value());
        if (detail != null) p.setDetail(detail);
        if (errors != null && !errors.isEmpty()) p.setErrors(errors);
        return ResponseEntity.status(status)
            .contentType(MediaType.valueOf("application/problem+json"))
            .body(p);
    }
}
