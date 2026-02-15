package br.com.powercards.services;

import dev.langchain4j.agent.tool.Tool;
import jakarta.enterprise.context.RequestScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import br.com.powercards.security.WorkspaceContext;
import br.com.powercards.model.*;
import io.quarkus.hibernate.orm.panache.PanacheQuery;

import java.util.List;
import java.util.stream.Collectors;

/**
 * User-friendly AI tools for PowerCards.
 * Designed to minimize the need for users to provide IDs or technical details.
 * The AI handles lookups and conversions automatically.
 */
@RequestScoped
public class InfraTools {

    @Inject
    WorkspaceContext workspaceContext;

    // ============================================================================
    // WORKSPACE OVERVIEW
    // ============================================================================

    @Tool("Get a complete overview of the user's study workspace including statistics and recommendations")
    public String showMyWorkspace() {
        long deckCount = Deck.count("workspace.id = ?1", getWorkspaceId());
        long cardCount = Card.count("deck.workspace.id = ?1", getWorkspaceId());
        long noteCount = Note.count("workspace.id = ?1", getWorkspaceId());
        long tagCount = Tag.count("workspace.id = ?1", getWorkspaceId());

        long newCards = Card.count("deck.workspace.id = ?1 and queue = 0", getWorkspaceId());
        long learningCards = Card.count("deck.workspace.id = ?1 and (queue = 1 or queue = 3)", getWorkspaceId());
        long dueCards = Card.count("deck.workspace.id = ?1 and queue = 2 and due <= ?2", getWorkspaceId(),
                System.currentTimeMillis() / 1000);

        StringBuilder sb = new StringBuilder();
        sb.append("📚 Your Study Space\n\n");
        sb.append(String.format("You have %d deck%s with %d total cards\n",
                deckCount, deckCount == 1 ? "" : "s", cardCount));
        sb.append(String.format("Notes: %d | Tags: %d\n\n", noteCount, tagCount));

        sb.append("📖 Study Status:\n");
        if (dueCards > 0) {
            sb.append(String.format("⚠️  %d cards waiting for review\n", dueCards));
        }
        if (learningCards > 0) {
            sb.append(String.format("📝 %d cards in learning mode\n", learningCards));
        }
        if (newCards > 0) {
            sb.append(String.format("✨ %d new cards ready to study\n", newCards));
        }

        if (dueCards == 0 && learningCards == 0 && newCards == 0) {
            sb.append("✅ All caught up! Great work!\n");
        } else {
            sb.append("\n💡 Tip: Say 'what should I study?' to get started!");
        }

        return sb.toString();
    }

    @Tool("Show what the user should study right now based on their cards and priorities")
    public String whatShouldIStudy() {
        long dueCards = Card.count("deck.workspace.id = ?1 and queue = 2 and due <= ?2",
                getWorkspaceId(), System.currentTimeMillis() / 1000);
        long learningCards = Card.count("deck.workspace.id = ?1 and (queue = 1 or queue = 3)", getWorkspaceId());
        long newCards = Card.count("deck.workspace.id = ?1 and queue = 0", getWorkspaceId());

        StringBuilder sb = new StringBuilder();
        sb.append("🎯 Study Recommendation:\n\n");

        if (dueCards > 0) {
            sb.append(String.format("🔴 PRIORITY: Review %d due cards first\n", dueCards));
            sb.append("   These cards need attention to maintain your memory!\n\n");
        }

        if (learningCards > 0) {
            sb.append(String.format("🟡 Continue learning %d cards in progress\n\n", learningCards));
        }

        if (newCards > 0) {
            sb.append(String.format("🟢 Then explore %d new cards\n\n", newCards));
        }

        if (dueCards == 0 && learningCards == 0 && newCards == 0) {
            sb.append("✨ You're all caught up! No cards to study right now.\n");
            sb.append("Consider adding new content or taking a well-deserved break!\n");
        } else {
            int estimated = (int) (dueCards * 0.5 + learningCards * 0.8 + Math.min(newCards, 10) * 1.2);
            sb.append(String.format("⏱️  Estimated time: %d minutes\n", Math.max(5, estimated)));
        }

        return sb.toString();
    }

