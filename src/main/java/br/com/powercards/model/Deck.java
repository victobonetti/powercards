package br.com.powercards.model;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "decks")
public class Deck extends PanacheEntityBase {

    @Id
    public Long id;

    public String name;

    public Deck() {
    }

    public Deck(Long id, String name) {
        this.id = id;
        this.name = name;
    }
}
