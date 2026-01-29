package br.com.powercards.resources;

import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;
import static org.hamcrest.CoreMatchers.is;
import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.notNullValue;

@QuarkusTest
public class DeckResourceTest {

        @Test
        public void testDeckCRUD() {
                // List
                given()
                                .when().get("/v1/decks")
                                .then()
                                .statusCode(200)
                                .body("size()", greaterThanOrEqualTo(0));

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