    // ============================================================================
    // DECK MANAGEMENT - NO IDS NEEDED
    // ============================================================================

    @Tool("Show all the user's decks with their current status")
    public String showMyDecks() {
        List<Deck> decks = Deck.<Deck>find("workspace.id = ?1 order by name", getWorkspaceId()).list();

        if (decks.isEmpty()) {
            return "📚 You don't have any decks yet.\n💡 Say 'create a deck for [topic]' to get started!";
        }

        StringBuilder sb = new StringBuilder();
        sb.append(String.format("📚 Your Decks (%d total):\n\n", decks.size()));

        for (Deck deck : decks) {
            long total = Card.count("deck.id = ?1", deck.id);
            long due = Card.count("deck.id = ?1 and queue = 2 and due <= ?2", deck.id,
                    System.currentTimeMillis() / 1000);
            long newC = Card.count("deck.id = ?1 and queue = 0", deck.id);

            String status = "";
            if (due > 0)
                status = String.format(" ⏰ %d due", due);
            if (newC > 0)
                status += String.format(" ✨ %d new", newC);

            sb.append(String.format("• %s (%d cards)%s\n", deck.name, total, status));
        }

        return sb.toString();
    }

    @Tool("Create a new deck. Just provide the deck name, nothing else needed")
    @Transactional
    public String createDeck(String deckName) {
        if (deckName == null || deckName.isBlank()) {
            return "❌ Please provide a name for your deck.\n💡 Example: 'create a deck for Spanish vocabulary'";
        }

        // Check for duplicates
        long existing = Deck.count("lower(name) = ?1 and workspace.id = ?2",
                deckName.toLowerCase().trim(), getWorkspaceId());

        if (existing > 0) {
            return String.format("⚠️  You already have a deck named '%s'.\n" +
                    "💡 Try a different name or say 'show my decks' to see all decks.", deckName);
        }

        Deck deck = new Deck();
        deck.name = deckName.trim();
        deck.workspace = workspaceContext.getWorkspace();
        deck.persist();

        return String.format("✅ Created deck '%s'!\n" +
                "💡 You can now add cards to it or say 'show deck %s' to see details.", deck.name, deck.name);
    }

    @Tool("Show detailed information about a specific deck by name (no ID needed)")
    public String showDeck(String deckName) {
        Deck deck = findDeckByName(deckName);
        if (deck == null) {
            return String.format("❌ Couldn't find a deck named '%s'.\n" +
                    "💡 Say 'show my decks' to see all available decks.", deckName);
        }

        long total = Card.count("deck.id = ?1", deck.id);
        long newCards = Card.count("deck.id = ?1 and queue = 0", deck.id);
        long learning = Card.count("deck.id = ?1 and (queue = 1 or queue = 3)", deck.id);
        long review = Card.count("deck.id = ?1 and queue = 2", deck.id);
        long due = Card.count("deck.id = ?1 and queue = 2 and due <= ?2", deck.id,
                System.currentTimeMillis() / 1000);

        StringBuilder sb = new StringBuilder();
        sb.append(String.format("📚 Deck: %s\n\n", deck.name));
        sb.append(String.format("Total Cards: %d\n", total));

        if (total > 0) {
            sb.append(String.format("├─ ✨ New: %d\n", newCards));
            sb.append(String.format("├─ 📝 Learning: %d\n", learning));
            sb.append(String.format("└─ 🔄 Review: %d", review));
            if (due > 0) {
                sb.append(String.format(" (⏰ %d due now)", due));
            }
            sb.append("\n");

            if (due > 0) {
                sb.append(String.format("\n💡 Ready to study? Say 'study %s'", deck.name));
            }
        } else {
            sb.append("\n📭 This deck is empty.\n");
            sb.append(String.format("💡 Add some cards to get started with studying %s!", deck.name));
        }

        return sb.toString();
    }

