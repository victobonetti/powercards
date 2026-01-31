package br.com.powercards.resources;

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

@QuarkusTest
public class CardResourceTest {

        private Long deckId;
        private Long noteId;

        @BeforeEach
        @Transactional
        void setUp() {
                Card.deleteAll();
                Note.deleteAll();
                Deck.deleteAll();

                Deck deck = new Deck();
                deck.name = "Card Deck";
                deck.persist();
                deckId = deck.id;

                Note note = new Note();
                note.flds = "Note Content Searchable";
                note.tags = "tag";
                note.persist();
                noteId = note.id;

                Card card1 = new Card();
                card1.deck = deck;
                card1.note = note;
                card1.ord = 0;
                card1.due = 100L;
                card1.persist();

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
        }

        @Test
        public void testCardListSearch() {
                given()
                                .queryParam("search", "Searchable")
                                .when().get("/v1/cards")
                                .then()
                                .statusCode(200)
                                .body("data.size()", is(3)); // All cards belong to the note

                given()
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
                                .queryParam("sort", "due")
                                .when().get("/v1/cards")
                                .then()
                                .statusCode(200)
                                .body("data[0].due", is(50))
                                .body("data[2].due", is(200));

                // Sort by ord desc
                given()
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
                                .contentType(ContentType.JSON)
                                .body(cardJson)
                                .when().post("/v1/cards")
                                .then()
                                .statusCode(201)
                                .body("id", notNullValue())
                                .extract().path("id");

                // Get
                given()
                                .when().get("/v1/cards/" + cardId)
                                .then()
                                .statusCode(200)
                                .body("ordinal", is(5));

                // Update
                String updatedCardJson = "{\"ordinal\": 10}";
                given()
                                .contentType(ContentType.JSON)
                                .body(updatedCardJson)
                                .when().put("/v1/cards/" + cardId)
                                .then()
                                .statusCode(200)
                                .body("ordinal", is(10));

                // Delete
                given()
                                .when().delete("/v1/cards/" + cardId)
                                .then()
                                .statusCode(204);
        }
}
