package com.dreampath.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "user_profiles")
public class UserProfile {

    @Id
    @Column(name = "id")
    private String id; // supabase auth uid (uuid)

    @Column(name = "full_name")
    private String fullName;

    @Column(name = "updated_at")
    private String updatedAt;
}