    @Tool("Rename a deck. Provide old name and new name")
    @Transactional
    public String renameDeck(String currentName, String newName) {
        Deck deck = findDeckByName(currentName);
        if (deck == null) {
            return String.format("❌ Couldn't find a deck named '%s'.", currentName);
        }

        if (newName == null || newName.isBlank()) {
            return "❌ Please provide a new name for the deck.";
        }

        String oldName = deck.name;
        deck.name = newName.trim();
        deck.persist();

        return String.format("✅ Renamed deck from '%s' to '%s'", oldName, newName);
    }

    @Tool("Delete a deck by name. This will permanently remove the deck and all its cards")
    @Transactional
    public String deleteDeck(String deckName) {
        Deck deck = findDeckByName(deckName);
        if (deck == null) {
            return String.format("❌ Couldn't find a deck named '%s'.", deckName);
        }

        long cardCount = Card.count("deck.id = ?1", deck.id);
        String name = deck.name;

        // Delete cards first (cascade should handle this, but being explicit)
        Card.delete("deck.id = ?1", deck.id);
        deck.delete();

        return String.format("✅ Deleted deck '%s' and removed %d cards.\n" +
                "⚠️  This action cannot be undone.", name, cardCount);
    }

    @Tool("Find decks by searching their names (partial matches work)")
    public String findDecks(String searchText) {
        if (searchText == null || searchText.isBlank()) {
            return "💡 Provide some text to search for in deck names.";
        }

        List<Deck> decks = Deck.<Deck>find(
                "lower(name) like ?1 and workspace.id = ?2",
                "%" + searchText.toLowerCase() + "%",
                getWorkspaceId()).list();

        if (decks.isEmpty()) {
            return String.format("No decks found matching '%s'.\n💡 Try different search terms or say 'show my decks'.",
                    searchText);
        }

        StringBuilder sb = new StringBuilder();
        sb.append(String.format("Found %d deck%s matching '%s':\n\n",
                decks.size(), decks.size() == 1 ? "" : "s", searchText));

        for (Deck deck : decks) {
            long cardCount = Card.count("deck.id = ?1", deck.id);
            sb.append(String.format("• %s (%d cards)\n", deck.name, cardCount));
        }

        return sb.toString();
    }

    // ============================================================================
    // CARD BROWSING - SIMPLIFIED
    // ============================================================================

    @Tool("Show cards in a deck (provide deck name, no ID needed)")
    public String showCardsIn(String deckName, Integer limit) {
        Deck deck = findDeckByName(deckName);
        if (deck == null) {
            return String.format("❌ Couldn't find a deck named '%s'.", deckName);
        }

        if (limit == null || limit <= 0)
            limit = 10;
        if (limit > 50)
            limit = 50;

        List<Card> cards = Card.<Card>find("deck.id = ?1", deck.id)
                .page(0, limit)
                .list();

        long total = Card.count("deck.id = ?1", deck.id);

        if (cards.isEmpty()) {
            return String.format("📭 The deck '%s' doesn't have any cards yet.", deck.name);
        }

        StringBuilder sb = new StringBuilder();
        sb.append(String.format("📚 Cards in '%s' (showing %d of %d):\n\n",
                deck.name, Math.min(limit, cards.size()), total));

        for (Card card : cards) {
            String status = switch (card.queue) {
                case 0 -> "✨ New";
                case 1, 3 -> "📝 Learning";
                case 2 -> {
                    boolean isDue = card.due <= System.currentTimeMillis() / 1000;
                    yield isDue ? "⏰ Due" : "🔄 Review";
                }
                default -> "❓";
            };

            String content = card.note != null && card.note.sfld != null
                    ? card.note.sfld
                    : "No content";

            if (content.length() > 60)
                content = content.substring(0, 57) + "...";

            sb.append(String.format("%s: %s\n", status, content));
        }

        if (total > limit) {
            sb.append(String.format("\n... and %d more cards", total - limit));
        }

        return sb.toString();
    }

