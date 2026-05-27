package com.jobscout.repository;

import com.jobscout.domain.SavedView;
import com.jobscout.domain.User;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SavedViewRepository extends JpaRepository<SavedView, Long> {
    List<SavedView> findByUserOrderByName(User user);
    Optional<SavedView> findByIdAndUser(Long id, User user);
}
