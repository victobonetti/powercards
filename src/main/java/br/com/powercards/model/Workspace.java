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

    public Workspace() {
    }

    public Workspace(String name) {
        this.name = name;
    }
}