    @Tool("Show cards that are due for review right now, optionally filtered by deck name")
    public String showDueCards(String deckName) {
        List<Card> cards;
        String deckFilter = "";

        if (deckName != null && !deckName.isBlank()) {
            Deck deck = findDeckByName(deckName);
            if (deck == null) {
                return String.format("❌ Couldn't find a deck named '%s'.", deckName);
            }
            cards = Card.<Card>find(
                    "deck.id = ?1 and queue = 2 and due <= ?2 order by due",
                    deck.id, System.currentTimeMillis() / 1000)
                    .page(0, 20)
                    .list();
            deckFilter = " in '" + deck.name + "'";
        } else {
            cards = Card.<Card>find(
                    "deck.workspace.id = ?1 and queue = 2 and due <= ?2 order by due",
                    getWorkspaceId(), System.currentTimeMillis() / 1000)
                    .page(0, 20)
                    .list();
        }

        if (cards.isEmpty()) {
            return String.format("✅ No cards due for review%s!\nYou're all caught up! 🎉", deckFilter);
        }

        StringBuilder sb = new StringBuilder();
        sb.append(String.format("⏰ %d card%s due for review%s:\n\n",
                cards.size(), cards.size() == 1 ? "" : "s", deckFilter));

        for (Card card : cards) {
            String content = card.note != null && card.note.sfld != null
                    ? card.note.sfld
                    : "No content";

            if (content.length() > 50)
                content = content.substring(0, 47) + "...";

            if (deckName == null) {
                sb.append(String.format("• [%s] %s\n", card.deck.name, content));
            } else {
                sb.append(String.format("• %s\n", content));
            }
        }

        return sb.toString();
    }

    @Tool("Search for cards by their content (searches across all decks by default)")
    public String findCards(String searchText, String inDeckNamed) {
        if (searchText == null || searchText.isBlank()) {
            return "💡 Please provide some text to search for in your cards.";
        }

        List<Card> cards;
        String deckInfo = "";

        if (inDeckNamed != null && !inDeckNamed.isBlank()) {
            Deck deck = findDeckByName(inDeckNamed);
            if (deck == null) {
                return String.format("❌ Couldn't find a deck named '%s'.", inDeckNamed);
            }

            cards = Card.<Card>find(
                    "(lower(note.flds) like ?1 or lower(note.sfld) like ?1) and deck.id = ?2",
                    "%" + searchText.toLowerCase() + "%", deck.id)
                    .page(0, 15)
                    .list();
            deckInfo = String.format(" in '%s'", deck.name);
        } else {
            cards = Card.<Card>find(
                    "(lower(note.flds) like ?1 or lower(note.sfld) like ?1) and deck.workspace.id = ?2",
                    "%" + searchText.toLowerCase() + "%", getWorkspaceId())
                    .page(0, 15)
                    .list();
        }

        if (cards.isEmpty()) {
            return String.format("No cards found matching '%s'%s.\n💡 Try different search terms.",
                    searchText, deckInfo);
        }

        StringBuilder sb = new StringBuilder();
        sb.append(String.format("Found %d card%s matching '%s'%s:\n\n",
                cards.size(), cards.size() == 1 ? "" : "s", searchText, deckInfo));

        for (Card card : cards) {
            String content = card.note != null && card.note.sfld != null
                    ? card.note.sfld
                    : "No content";

            if (content.length() > 60)
                content = content.substring(0, 57) + "...";

            if (inDeckNamed == null) {
                sb.append(String.format("• [%s] %s\n", card.deck.name, content));
            } else {
                sb.append(String.format("• %s\n", content));
            }
        }

        return sb.toString();
    }

