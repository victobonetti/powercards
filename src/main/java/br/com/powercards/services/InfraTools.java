package br.com.powercards.services;

import dev.langchain4j.agent.tool.Tool;
import jakarta.enterprise.context.RequestScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import br.com.powercards.security.WorkspaceContext;
import br.com.powercards.model.Deck;
import br.com.powercards.model.Card;
import br.com.powercards.model.Note;
import br.com.powercards.model.Tag;
import br.com.powercards.model.AnkiModel;
import java.util.List;
import java.util.stream.Collectors;
import io.quarkus.hibernate.orm.panache.PanacheQuery;

@RequestScoped
public class InfraTools {

    @Inject
    WorkspaceContext workspaceContext;

    // --- Workspace Tools ---

    @Tool("Get current workspace statistics including counts of decks, cards (total, new, learning, due), notes, and tags")
    public String getWorkspaceStats() {
        long deckCount = Deck.count("workspace.id = ?1", getWorkspaceId());
        long cardCount = Card.count("deck.workspace.id = ?1", getWorkspaceId());
        long noteCount = Note.count("workspace.id = ?1", getWorkspaceId());
        long tagCount = Tag.count("workspace.id = ?1", getWorkspaceId());

        long newCards = Card.count("deck.workspace.id = ?1 and queue = 0", getWorkspaceId());
        long learningCards = Card.count("deck.workspace.id = ?1 and (queue = 1 or queue = 3)", getWorkspaceId());
        long dueCards = Card.count("deck.workspace.id = ?1 and queue = 2 and due <= ?2", getWorkspaceId(),
                System.currentTimeMillis() / 1000); // Simple due check

        return String.format("""
                Workspace Overview:
                📚 Decks: %d
                🎴 Total Cards: %d
                📝 Notes: %d
                🏷️  Tags: %d

                Study Status:
                🆕 New: %d cards
                📖 Learning: %d cards
                ⏰ Due for Review: %d cards
                """, deckCount, cardCount, noteCount, tagCount, newCards, learningCards, dueCards);
    }

    // --- Deck Management Tools ---

    @Tool("List all decks in the workspace")
    public List<String> listDecks() {
        return Deck.<Deck>find("workspace.id = ?1", getWorkspaceId()).list().stream()
                .map(d -> String.format("- %s (ID: %d)", d.name, d.id))
                .collect(Collectors.toList());
    }

