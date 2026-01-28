package br.com.powercards.model;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;

@Entity
@Table(name = "notes")
public class Note extends PanacheEntityBase {

    @Id
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

    public Note() {
    }
}
