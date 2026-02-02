package br.com.powercards.model;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;
import org.hibernate.annotations.Filter;

@Entity
@Table(name = "notes")
@Filter(name = "workspaceFilter", condition = "workspace_id = :workspaceId")
public class Note extends PanacheEntityBase {

    @ManyToOne(optional = false)
    @JoinColumn(name = "workspace_id")
    public Workspace workspace;

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "notes_seq")
    @SequenceGenerator(name = "notes_seq", sequenceName = "notes_seq", allocationSize = 1)
    public Long id;

    public String guid;

    @ManyToOne
    @JoinColumn(name = "mid")
    public AnkiModel model;

    public Long mod;

    public Integer usn;

    public String tags;

    @Column(columnDefinition = "TEXT")
    public String flds;

    public String sfld;

    public Long csum;

    public Integer flags;

    @Column(columnDefinition = "TEXT")
    public String data;

    @OneToMany(mappedBy = "note", cascade = CascadeType.ALL, orphanRemoval = true)
    public java.util.List<Card> cards = new java.util.ArrayList<>();

    public Note() {
    }
}
