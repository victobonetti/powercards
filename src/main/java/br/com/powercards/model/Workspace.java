package br.com.powercards.model;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.*;
import org.hibernate.annotations.FilterDef;
import org.hibernate.annotations.ParamDef;

@Entity
@Table(name = "workspaces")
@FilterDef(name = "workspaceFilter", parameters = @ParamDef(name = "workspaceId", type = Long.class))
public class Workspace extends PanacheEntity {

    public String name;

    @Column(name = "user_id")
    public String userId;

    public Workspace() {
    }

    public Workspace(String name) {
        this.name = name;
    }

    public Workspace(String name, String userId) {
        this.name = name;
        this.userId = userId;
    }
}
