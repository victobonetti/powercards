package br.com.powercards.services;

import br.com.powercards.model.Card;
import br.com.powercards.model.Deck;
import br.com.powercards.model.Note;
import br.com.powercards.model.Tag;
import br.com.powercards.model.Workspace;
import br.com.powercards.security.WorkspaceContext;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.InjectMock;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@QuarkusTest
public class InfraToolsTest {

    @Inject
    InfraTools infraTools;

    @InjectMock
    WorkspaceContext workspaceContext;

    private Workspace workspace;

    @BeforeEach
    @Transactional
    public void setup() {
        Card.deleteAll();
        Note.deleteAll();
        Tag.deleteAll();
        Deck.deleteAll();
        Workspace.deleteAll();

        workspace = new Workspace();
        workspace.name = "Test Workspace";
        workspace.persist();

        Mockito.when(workspaceContext.getWorkspace()).thenReturn(workspace);
    }

    @Test
    public void testGetWorkspaceStats() {
        String stats = infraTools.getWorkspaceStats();
        assertTrue(stats.contains("📚 Decks: 0"));
        assertTrue(stats.contains("🎴 Total Cards: 0"));
    }

    @Test
    @Transactional
    public void testDeckOperations() {
        // Create
        String createResult = infraTools.createDeck("Test Deck");
        assertTrue(createResult.contains("Test Deck"));

        List<Deck> decks = Deck.listAll();
        assertEquals(1, decks.size());
        assertEquals("Test Deck", decks.get(0).name);

        // List
        List<String> deckList = infraTools.listDecks();
        assertEquals(1, deckList.size());
        assertTrue(deckList.get(0).contains("Test Deck"));

        // Search
        List<String> searchResult = infraTools.searchDecks("Test");
        assertEquals(1, searchResult.size());

        // Update
        String updateResult = infraTools.updateDeck(decks.get(0).id, "Updated Deck");
        assertTrue(updateResult.contains("Updated Deck"));
        assertEquals("Updated Deck", ((Deck) Deck.findById(decks.get(0).id)).name);

        // Get Info
        String deckInfo = infraTools.getDeckInfo(decks.get(0).id);
        assertTrue(deckInfo.contains("Updated Deck"));

        // Delete
        String deleteResult = infraTools.deleteDeck(decks.get(0).id);
        assertTrue(deleteResult.contains("Deleted deck"));
        assertEquals(0, Deck.count());
    }

    @Test
    @Transactional
    public void testCardAndNoteOperations() {
        // Setup
        infraTools.createDeck("Deck 1");
        Deck deck = Deck.<Deck>listAll().get(0);

        Note note = new Note();
        note.workspace = workspace;
        note.sfld = "Front Content";
        note.flds = "Front Content\u001FBack Content"; // Anki field separator
        note.tags = "tag1";
        note.persist();

        Card card = new Card();
        card.deck = deck;
        card.note = note;
        card.queue = 0; // New
        card.factor = 2500;
        card.ivl = 0;
        card.reps = 0;
        card.lapses = 0;
        card.persist();
        note.cards.add(card); // Update bi-directional if needed, but managing mainly via card

        // List Cards
        String cardList = infraTools.listCards(deck.id, 1, 10);
        assertTrue(cardList.contains("Front Content"));

        // Get Card
        String cardDetails = infraTools.getCard(card.id);
        assertTrue(cardDetails.contains("Front Content"));
        assertTrue(cardDetails.contains("New"));

        // Search Cards
        String searchResult = infraTools.searchCards("Front", deck.id);
        assertTrue(searchResult.contains("Front Content"));

        // Search Notes
        String noteSearch = infraTools.searchNotes("Front");
        assertTrue(noteSearch.contains("Front Content"));

        // Get Note
        String noteDetails = infraTools.getNote(note.id);
        assertTrue(noteDetails.contains("Front Content"));

        // Move Card
        infraTools.createDeck("Deck 2");
        Deck deck2 = Deck.<Deck>find("name = ?1", "Deck 2").firstResult();
        infraTools.moveCards(List.of(card.id), deck2.id);
        Card movedCard = Card.findById(card.id);
        assertEquals(deck2.id, movedCard.deck.id);

        // Check Due Cards (none due yet/new)
        // Let's make a card due
        Card dueCard = new Card();
        dueCard.deck = deck;
        dueCard.note = note;
        dueCard.queue = 2; // Review
        dueCard.due = (System.currentTimeMillis() / 1000) - 100; // Due in past
        dueCard.persist();

        String dueCards = infraTools.getDueCards(null, 10);
        assertTrue(dueCards.contains("due for review"));
    }

    @Test
    @Transactional
    public void testTagOperations() {
        infraTools.createTag("test-tag");

        List<String> tags = infraTools.listTags();
        assertTrue(tags.stream().anyMatch(t -> t.contains("test-tag")));

        List<String> search = infraTools.searchTags("test");
        assertEquals(1, search.size());
    }
}
