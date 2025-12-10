package com.dreampath.domain.career.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;

import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "major_details")
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MajorDetail {

    @Id
    @Column(name = "major_id")
    private Long majorId;

    @Column(name = "major_name")
    private String majorName;

    @Column(columnDefinition = "TEXT")
    private String summary;

    @Column(columnDefinition = "TEXT")
    private String interest;

    @Column(name = "property", columnDefinition = "TEXT")
    private String propertyText;

    @Column(columnDefinition = "TEXT")
    private String job;

    @Column(columnDefinition = "TEXT")
    private String salary;

    @Column(columnDefinition = "TEXT")
    private String employment;

    @Column(name = "raw_data", columnDefinition = "TEXT")
    private String rawData;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    public void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    @PreUpdate
    public void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
