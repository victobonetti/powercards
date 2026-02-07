package br.com.powercards.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.*;
import org.hibernate.annotations.FilterDef;
import org.hibernate.annotations.ParamDef;

@Entity
@Table(name = "workspaces")
@FilterDef(name = "workspaceFilter", parameters = @ParamDef(name = "workspaceId", type = Long.class))
public class Workspace extends PanacheEntity {

    public String name;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    @JsonIgnore
    public User user;

    public Workspace() {
    }

    public Workspace(String name) {
        this.name = name;
    }

    public Workspace(String name, User user) {
        this.name = name;
        this.user = user;
    }

    // Helper method to get userId string for backward compatibility
    @JsonIgnore
    public String getUserId() {
        return user != null ? user.keycloakId : null;
    }
}
