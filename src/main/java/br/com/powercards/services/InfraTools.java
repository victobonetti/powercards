package br.com.powercards.services;

import dev.langchain4j.agent.tool.Tool;
import jakarta.enterprise.context.RequestScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import br.com.powercards.security.WorkspaceContext;
import br.com.powercards.model.Deck;
import br.com.powercards.model.Card;
import br.com.powercards.model.Note;
import br.com.powercards.model.AnkiModel;
import br.com.powercards.model.AnkiField;
import br.com.powercards.model.AnkiTemplate;
import java.util.List;
import java.util.stream.Collectors;

@RequestScoped
public class InfraTools {

    @Inject
    WorkspaceContext workspaceContext;

    @Tool("Count the number of decks")
    public long countDecks() {
        return Deck.count("workspace.id = ?1", getWorkspaceId());
    }

    @Tool("Count the number of cards")
    public long countCards() {
        return Card.count("deck.workspace.id = ?1", getWorkspaceId());
    }

    @Tool("Count the number of notes")
    public long countNotes() {
        return Note.count("workspace.id = ?1", getWorkspaceId());
    }

    @Tool("List all deck names")
    public List<String> listDecks() {
        return Deck.<Deck>find("workspace.id = ?1", getWorkspaceId()).stream()
                .map(d -> d.name)
                .collect(Collectors.toList());
    }

    @Tool("Search for notes containing the term")
    public List<String> searchNotes(String term) {
        if (term == null || term.isBlank()) {
            return List.of();
        }
        return Note.<Note>find("(lower(flds) like ?1 or lower(sfld) like ?1) and workspace.id = ?2",
                "%" + term.toLowerCase() + "%", getWorkspaceId())
                .page(0, 5) // Limit to top 5
                .list().stream()
                .map(n -> "ID: " + n.id + ", Content: " + (n.sfld != null ? n.sfld : "No content"))
                .collect(Collectors.toList());
    }

    @Tool("Create a new deck")
    @Transactional
    public String createDeck(String name) {
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("Deck name cannot be empty");
        }

        br.com.powercards.model.Workspace ws = workspaceContext.getWorkspace();
        if (ws == null) {
            throw new IllegalStateException("No active workspace found");
        }

        Deck deck = new Deck();
        deck.name = name;
        deck.workspace = ws;
        deck.persist();
        return "Deck created with ID: " + deck.id;
    }

    private Long getWorkspaceId() {
        br.com.powercards.model.Workspace ws = workspaceContext.getWorkspace();
        if (ws == null) {
            throw new IllegalStateException("No active workspace found");
        }
        return ws.id;
    }
}
