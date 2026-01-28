package br.com.powercards.resources;

import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;
import static org.hamcrest.CoreMatchers.is;
import static org.hamcrest.Matchers.greaterThanOrEqualTo;

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
                String deckJson = "{\"id\": 200, \"name\": \"Test Deck JPA\"}";
                given()
                                .contentType(ContentType.JSON)
                                .body(deckJson)
                                .when().post("/v1/decks")
                                .then()
                                .statusCode(201)
                                .body("id", is(200))
                                .body("name", is("Test Deck JPA"));

                // Get
                given()
                                .when().get("/v1/decks/200")
                                .then()
                                .statusCode(200)
                                .body("name", is("Test Deck JPA"));

                // Update
                String updatedDeckJson = "{\"name\": \"Updated Deck Name\"}";
                given()
                                .contentType(ContentType.JSON)
                                .body(updatedDeckJson)
                                .when().put("/v1/decks/200")
                                .then()
                                .statusCode(200)
                                .body("name", is("Updated Deck Name"));

                // Delete
                given()
                                .when().delete("/v1/decks/200")
                                .then()
                                .statusCode(204);

                // Verify deleted
                given()
                                .when().get("/v1/decks/200")
                                .then()
                                .statusCode(404);
        }
}
