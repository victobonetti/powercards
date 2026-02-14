package br.com.powercards.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.*;
import java.util.List;

@Entity
@Table(name = "users")
public class User extends PanacheEntity {

    @Column(name = "keycloak_id", unique = true, nullable = false)
    public String keycloakId;

    @Column(name = "display_name")
    public String displayName;

    @Column(name = "avatar_url")
    public String avatarUrl;

    @Column(name = "banner_url")
    public String bannerUrl;

    @Column(name = "description", columnDefinition = "TEXT")
    public String description;

    @Column(name = "color_palette", columnDefinition = "varchar(255) default 'tangerine'")
    public String colorPalette = "tangerine";

    @Column(name = "dark_mode")
    public Boolean darkMode;

    @Column(name = "ai_provider")
    public String aiProvider; // "openai", "gemini", "deepseek", or null

    @OneToMany(mappedBy = "user", fetch = FetchType.LAZY)
    @JsonIgnore
    public List<Workspace> workspaces;

    public User() {
    }

    public User(String keycloakId) {
        this.keycloakId = keycloakId;
    }

    public User(String keycloakId, String displayName) {
        this.keycloakId = keycloakId;
        this.displayName = displayName;
    }

    public static User findByKeycloakId(String keycloakId) {
        return find("keycloakId", keycloakId).firstResult();
    }

    public static User findOrCreate(String keycloakId) {
        User user = findByKeycloakId(keycloakId);
        if (user == null) {
            user = new User(keycloakId);
            user.persist();
        }
        return user;
    }
}
