package br.com.powercards.resources;

import br.com.powercards.model.Card;
import br.com.powercards.model.Deck;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;
import jakarta.transaction.Transactional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;
import static org.hamcrest.CoreMatchers.is;
import static org.hamcrest.Matchers.notNullValue;

@QuarkusTest
public class DeckResourceTest {

        @BeforeEach
        @Transactional
        void setUp() {
                Card.deleteAll();
                Deck.deleteAll();
                Deck deck1 = new Deck();
                deck1.name = "Alpha Deck";
                deck1.persist();

                Deck deck2 = new Deck();
                deck2.name = "Beta Deck";
                deck2.persist();

                Deck deck3 = new Deck();
                deck3.name = "Gamma Deck";
                deck3.persist();
        }

        @Test
        public void testListSearch() {
                given()
                                .queryParam("search", "alpha")
                                .when().get("/v1/decks")
                                .then()
                                .statusCode(200)
                                .body("data.size()", is(1))
                                .body("data[0].name", is("Alpha Deck"));

                given()
                                .queryParam("search", "deck")
                                .when().get("/v1/decks")
                                .then()
                                .statusCode(200)
                                .body("data.size()", is(3));
        }

        @Test
        public void testListSort() {
                // Sort by name ascending
                given()
                                .queryParam("sort", "name")
                                .when().get("/v1/decks")
                                .then()
                                .statusCode(200)
                                .body("data[0].name", is("Alpha Deck"))
                                .body("data[2].name", is("Gamma Deck"));

                // Sort by name descending
                given()
                                .queryParam("sort", "-name")
                                .when().get("/v1/decks")
                                .then()
                                .statusCode(200)
                                .body("data[0].name", is("Gamma Deck"))
                                .body("data[2].name", is("Alpha Deck"));
        }

        @Test
        public void testDeckCRUD() {
                // Create
                String deckJson = "{\"name\": \"Test Deck JPA\"}";
                Integer deckId = given()
                                .contentType(ContentType.JSON)
                                .body(deckJson)
                                .when().post("/v1/decks")
                                .then()
                                .statusCode(201)
                                .body("id", notNullValue())
                                .body("name", is("Test Deck JPA"))
                                .extract().path("id");

                // Get
                given()
                                .when().get("/v1/decks/" + deckId)
                                .then()
                                .statusCode(200)
                                .body("name", is("Test Deck JPA"));

                // Update
                String updatedDeckJson = "{\"name\": \"Updated Deck Name\"}";
                given()
                                .contentType(ContentType.JSON)
                                .body(updatedDeckJson)
                                .when().put("/v1/decks/" + deckId)
                                .then()
                                .statusCode(200)
                                .body("name", is("Updated Deck Name"));

                // Delete
                given()
                                .when().delete("/v1/decks/" + deckId)
                                .then()
                                .statusCode(204);

                // Verify deleted
                given()
                                .when().get("/v1/decks/" + deckId)
                                .then()
                                .statusCode(404);
        }
}
