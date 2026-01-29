package br.com.powercards.model;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;

@Entity
@Table(name = "cards")
public class Card extends PanacheEntityBase {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "cards_seq")
    @SequenceGenerator(name = "cards_seq", sequenceName = "cards_seq", allocationSize = 1)
    public Long id;

    @ManyToOne
    @JoinColumn(name = "nid")
    @com.fasterxml.jackson.annotation.JsonIgnore
    public Note note;

    @ManyToOne
    @JoinColumn(name = "did")
    @com.fasterxml.jackson.annotation.JsonIgnore
    public Deck deck;

    public Integer ord;

    public Long mod;

    public Integer usn;

    public Integer type;

    public Integer queue;

    public Long due;

    public Integer ivl;

    public Integer factor;

    public Integer reps;

    public Integer lapses;

    @Column(name = "\"left\"")
    public Integer left;

    public Long odue;

    public Long odid;

    public Integer flags;

    @Column(columnDefinition = "TEXT")
    public String data;

    public Card() {
    }
}
