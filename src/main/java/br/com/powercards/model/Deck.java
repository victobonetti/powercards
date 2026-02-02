package br.com.powercards.model;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;
import org.hibernate.annotations.Filter;

@Entity
@Table(name = "decks")
@Filter(name = "workspaceFilter", condition = "workspace_id = :workspaceId")
public class Deck extends PanacheEntityBase {

    @ManyToOne(optional = false)
    @JoinColumn(name = "workspace_id")
    public Workspace workspace;

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "decks_seq")
    @SequenceGenerator(name = "decks_seq", sequenceName = "decks_seq", allocationSize = 1)
    public Long id;

    public String name;

    @OneToMany(mappedBy = "deck", cascade = CascadeType.ALL, orphanRemoval = true)
    public java.util.List<Card> cards = new java.util.ArrayList<>();

    public Deck() {
    }

    public Deck(Long id, String name) {
        this.id = id;
        this.name = name;
    }
}
