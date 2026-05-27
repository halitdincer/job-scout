package com.jobscout.service;

import com.jobscout.api.generated.model.FacetBucket;
import com.jobscout.domain.JobListing;
import jakarta.persistence.EntityManager;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;

@Service
public class JobFacetsService {

    private final EntityManager em;

    public JobFacetsService(EntityManager em) {
        this.em = em;
    }

    public Map<String, List<FacetBucket>> compute(
        List<String> requestedFields,
        Specification<JobListing> filter
    ) {
        Map<String, List<FacetBucket>> out = new LinkedHashMap<>();
        for (String field : requestedFields) {
            out.put(field, aggregate(field, filter));
        }
        return out;
    }

    private List<FacetBucket> aggregate(String field, Specification<JobListing> filter) {
        CriteriaBuilder cb = em.getCriteriaBuilder();
        CriteriaQuery<Object[]> q = cb.createQuery(Object[].class);
        Root<JobListing> root = q.from(JobListing.class);

        Expression<String> grouping = switch (field) {
            case "source_name" -> root.get("source").get("name");
            case "status" -> root.get("status").as(String.class);
            case "country" -> root.join("locations", JoinType.LEFT).get("countryCode");
            case "region" -> root.join("locations", JoinType.LEFT).get("regionCode");
            case "city" -> root.join("locations", JoinType.LEFT).get("city");
            default -> throw new IllegalArgumentException("Unknown facet field: " + field);
        };

        q.multiselect(grouping, cb.count(root))
            .groupBy(grouping)
            .orderBy(cb.desc(cb.count(root)));

        if (filter != null) {
            Predicate p = filter.toPredicate(root, q, cb);
            if (p != null) q.where(p);
        }

        List<Object[]> rows = em.createQuery(q).getResultList();
        List<FacetBucket> buckets = new ArrayList<>(rows.size());
        for (Object[] row : rows) {
            Object value = row[0];
            if (value == null) continue;
            buckets.add(new FacetBucket(value.toString(), ((Number) row[1]).intValue()));
        }
        return buckets;
    }
}
