package com.jobscout.filter;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.jobscout.domain.JobListing;
import org.junit.jupiter.api.Test;
import org.springframework.data.jpa.domain.Specification;

/**
 * Parser-level tests. SQL correctness will be exercised end-to-end in Step 5
 * when the controller wires this to a real entity manager.
 */
class FilterExpressionEvaluatorTest {

    private final FilterExpressionEvaluator eval =
        new FilterExpressionEvaluator(new ObjectMapper());

    @Test
    void nullOrBlankFilterProducesNullSpec() {
        assertThat(eval.toSpecification(null)).isNull();
        assertThat(eval.toSpecification("")).isNull();
        assertThat(eval.toSpecification("   ")).isNull();
    }

    @Test
    void leafPredicateBuildsSpecificationWithoutError() {
        Specification<JobListing> spec = eval.toSpecification(
            "{\"field\":\"title\",\"op\":\"contains\",\"value\":\"engineer\"}");
        assertThat(spec).isNotNull();
    }

    @Test
    void nestedAndOrNotBuildsSpecificationWithoutError() {
        Specification<JobListing> spec = eval.toSpecification("""
            {
              "and": [
                { "field": "status", "op": "eq", "value": "ACTIVE" },
                { "or": [
                  { "field": "title", "op": "contains", "value": "engineer" },
                  { "not": { "field": "source_name", "op": "eq", "value": "Acme" } }
                ]},
                { "field": "published_at", "op": "in_last_days", "value": 7 }
              ]
            }
            """);
        assertThat(spec).isNotNull();
    }

    @Test
    void malformedJsonThrowsInvalidFilter() {
        assertThatThrownBy(() -> eval.toSpecification("{this is not json"))
            .isInstanceOf(FilterExpressionEvaluator.InvalidFilterException.class)
            .hasMessageContaining("Malformed");
    }

    @Test
    void allFilterableFieldsProduceSpecs() {
        for (String field : new String[]{
            "title", "source_name", "status",
            "location", "country", "region", "city",
            "published_at", "first_seen_at", "last_seen_at"
        }) {
            String op = field.equals("status")          ? "eq"
                      : field.endsWith("_at")           ? "is_not_empty"
                      :                                   "contains";
            String value = field.equals("status")       ? "\"ACTIVE\""
                         : op.equals("is_not_empty")    ? "null"
                         :                                "\"x\"";
            String json = "{\"field\":\"%s\",\"op\":\"%s\",\"value\":%s}"
                .formatted(field, op, value);
            assertThat(eval.toSpecification(json))
                .as("field=%s op=%s", field, op)
                .isNotNull();
        }
    }
}
