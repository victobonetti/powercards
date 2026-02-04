package br.com.powercards.resources;

import br.com.powercards.dto.CardRequest;
import br.com.powercards.model.Card;
import br.com.powercards.model.Deck;
import br.com.powercards.model.Note;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;
import jakarta.transaction.Transactional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;
import static org.hamcrest.CoreMatchers.is;
import static org.hamcrest.Matchers.notNullValue;
import java.util.List;

@QuarkusTest
public class CardResourceTest {

        private Long deckId;
        private Long targetDeckId;
        private Long noteId;
        private Long cardId;
        private br.com.powercards.model.Workspace workspace;

        @BeforeEach
        @Transactional
        void setUp() {
                br.com.powercards.domain.entities.AnkiMedia.deleteAll();
                Card.deleteAll();
                Note.deleteAll();
                Deck.deleteAll();
                br.com.powercards.model.AnkiTemplate.deleteAll();
                br.com.powercards.model.AnkiField.deleteAll();
                br.com.powercards.model.AnkiModel.deleteAll();
                br.com.powercards.model.Tag.deleteAll();
                br.com.powercards.model.Workspace.deleteAll();

                workspace = new br.com.powercards.model.Workspace();
                workspace.name = "Test Workspace";
                workspace.persist();

                Deck deck = new Deck();
                deck.name = "Card Deck";
                deck.workspace = workspace;
                deck.persist();
                deckId = deck.id;

                Note note = new Note();
                note.flds = "Note Content Searchable";
                note.tags = "tag";
                note.workspace = workspace;
                note.persist();
                noteId = note.id;

                Card card1 = new Card();
                card1.deck = deck;
                card1.note = note;
                card1.ord = 0;
                card1.due = 100L;
                card1.persist();
                cardId = card1.id;

                Card card2 = new Card();
                card2.deck = deck;
                card2.note = note;
                card2.ord = 1;
                card2.due = 200L;
                card2.persist();

                Card card3 = new Card();
                card3.deck = deck;
                card3.note = note;
                card3.ord = 2;
                card3.due = 50L;
                card3.persist();

                Card c3 = new Card();
                c3.deck = deck;
                c3.note = note;
                c3.ord = 2; // Duplicate ordinal for testing? Original code had it.
                c3.due = 50L;
                c3.persist();

                Deck d2 = new Deck();
                d2.name = "Target Deck";
                d2.workspace = workspace;
                d2.persist();
                targetDeckId = d2.id;
        }

        @Test
        public void testCardListSearch() {
                given()
                                .header("X-Workspace-Id", workspace.id)
                                .queryParam("search", "Searchable")
                                .when().get("/v1/cards")
                                .then()
                                .statusCode(200)
                                .body("data.size()", is(4)); // 4 cards total created in setup

                given()
                                .header("X-Workspace-Id", workspace.id)
                                .queryParam("search", "NonExistent")
                                .when().get("/v1/cards")
                                .then()
                                .statusCode(200)
                                .body("data.size()", is(0));
        }

        @Test
        public void testCardListSort() {
                // Sort by due asc
                given()
                                .header("X-Workspace-Id", workspace.id)
                                .queryParam("sort", "due")
                                .when().get("/v1/cards")
                                .then()
                                .statusCode(200)
                                .body("data[0].due", is(50))
                                .body("data[3].due", is(200));

                // Sort by ord desc
                given()
                                .header("X-Workspace-Id", workspace.id)
                                .queryParam("sort", "-ord")
                                .when().get("/v1/cards")
                                .then()
                                .statusCode(200)
                                .body("data[0].ordinal", is(2));
        }

        @Test
        public void testCardCRUD() {
                // Create Card
                String cardJson = "{\"noteId\": " + noteId + ", \"deckId\": " + deckId + ", \"ordinal\": 5}";
                Integer cardId = given()
                                .header("X-Workspace-Id", workspace.id)
                                .contentType(ContentType.JSON)
                                .body(cardJson)
                                .when().post("/v1/cards")
                                .then()
                                .statusCode(201)
                                .body("id", notNullValue())
                                .extract().path("id");

                // Get
                given()
                                .header("X-Workspace-Id", workspace.id)
                                .when().get("/v1/cards/" + cardId)
                                .then()
                                .statusCode(200)
                                .body("ordinal", is(5));

                // Update
                String updatedCardJson = "{\"ordinal\": 10}";
                given()
                                .header("X-Workspace-Id", workspace.id)
                                .contentType(ContentType.JSON)
                                .body(updatedCardJson)
                                .when().put("/v1/cards/" + cardId)
                                .then()
                                .statusCode(200)
                                .body("ordinal", is(10));

                // Delete
                given()
                                .header("X-Workspace-Id", workspace.id)
                                .when().delete("/v1/cards/" + cardId)
                                .then()
                                .statusCode(204);
        }

