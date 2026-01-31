package br.com.powercards.model;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;

@Entity
@Table(name = "tags")
public class Tag extends PanacheEntityBase {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "tags_seq")
    @SequenceGenerator(name = "tags_seq", sequenceName = "tags_seq", allocationSize = 1)
    public Long id;

    @Column(unique = true, nullable = false)
    public String name;

    public Tag() {
    }

    public Tag(String name) {
        this.name = name;
    }
}
