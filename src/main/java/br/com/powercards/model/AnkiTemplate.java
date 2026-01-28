package br.com.powercards.model;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;

@Entity
@Table(name = "anki_templates")
public class AnkiTemplate extends PanacheEntityBase {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "model_id")
    @com.fasterxml.jackson.annotation.JsonIgnore
    public AnkiModel model;

    public String name;

    @Column(columnDefinition = "TEXT")
    public String qfmt;

    @Column(columnDefinition = "TEXT")
    public String afmt;

    public Integer ord;

    public AnkiTemplate() {
    }

    public AnkiTemplate(String name, String qfmt, String afmt, Integer ord, AnkiModel model) {
        this.name = name;
        this.qfmt = qfmt;
        this.afmt = afmt;
        this.ord = ord;
        this.model = model;
    }
}