        @Test
        public void testUpdateCardAndNote() {
                CardRequest request = new CardRequest(
                                noteId, deckId, 1, System.currentTimeMillis() / 1000, 1, 0, 0, 0L, 0, 0, 0, 0, 0, 0L,
                                0L, 0, "{}"
                                // Note: we need to match the constructor arguments for CardRequest
                                , "Updated Content", "updated tag");

                given()
                                .header("X-Workspace-Id", workspace.id)
                                .contentType(ContentType.JSON)
                                .body(request)
                                .when().put("/v1/cards/" + cardId) // Need to access card id correctly
                                .then()
                                .statusCode(200)
                                .body("noteField", is("Updated Content"))
                                .body("noteTags", is("updated tag"));

                // Verify changes are persisted in Note
                given()
                                .header("X-Workspace-Id", workspace.id)
                                .when().get("/v1/notes/" + noteId)
                                .then()
                                .statusCode(200)
                                .body("fields", is("Updated Content"))
                                .body("tags", is("updated tag"));
        }

        @Test
        public void testCardListSortByTags() {
                given()
                                .header("X-Workspace-Id", workspace.id)
                                .queryParam("sort", "tags")
                                .when().get("/v1/cards")
                                .then()
                                .statusCode(200);
        }

        @Test
        public void testBulkDelete() {
                List<Card> cards = Card.listAll();

                // Need to filter cards by workspace to be safe in real tests, but here we wiped
                // all.
                // Assuming cards list populated from setup
                // c1 and c2 are 2nd and 3rd cards (indices 1 and 2 in listAll order usually
                // insertion order)
                // Let's pick by ID to be safer or iterate
                if (cards.size() < 3)
                        return;

                Card c1 = cards.get(1);
                Card c2 = cards.get(2);

                given()
                                .header("X-Workspace-Id", workspace.id)
                                .contentType("application/json")
                                .body("{\"ids\": [" + c1.id + ", " + c2.id + "]}")
                                .when().post("/v1/cards/bulk/delete")
                                .then()
                                .statusCode(204);

                given()
                                .header("X-Workspace-Id", workspace.id)
                                .when().get("/v1/cards/" + c1.id)
                                .then()
                                .statusCode(404);
        }

        @Test
        public void testBulkMove() {
                // Use cardId (card1)
                Long cId = this.cardId;

                given()
                                .header("X-Workspace-Id", workspace.id)
                                .contentType("application/json")
                                .body("{\"cardIds\": [" + cId + "], \"targetDeckId\": " + targetDeckId + "}")
                                .when().post("/v1/cards/bulk/move")
                                .then()
                                .statusCode(204);
        }

        @Test
        public void testPartialBulkMove() {
                // Move ONLY card1 to targetDeckId
                given()
                                .header("X-Workspace-Id", workspace.id)
                                .contentType("application/json")
                                .body("{\"cardIds\": [" + cardId + "], \"targetDeckId\": " + targetDeckId + "}")
                                .when().post("/v1/cards/bulk/move")
                                .then()
                                .statusCode(204);

                // Verify card1 is in targetDeck
                given()
                                .header("X-Workspace-Id", workspace.id)
                                .when().get("/v1/cards/" + cardId)
                                .then().body("deckId", is(targetDeckId.intValue()));

                // Verify source deck decreased count
                given()
                                .header("X-Workspace-Id", workspace.id)
                                .when().get("/v1/decks/" + deckId)
                                .then()
                                .statusCode(200)
                                .body("cardCount", is(3)); // Started with 4 cards total (one duplicate c3 persisted?)
                // 4 cards: card1, card2, card3, c3. All in 'Card Deck'.
                // After move card1, 3 remain.
                // NOTE: setUp created 4 card objects: card1, card2, card3, c3.
                // card1 -> deck
                // card2 -> deck
                // card3 -> deck
                // c3 -> deck
                // Total 4.
                // After moving card1, expected 3.

                // Verify target deck increased count
                given()
                                .header("X-Workspace-Id", workspace.id)
                                .when().get("/v1/decks/" + targetDeckId)
                                .then()
                                .statusCode(200)
                                .body("cardCount", is(1));
        }

        @Test
        public void testCardListFilterByDeck() {
                // List cards for deckId
                given()
                                .header("X-Workspace-Id", workspace.id)
                                .queryParam("deckId", deckId)
                                .when().get("/v1/cards")
                                .then()
                                .statusCode(200)
                                .body("data.size()", is(4)); // 4 cards in setup

                // List cards for targetDeckId
                given()
                                .header("X-Workspace-Id", workspace.id)
                                .queryParam("deckId", targetDeckId)
                                .when().get("/v1/cards")
                                .then()
                                .statusCode(200)
                                .body("data.size()", is(0));
        }
}
