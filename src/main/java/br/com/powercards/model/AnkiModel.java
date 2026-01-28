package br.com.powercards.model;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "anki_models")
public class AnkiModel extends PanacheEntityBase {

    @Id
    public Long id;

    public String name;

    @Column(columnDefinition = "TEXT")
    public String css;

    public AnkiModel() {
    }

    public AnkiModel(Long id, String name, String css) {
        this.id = id;
        this.name = name;
        this.css = css;
    }
}
