package br.com.powercards.model;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "anki_models")
public class AnkiModel extends PanacheEntityBase {

    @Id
    public Long id;

    public String name;

    @Column(columnDefinition = "TEXT")
    public String css;

    @OneToMany(mappedBy = "model", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    public List<AnkiField> fields = new ArrayList<>();

    @OneToMany(mappedBy = "model", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    public List<AnkiTemplate> templates = new ArrayList<>();

    public AnkiModel() {
    }

    public AnkiModel(Long id, String name, String css) {
        this.id = id;
        this.name = name;
        this.css = css;
    }
}
