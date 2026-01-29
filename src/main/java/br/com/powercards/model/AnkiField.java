package br.com.powercards.model;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;

@Entity
@Table(name = "anki_fields")
public class AnkiField extends PanacheEntityBase {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "anki_fields_seq")
    @SequenceGenerator(name = "anki_fields_seq", sequenceName = "anki_fields_seq", allocationSize = 1)
    public Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "model_id")
    @com.fasterxml.jackson.annotation.JsonIgnore
    public AnkiModel model;

    public String name;

    public Integer ord;

    public AnkiField() {
    }

    public AnkiField(String name, Integer ord, AnkiModel model) {
        this.name = name;
        this.ord = ord;
        this.model = model;
    }
}
