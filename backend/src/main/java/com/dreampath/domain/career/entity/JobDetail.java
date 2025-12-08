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
@Table(name = "job_details")
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class JobDetail {

    @Id
    @Column(name = "job_id")
    private Long jobId;

    @Column(columnDefinition = "TEXT")
    private String summary;

    @Column(name = "wage_text", columnDefinition = "TEXT")
    private String wageText;

    @Column(name = "wage_source", columnDefinition = "TEXT")
    private String wageSource;

    @Column(name = "aptitude_text", columnDefinition = "TEXT")
    private String aptitudeText;

    @Column(name = "abilities", columnDefinition = "TEXT")
    private String abilities;

    @Column(name = "majors", columnDefinition = "TEXT")
    private String majors;

    @Column(name = "certifications", columnDefinition = "TEXT")
    private String certifications;

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