    @Tool("Move cards from one deck to another by searching for content. Provide the content to find and the target deck name")
    @Transactional
    public String moveCardsMatching(String contentToFind, String fromDeckName, String toDeckName) {
        if (contentToFind == null || contentToFind.isBlank()) {
            return "❌ Please specify what cards to move (by their content).";
        }

        if (toDeckName == null || toDeckName.isBlank()) {
            return "❌ Please specify the destination deck name.";
        }

        Deck targetDeck = findDeckByName(toDeckName);
        if (targetDeck == null) {
            return String.format("❌ Couldn't find a deck named '%s'.", toDeckName);
        }

        List<Card> cards;
        String sourceInfo = "";

        if (fromDeckName != null && !fromDeckName.isBlank()) {
            Deck sourceDeck = findDeckByName(fromDeckName);
            if (sourceDeck == null) {
                return String.format("❌ Couldn't find source deck named '%s'.", fromDeckName);
            }

            cards = Card.<Card>find(
                    "(lower(note.flds) like ?1 or lower(note.sfld) like ?1) and deck.id = ?2",
                    "%" + contentToFind.toLowerCase() + "%", sourceDeck.id)
                    .list();
            sourceInfo = String.format(" from '%s'", sourceDeck.name);
        } else {
            cards = Card.<Card>find(
                    "(lower(note.flds) like ?1 or lower(note.sfld) like ?1) and deck.workspace.id = ?2",
                    "%" + contentToFind.toLowerCase() + "%", getWorkspaceId())
                    .list();
        }

        if (cards.isEmpty()) {
            return String.format("No cards found matching '%s'%s.", contentToFind, sourceInfo);
        }

        int movedCount = 0;
        for (Card card : cards) {
            card.deck = targetDeck;
            card.persist();
            movedCount++;
        }

        return String.format("✅ Moved %d card%s%s to '%s'",
                movedCount, movedCount == 1 ? "" : "s", sourceInfo, targetDeck.name);
    }

    // ============================================================================
    // NOTE MANAGEMENT - USER FRIENDLY
    // ============================================================================

    @Tool("Search for notes by their content")
    public String findNotes(String searchText, String inDeckNamed) {
        if (searchText == null || searchText.isBlank()) {
            return "💡 Please provide some text to search for in your notes.";
        }

        List<Note> notes;
        String deckInfo = "";

        if (inDeckNamed != null && !inDeckNamed.isBlank()) {
            Deck deck = findDeckByName(inDeckNamed);
            if (deck == null) {
                return String.format("❌ Couldn't find a deck named '%s'.", inDeckNamed);
            }

            notes = Note.<Note>find(
                    "select distinct c.note from Card c where c.deck.id = ?1 and " +
                            "(lower(c.note.flds) like ?2 or lower(c.note.sfld) like ?2)",
                    deck.id, "%" + searchText.toLowerCase() + "%")
                    .page(0, 15)
                    .list();
            deckInfo = String.format(" in '%s'", deck.name);
        } else {
            notes = Note.<Note>find(
                    "(lower(flds) like ?1 or lower(sfld) like ?1) and workspace.id = ?2",
                    "%" + searchText.toLowerCase() + "%", getWorkspaceId())
                    .page(0, 15)
                    .list();
        }

        if (notes.isEmpty()) {
            return String.format("No notes found matching '%s'%s.", searchText, deckInfo);
        }

        StringBuilder sb = new StringBuilder();
        sb.append(String.format("Found %d note%s matching '%s'%s:\n\n",
                notes.size(), notes.size() == 1 ? "" : "s", searchText, deckInfo));

        for (Note note : notes) {
            String content = note.sfld != null ? note.sfld : "No content";
            if (content.length() > 70)
                content = content.substring(0, 67) + "...";

            String tags = note.tags != null && !note.tags.isBlank()
                    ? " 🏷️ " + note.tags
                    : "";

            sb.append(String.format("• %s%s\n", content, tags));
        }

        return sb.toString();
    }

    @Tool("Show notes in a specific deck")
    public String showNotesIn(String deckName, Integer limit) {
        Deck deck = findDeckByName(deckName);
        if (deck == null) {
            return String.format("❌ Couldn't find a deck named '%s'.", deckName);
        }

        if (limit == null || limit <= 0)
            limit = 10;
        if (limit > 50)
            limit = 50;

        List<Note> notes = Note.<Note>find(
                "select distinct c.note from Card c where c.deck.id = ?1 and c.deck.workspace.id = ?2",
                deck.id, getWorkspaceId())
                .page(0, limit)
                .list();

        if (notes.isEmpty()) {
            return String.format("📭 No notes found in deck '%s'.", deck.name);
        }

        StringBuilder sb = new StringBuilder();
        sb.append(String.format("📝 Notes in '%s' (showing up to %d):\n\n",
                deck.name, limit));

        for (Note note : notes) {
            String content = note.sfld != null ? note.sfld : "No content";
            if (content.length() > 60)
                content = content.substring(0, 57) + "...";

            String tags = note.tags != null && !note.tags.isBlank()
                    ? " 🏷️ " + note.tags
                    : "";

            sb.append(String.format("• %s%s\n", content, tags));
        }

        return sb.toString();
    }

