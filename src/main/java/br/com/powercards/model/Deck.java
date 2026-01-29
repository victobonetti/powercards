package br.com.powercards.model;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;

@Entity
@Table(name = "decks")
public class Deck extends PanacheEntityBase {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "decks_seq")
    @SequenceGenerator(name = "decks_seq", sequenceName = "decks_seq", allocationSize = 1)
    public Long id;

    public String name;

    public Deck() {
    }

    public Deck(Long id, String name) {
        this.id = id;
        this.name = name;
    }
}
