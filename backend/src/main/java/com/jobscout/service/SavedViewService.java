package com.jobscout.service;

import com.jobscout.api.generated.model.SavedViewCreateRequest;
import com.jobscout.domain.SavedView;
import com.jobscout.domain.User;
import com.jobscout.mapper.SavedViewMapper;
import com.jobscout.repository.SavedViewRepository;
import com.jobscout.security.CurrentUserService;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional
public class SavedViewService {

    private final SavedViewRepository repo;
    private final SavedViewMapper mapper;
    private final CurrentUserService currentUser;

    public SavedViewService(SavedViewRepository repo,
                            SavedViewMapper mapper,
                            CurrentUserService currentUser) {
        this.repo = repo;
        this.mapper = mapper;
        this.currentUser = currentUser;
    }

    public List<SavedView> listForCurrentUser() {
        return repo.findByUserOrderByName(currentUser.current());
    }

    public SavedView create(SavedViewCreateRequest req) {
        validateRequest(req);
        User user = currentUser.current();
        SavedView entity = new SavedView();
        entity.setUser(user);
        mapper.applyRequest(entity, req);
        return repo.save(entity);
    }

    public SavedView get(Long id) {
        return repo.findByIdAndUser(id, currentUser.current())
            .orElseThrow(() -> new ResponseStatusException(
                org.springframework.http.HttpStatus.NOT_FOUND, "Saved view not found"));
    }

    public SavedView update(Long id, SavedViewCreateRequest req) {
        validateRequest(req);
        SavedView entity = get(id);
        mapper.applyRequest(entity, req);
        return repo.save(entity);
    }

    public void delete(Long id) {
        SavedView entity = get(id);
        repo.delete(entity);
    }

    private void validateRequest(SavedViewCreateRequest req) {
        if (req.getName() == null || req.getName().isBlank()) {
            throw new ResponseStatusException(
                org.springframework.http.HttpStatus.UNPROCESSABLE_ENTITY,
                "name is required");
        }
        if (req.getColumns() == null || req.getColumns().isEmpty()) {
            throw new ResponseStatusException(
                org.springframework.http.HttpStatus.UNPROCESSABLE_ENTITY,
                "columns must be a non-empty list");
        }
    }
}
