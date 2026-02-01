package br.com.powercards.domain.entities;

import jakarta.persistence.Embeddable;
import java.io.Serializable;
import java.util.Objects;

@Embeddable
public class AnkiMediaId implements Serializable {

    public Long noteId;
    public String originalName;

    public AnkiMediaId() {
    }

    public AnkiMediaId(Long noteId, String originalName) {
        this.noteId = noteId;
        this.originalName = originalName;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o)
            return true;
        if (o == null || getClass() != o.getClass())
            return false;
        AnkiMediaId that = (AnkiMediaId) o;
        return Objects.equals(noteId, that.noteId) && Objects.equals(originalName, that.originalName);
    }

    @Override
    public int hashCode() {
        return Objects.hash(noteId, originalName);
    }
}
