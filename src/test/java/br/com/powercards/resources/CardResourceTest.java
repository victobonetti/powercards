package br.com.powercards.resources;

import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;
import static org.hamcrest.CoreMatchers.is;

@QuarkusTest
public class CardResourceTest {

        @Test
        public void testCardCRUD() {
                // Dependency: Deck
                given()
                                .contentType(ContentType.JSON)
                                .body("{\"id\": 502, \"name\": \"Card Deck\"}")
                                .post("/v1/decks");

                // Dependency: Model and Note
                given()
                                .contentType(ContentType.JSON)
                                .body("{\"id\": 503, \"name\": \"Card Model\"}")
                                .post("/v1/models");
                given()
                                .contentType(ContentType.JSON)
                                .body("{\"id\": 501, \"model\": {\"id\": 503}, \"flds\": \"F\\u001fB\"}")
                                .post("/v1/notes");

                // Create Card
                String cardJson = "{\"id\": 500, \"note\": {\"id\": 501}, \"deck\": {\"id\": 502}, \"ord\": 0}";
                given()
                                .contentType(ContentType.JSON)
                                .body(cardJson)
                                .when().post("/v1/cards")
                                .then()
                                .statusCode(201)
                                .body("id", is(500));

                // Get
                given()
                                .when().get("/v1/cards/500")
                                .then()
                                .statusCode(200)
                                .body("ord", is(0));

                // Update
                String updatedCardJson = "{\"id\": 500, \"ord\": 1}";
                given()
                                .contentType(ContentType.JSON)
                                .body(updatedCardJson)
                                .when().put("/v1/cards/500")
                                .then()
                                .statusCode(200)
                                .body("ord", is(1));

                // Delete
                given()
                                .when().delete("/v1/cards/500")
                                .then()
                                .statusCode(204);
        }
}
