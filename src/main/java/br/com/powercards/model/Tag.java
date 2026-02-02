package br.com.powercards.model;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;
import org.hibernate.annotations.Filter;

@Entity
@Table(name = "tags", uniqueConstraints = @UniqueConstraint(columnNames = { "name", "workspace_id" }))
@Filter(name = "workspaceFilter", condition = "workspace_id = :workspaceId")
public class Tag extends PanacheEntityBase {

    @ManyToOne(optional = false)
    @JoinColumn(name = "workspace_id")
    public Workspace workspace;

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "tags_seq")
    @SequenceGenerator(name = "tags_seq", sequenceName = "tags_seq", allocationSize = 1)
    public Long id;

    @Column(nullable = false)
    public String name;

    public Tag() {
    }

    public Tag(String name) {
        this.name = name;
    }
}
