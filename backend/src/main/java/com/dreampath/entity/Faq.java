package com.dreampath.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDateTime;

@Getter
@Setter
@Entity
@Table(name = "faq")
public class Faq {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(columnDefinition = "text", nullable = false)
    private String question;

    @Column(columnDefinition = "text", nullable = false)
    private String answer;

    @Column(length = 100)
    private String category;

    private LocalDateTime updated_at;
}