    // ============================================================================
    // TAG MANAGEMENT - SIMPLIFIED
    // ============================================================================

    @Tool("Show all tags used in the workspace")
    public String showMyTags() {
        List<Tag> tags = Tag.<Tag>find("workspace.id = ?1 order by name", getWorkspaceId()).list();

        if (tags.isEmpty()) {
            return "🏷️  You don't have any tags yet.\n" +
                    "💡 Tags help organize your cards. Create one by saying 'create tag [name]'";
        }

        StringBuilder sb = new StringBuilder();
        sb.append(String.format("🏷️  Your Tags (%d total):\n\n", tags.size()));

        for (Tag tag : tags) {
            long noteCount = Note.count(
                    "workspace.id = ?1 and (tags like ?2 or tags like ?3 or tags like ?4 or tags = ?5)",
                    getWorkspaceId(),
                    "% " + tag.name + " %", // middle
                    tag.name + " %", // start
                    "% " + tag.name, // end
                    tag.name); // exact

            sb.append(String.format("• %s (%d note%s)\n",
                    tag.name, noteCount, noteCount == 1 ? "" : "s"));
        }

        return sb.toString();
    }

    @Tool("Create a new tag with the given name")
    @Transactional
    public String createTag(String tagName) {
        if (tagName == null || tagName.isBlank()) {
            return "❌ Please provide a name for the tag.";
        }

        String cleanName = tagName.trim().toLowerCase().replaceAll("\\s+", "-");

        Tag existing = Tag.find("lower(name) = ?1 and workspace.id = ?2",
                cleanName, getWorkspaceId()).firstResult();

        if (existing != null) {
            return String.format("⚠️  Tag '%s' already exists!", cleanName);
        }

        Tag tag = new Tag();
        tag.name = cleanName;
        tag.workspace = workspaceContext.getWorkspace();
        tag.persist();

        return String.format("✅ Created tag '%s'\n" +
                "💡 You can now use it to organize your notes.", tag.name);
    }

    @Tool("Find tags by name (partial matches work)")
    public String findTags(String searchText) {
        if (searchText == null || searchText.isBlank()) {
            return "💡 Provide some text to search for in tag names.";
        }

        List<Tag> tags = Tag.<Tag>find(
                "lower(name) like ?1 and workspace.id = ?2",
                "%" + searchText.toLowerCase() + "%",
                getWorkspaceId()).list();

        if (tags.isEmpty()) {
            return String.format("No tags found matching '%s'.\n💡 Say 'show my tags' to see all tags.",
                    searchText);
        }

        StringBuilder sb = new StringBuilder();
        sb.append(String.format("Found %d tag%s matching '%s':\n\n",
                tags.size(), tags.size() == 1 ? "" : "s", searchText));

        for (Tag tag : tags) {
            long noteCount = Note.count(
                    "workspace.id = ?1 and tags like ?2",
                    getWorkspaceId(), "%" + tag.name + "%");

            sb.append(String.format("• %s (%d note%s)\n",
                    tag.name, noteCount, noteCount == 1 ? "" : "s"));
        }

        return sb.toString();
    }

    @Tool("Find notes that have a specific tag")
    public String findNotesTagged(String tagName) {
        if (tagName == null || tagName.isBlank()) {
            return "💡 Please specify which tag to search for.";
        }

        List<Note> notes = Note.<Note>find(
                "(tags like ?1 or tags like ?2 or tags like ?3 or tags = ?4) and workspace.id = ?5",
                "% " + tagName + " %", // middle
                tagName + " %", // start
                "% " + tagName, // end
                tagName, // exact
                getWorkspaceId())
                .page(0, 20)
                .list();

        if (notes.isEmpty()) {
            return String.format("No notes found with tag '%s'.", tagName);
        }

        StringBuilder sb = new StringBuilder();
        sb.append(String.format("📝 %d note%s tagged with '%s':\n\n",
                notes.size(), notes.size() == 1 ? "" : "s", tagName));

        for (Note note : notes) {
            String content = note.sfld != null ? note.sfld : "No content";
            if (content.length() > 60)
                content = content.substring(0, 57) + "...";

            sb.append(String.format("• %s\n", content));
        }

        return sb.toString();
    }