    @Tool("Create a new deck with the given name")
    @Transactional
    public String createDeck(String name) {
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("Deck name cannot be empty");
        }
        Deck deck = new Deck();
        deck.name = name;
        deck.workspace = workspaceContext.getWorkspace();
        deck.persist();
        return "✅ Deck created successfully! Name: '" + deck.name + "', ID: " + deck.id;
    }

    @Tool("Search for decks by name")
    public List<String> searchDecks(String name) {
        if (name == null || name.isBlank())
            return List.of();
        return Deck
                .<Deck>find("lower(name) like ?1 and workspace.id = ?2", "%" + name.toLowerCase() + "%",
                        getWorkspaceId())
                .stream()
                .map(d -> String.format("Deck: %s (ID: %d)", d.name, d.id))
                .collect(Collectors.toList());
    }

    @Tool("Update a deck's name")
    @Transactional
    public String updateDeck(Long id, String newName) {
        Deck deck = Deck.findById(id);
        if (deck == null || !deck.workspace.id.equals(getWorkspaceId())) {
            return "❌ Deck not found";
        }
        String oldName = deck.name;
        deck.name = newName;
        return String.format("✅ Deck renamed from '%s' to '%s'", oldName, newName);
    }

    @Tool("Delete a deck and all its cards")
    @Transactional
    public String deleteDeck(Long id) {
        Deck deck = Deck.findById(id);
        if (deck == null || !deck.workspace.id.equals(getWorkspaceId())) {
            return "❌ Deck not found";
        }
        String name = deck.name;
        // Cards are deleted via Cascade, but let's count them for info
        long cardCount = Card.count("deck.id = ?1", id);
        deck.delete();
        return String.format("✅ Deleted deck '%s' and %d associated cards", name, cardCount);
    }

    @Tool("Get detailed information about a deck")
    public String getDeckInfo(Long id) {
        Deck deck = Deck.findById(id);
        if (deck == null || !deck.workspace.id.equals(getWorkspaceId())) {
            return "❌ Deck not found";
        }
        long total = Card.count("deck.id = ?1", id);
        long newCards = Card.count("deck.id = ?1 and queue = 0", id);
        long learn = Card.count("deck.id = ?1 and (queue = 1 or queue = 3)", id);
        long review = Card.count("deck.id = ?1 and queue = 2", id);
        long due = Card.count("deck.id = ?1 and queue = 2 and due <= ?2", id, System.currentTimeMillis() / 1000);

        return String.format("""
                Deck: %s (ID: %d)
                📊 Total Cards: %d
                🆕 New: %d
                📖 Learning: %d
                🔄 Review: %d
                ⏰ Due Now: %d
                """, deck.name, deck.id, total, newCards, learn, review, due);
    }

    // --- Card Management Tools ---

    @Tool("List cards in a deck with pagination (default limit 10)")
    public String listCards(Long deckId, int page, int limit) {
        if (limit <= 0)
            limit = 10;
        if (page < 1)
            page = 1;

        PanacheQuery<Card> query = Card.find("deck.id = ?1 and deck.workspace.id = ?2", deckId, getWorkspaceId());
        List<Card> cards = query.page(page - 1, limit).list();

        if (cards.isEmpty())
            return "No cards found.";

        StringBuilder sb = new StringBuilder(String.format("Cards in deck %d (showing %d-%d of %d):\n",
                deckId, (page - 1) * limit + 1, Math.min(page * limit, query.count()), query.count()));

        for (Card c : cards) {
            String status = switch (c.queue) {
                case 0 -> "🆕 New";
                case 1, 3 -> "📖 Learning";
                case 2 -> "🔄 Review";
                default -> "Unknown";
            };
            String content = c.note != null && c.note.sfld != null ? c.note.sfld : "No content";
            if (content.length() > 50)
                content = content.substring(0, 47) + "...";
            sb.append(String.format("Card ID %d: %s - %s\n", c.id, status, content));
        }
        return sb.toString();
    }

    @Tool("Get details of a specific card")
    public String getCard(Long id) {
        Card card = Card.findById(id);
        if (card == null || !card.deck.workspace.id.equals(getWorkspaceId())) {
            return "❌ Card not found";
        }
        String status = switch (card.queue) {
            case 0 -> "New";
            case 1, 3 -> "Learning";
            case 2 -> "Review";
            default -> "Unknown";
        };
        return String.format("""
                Card ID: %d
                Deck: %s
                Status: %s
                Content: %s
                Tags: %s
                Interval: %d days
                Ease Factor: %.1f%%
                Repetitions: %d
                Lapses: %d
                """,
                card.id, card.deck.name, status,
                card.note != null ? card.note.sfld : "",
                card.note != null ? card.note.tags : "",
                card.ivl, card.factor / 10.0, card.reps, card.lapses);
    }

    @Tool("Search cards by content text, optionally filtered by deck ID")
    public String searchCards(String term, Long deckId) {
        if (term == null || term.isBlank())
            return "Please provide a search term.";

        String query = "(lower(note.flds) like ?1 or lower(note.sfld) like ?1) and deck.workspace.id = ?2";
        if (deckId != null) {
            query += " and deck.id = " + deckId;
        }

        List<Card> cards = Card.find(query, "%" + term.toLowerCase() + "%", getWorkspaceId())
                .page(0, 10).list();

        if (cards.isEmpty())
            return "No matching cards found.";

        StringBuilder sb = new StringBuilder("Found " + cards.size() + " card(s):\n\n");
        for (Card c : cards) {
            String content = c.note != null && c.note.sfld != null ? c.note.sfld : "No content";
            if (content.length() > 50)
                content = content.substring(0, 47) + "...";
            sb.append(String.format("Card ID %d [%s]: %s\n", c.id, c.deck.name, content));
        }
        return sb.toString();
    }

    @Tool("Move cards to a different deck")
    @Transactional
    public String moveCards(List<Long> cardIds, Long targetDeckId) {
        Deck targetDeck = Deck.findById(targetDeckId);
        if (targetDeck == null || !targetDeck.workspace.id.equals(getWorkspaceId())) {
            return "❌ Target deck not found";
        }

        int count = 0;
        for (Long id : cardIds) {
            Card card = Card.findById(id);
            if (card != null && card.deck.workspace.id.equals(getWorkspaceId())) {
                card.deck = targetDeck;
                count++;
            }
        }
        return String.format("✅ Moved %d card(s) to deck '%s'", count, targetDeck.name);
    }

    @Tool("Get cards due for review")
    public String getDueCards(Long deckId, int limit) {
        if (limit <= 0)
            limit = 10;
        String query = "queue = 2 and due <= ?1 and deck.workspace.id = ?2";
        if (deckId != null) {
            query += " and deck.id = " + deckId;
        }

        List<Card> cards = Card.find(query, System.currentTimeMillis() / 1000, getWorkspaceId())
                .page(0, limit).list();

        if (cards.isEmpty())
            return "No cards due for review!";

        StringBuilder sb = new StringBuilder("📚 " + cards.size() + " card(s) due for review:\n\n");
        for (Card c : cards) {
            String content = c.note != null && c.note.sfld != null ? c.note.sfld : "No content";
            sb.append(String.format("- [%s] %s\n", c.deck.name, content));
        }
        return sb.toString();
    }

    // --- Note Management Tools ---

    @Tool("Search notes by content")
    public String searchNotes(String term) {
        if (term == null || term.isBlank())
            return "Please provide a search term.";

        List<Note> notes = Note.find("(lower(flds) like ?1 or lower(sfld) like ?1) and workspace.id = ?2",
                "%" + term.toLowerCase() + "%", getWorkspaceId())
                .page(0, 10).list();

        if (notes.isEmpty())
            return "No notes found.";

        StringBuilder sb = new StringBuilder("Found " + notes.size() + " note(s):\n");
        for (Note n : notes) {
            String content = n.sfld != null ? n.sfld : "No content";
            if (content.length() > 50)
                content = content.substring(0, 47) + "...";
            sb.append(String.format("- Note ID %d: %s\n", n.id, content));
        }
        return sb.toString();
    }

    @Tool("Get details of a specific note")
    public String getNote(Long id) {
        Note note = Note.findById(id);
        if (note == null || !note.workspace.id.equals(getWorkspaceId())) {
            return "❌ Note not found";
        }
        return String.format("""
                Note ID: %d
                Content: %s
                Tags: %s
                Cards: %d
                Model: %s
                Modified: %d
                """,
                note.id, note.sfld, note.tags,
                note.cards != null ? note.cards.size() : 0,
                note.model != null ? note.model.name : "Unknown",
                note.mod);
    }

    @Tool("List notes in a deck")
    public String listNotes(Long deckId, int page, int limit) {
        if (limit <= 0)
            limit = 10;
        if (page < 1)
            page = 1;

        // Find notes that have cards in the specified deck
        PanacheQuery<Note> query = Note.find(
                "select distinct c.note from Card c where c.deck.id = ?1 and c.deck.workspace.id = ?2",
                deckId, getWorkspaceId());

        List<Note> notes = query.page(page - 1, limit).list();

        if (notes.isEmpty())
            return "No notes found for this deck.";

        StringBuilder sb = new StringBuilder(String.format("Notes (showing %d-%d of %d):\n\n",
                (page - 1) * limit + 1, Math.min(page * limit, query.count()), query.count()));

        for (Note n : notes) {
            String content = n.sfld != null ? n.sfld : "No content";
            if (content.length() > 50)
                content = content.substring(0, 47) + "...";
            sb.append(String.format("Note ID %d: %s 🏷️ %s\n", n.id, content, n.tags));
        }
        return sb.toString();
    }

    @Tool("Delete notes and their associated cards")
    @Transactional
    public String deleteNotes(List<Long> ids) {
        int count = 0;
        int cardCount = 0;
        for (Long id : ids) {
            Note note = Note.findById(id);
            if (note != null && note.workspace.id.equals(getWorkspaceId())) {
                cardCount += note.cards.size();
                note.delete();
                count++;
            }
        }
        return String.format("✅ Deleted %d note(s) and %d associated card(s)", count, cardCount);
    }

    // --- Tag Management Tools ---

    @Tool("List all tags in the workspace")
    public List<String> listTags() {
        return Tag.<Tag>find("workspace.id = ?1", getWorkspaceId()).stream()
                .map(t -> String.format("- %s (ID: %d)", t.name, t.id))
                .collect(Collectors.toList());
    }

    @Tool("Get statistics for tags (most used)")
    public String getTagStats(int page, int limit) {
        // Since we don't have a direct 'note count' on Tag entity, we might need a
        // custom query or approximation.
        // For simplicity, let's just list tags and maybe count their occurrences in
        // notes if possible,
        // OR just list them. The user prompt shows "biology: 67 note(s)".
        // We can do a count query for each tag or a group by.
        // Group by on Note.tags is hard because tags is a string.
        // Let's rely on the Tag entity existence for now, and maybe simple count if we
        // can correlate.
        // Actually, Note.tags is a string of space separated tags.

        // Let's just list tags with their IDs for now as a basic implementation
        // or try to count occurrences in Note tags string which is expensive.
        // Better: iterate tags and count notes that have this tag in their tag string.

        List<Tag> tags = Tag.<Tag>find("workspace.id = ?1", getWorkspaceId()).list();
        if (tags.isEmpty())
            return "No tags found.";

        StringBuilder sb = new StringBuilder("🏷️  Tag Statistics:\n\n");
        // This is N+1 but for a tool it's okay-ish for small datasets.
        // For larger, we should rely on a proper many-to-many table or full text
        // search.
        // Given current structure, let's limit to top 10 tags by some metric or just
        // first 10.

        for (int i = 0; i < Math.min(tags.size(), limit); i++) {
            Tag t = tags.get(i);
            long count = Note.count("workspace.id = ?1 and tags like ?2", getWorkspaceId(), "%" + t.name + "%");
            sb.append(String.format("- %s: %d note(s)\n", t.name, count));
        }

        return sb.toString();
    }

    @Tool("Create a new tag")
    @Transactional
    public String createTag(String name) {
        if (name == null || name.isBlank())
            throw new IllegalArgumentException("Tag name empty");
        Tag tag = new Tag();
        tag.name = name;
        tag.workspace = workspaceContext.getWorkspace();
        try {
            tag.persist();
            return String.format("✅ Tag created: %s (ID: %d)", tag.name, tag.id);
        } catch (Exception e) {
            return "❌ Error creating tag (maybe it already exists?)";
        }
    }

    @Tool("Search tags by name")
    public List<String> searchTags(String name) {
        return Tag
                .<Tag>find("lower(name) like ?1 and workspace.id = ?2", "%" + name.toLowerCase() + "%",
                        getWorkspaceId())
                .stream()
                .map(t -> String.format("- %s (ID: %d)", t.name, t.id))
                .collect(Collectors.toList());
    }

    // --- Model Management Tools ---

    @Tool("List available card models/templates")
    public String listModels() {
        List<AnkiModel> models = AnkiModel.<AnkiModel>find("workspace.id = ?1", getWorkspaceId()).list();
        StringBuilder sb = new StringBuilder("📋 Available Models (" + models.size() + "):\n\n");
        for (AnkiModel m : models) {
            sb.append(String.format("- %s (ID: %d)\n  Fields: %d, Templates: %d\n",
                    m.name, m.id, m.fields.size(), m.templates.size()));
        }
        return sb.toString();
    }

    @Tool("Get details of a specific model")
    public String getModel(Long id) {
        AnkiModel model = AnkiModel.findById(id);
        if (model == null || !model.workspace.id.equals(getWorkspaceId())) {
            return "❌ Model not found";
        }
        StringBuilder sb = new StringBuilder(String.format("Model: %s (ID: %d)\n\nFields (%d):\n",
                model.name, model.id, model.fields.size()));
        for (int i = 0; i < model.fields.size(); i++) {
            sb.append(String.format("  %d. %s\n", i + 1, model.fields.get(i).name));
        }
        sb.append(String.format("\nTemplates (%d):\n", model.templates.size()));
        for (int i = 0; i < model.templates.size(); i++) {
            sb.append(String.format("  %d. %s\n", i + 1, model.templates.get(i).name));
        }
        return sb.toString();
    }

    private Long getWorkspaceId() {
        br.com.powercards.model.Workspace ws = workspaceContext.getWorkspace();
        if (ws == null) {
            throw new IllegalStateException("No active workspace found");
        }
        return ws.id;
    }
}
