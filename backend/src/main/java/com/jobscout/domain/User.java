package com.jobscout.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "auth_user")
@Getter
@Setter
@NoArgsConstructor
@EqualsAndHashCode(of = "id")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 128)
    private String password;

    @Column(name = "last_login")
    private Instant lastLogin;

    @Column(name = "is_superuser", nullable = false)
    private boolean superuser;

    @Column(nullable = false, unique = true, length = 150)
    private String username;

    @Column(name = "first_name", nullable = false, length = 150)
    private String firstName = "";

    @Column(name = "last_name", nullable = false, length = 150)
    private String lastName = "";

    @Column(name = "email", nullable = false, length = 254)
    private String email = "";

    @Column(name = "is_staff", nullable = false)
    private boolean staff;

    @Column(name = "is_active", nullable = false)
    private boolean active = true;

    @Column(name = "date_joined", nullable = false)
    private Instant dateJoined;
}
