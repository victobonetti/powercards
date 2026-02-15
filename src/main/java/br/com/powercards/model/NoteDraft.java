package br.com.powercards.model;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "note_drafts")
public class NoteDraft extends PanacheEntityBase {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "note_drafts_seq")
    @SequenceGenerator(name = "note_drafts_seq", sequenceName = "note_drafts_seq", allocationSize = 1)
    public Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "note_id", unique = true, nullable = false)
    public Note note;

    @Column(columnDefinition = "TEXT")
    public String flds;

    public String tags;

    public Instant updatedAt;

    public NoteDraft() {
        this.updatedAt = Instant.now();
    }

    @PreUpdate
    @PrePersist
    public void updateTimestamp() {
        this.updatedAt = Instant.now();
    }
}