    // ============================================================================
    // MODEL/TEMPLATE INFO
    // ============================================================================

    @Tool("Show available card templates (models) that can be used to create cards")
    public String showCardTemplates() {
        List<AnkiModel> models = AnkiModel.<AnkiModel>find("workspace.id = ?1", getWorkspaceId()).list();

        if (models.isEmpty()) {
            return "📋 No card templates found.\n" +
                    "💡 Import an Anki deck to get started with templates.";
        }

        StringBuilder sb = new StringBuilder();
        sb.append(String.format("📋 Available Card Templates (%d):\n\n", models.size()));

        for (AnkiModel model : models) {
            int fieldCount = model.fields != null ? model.fields.size() : 0;
            int templateCount = model.templates != null ? model.templates.size() : 0;

            sb.append(String.format("• %s\n  └─ %d field%s, %d template%s\n",
                    model.name,
                    fieldCount, fieldCount == 1 ? "" : "s",
                    templateCount, templateCount == 1 ? "" : "s"));
        }

        sb.append("\n💡 Templates define how your cards look and what fields they have.");

        return sb.toString();
    }

    @Tool("Show details about a specific card template by name")
    public String showTemplate(String templateName) {
        if (templateName == null || templateName.isBlank()) {
            return "💡 Please specify which template you want to see.";
        }

        AnkiModel model = AnkiModel.<AnkiModel>find(
                "lower(name) like ?1 and workspace.id = ?2",
                "%" + templateName.toLowerCase() + "%",
                getWorkspaceId()).firstResult();

        if (model == null) {
            return String.format("❌ No template found matching '%s'.\n" +
                    "💡 Say 'show card templates' to see all available templates.", templateName);
        }

        StringBuilder sb = new StringBuilder();
        sb.append(String.format("📋 Template: %s\n\n", model.name));

        if (model.fields != null && !model.fields.isEmpty()) {
            sb.append(String.format("Fields (%d):\n", model.fields.size()));
            for (int i = 0; i < Math.min(model.fields.size(), 10); i++) {
                sb.append(String.format("  %d. %s\n", i + 1, model.fields.get(i).name));
            }
        }

        if (model.templates != null && !model.templates.isEmpty()) {
            sb.append(String.format("\nTemplates (%d):\n", model.templates.size()));
            for (int i = 0; i < Math.min(model.templates.size(), 5); i++) {
                sb.append(String.format("  %d. %s\n", i + 1, model.templates.get(i).name));
            }
        }

        return sb.toString();
    }

    // ============================================================================
    // HELPER METHODS
    // ============================================================================

    private Long getWorkspaceId() {
        Workspace ws = workspaceContext.getWorkspace();
        if (ws == null) {
            throw new IllegalStateException("No active workspace found");
        }
        return ws.id;
    }

    /**
     * Find a deck by name (case-insensitive, exact match preferred, then partial)
     */
    private Deck findDeckByName(String name) {
        if (name == null || name.isBlank())
            return null;

        String cleanName = name.trim();

        // Try exact match first (case-insensitive)
        Deck exact = Deck.<Deck>find(
                "lower(name) = ?1 and workspace.id = ?2",
                cleanName.toLowerCase(),
                getWorkspaceId()).firstResult();

        if (exact != null)
            return exact;

        // Try partial match
        List<Deck> partial = Deck.<Deck>find(
                "lower(name) like ?1 and workspace.id = ?2",
                "%" + cleanName.toLowerCase() + "%",
                getWorkspaceId()).list();

        // If exactly one match, return it
        if (partial.size() == 1)
            return partial.get(0);

        // If multiple matches, prefer the shortest one (most specific)
        if (!partial.isEmpty()) {
            return partial.stream()
                    .min((a, b) -> Integer.compare(a.name.length(), b.name.length()))
                    .orElse(null);
        }

        return null;
    }
}