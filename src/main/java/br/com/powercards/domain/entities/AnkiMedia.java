package br.com.powercards.domain.entities;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;

@Entity
public class AnkiMedia extends PanacheEntityBase {

    @EmbeddedId
    public AnkiMediaId id;

    public String minioUrl;

    public AnkiMedia() {
    }

    public AnkiMedia(Long noteId, String originalName, String minioUrl) {
        this.id = new AnkiMediaId(noteId, originalName);
        this.minioUrl = minioUrl;
    }
}
