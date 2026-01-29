package br.com.powercards.resources;

import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;
import static org.hamcrest.CoreMatchers.is;
import static org.hamcrest.Matchers.notNullValue;

@QuarkusTest
public class CardResourceTest {

        @Test
        public void testCardCRUD() {
                // Dependency: Deck
                Integer deckId = given()
                                .contentType(ContentType.JSON)
                                .body("{\"name\": \"Card Deck\"}")
                                .post("/v1/decks")
                                .then().extract().path("id");

                // Dependency: Model and Note
                Integer modelId = given()
                                .contentType(ContentType.JSON)
                                .body("{\"name\": \"Card Model\"}")
                                .post("/v1/models")
                                .then().extract().path("id");
                Integer noteId = given()
                                .contentType(ContentType.JSON)
                                .body("{\"modelId\": " + modelId + ", \"flds\": \"F\\u001fB\"}")
                                .post("/v1/notes")
                                .then().extract().path("id");

                // Create Card
                String cardJson = "{\"noteId\": " + noteId + ", \"deckId\": " + deckId + ", \"ord\": 0}";
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
                                .body("ord", is(0));

                // Update
                String updatedCardJson = "{\"ord\": 1}";
                given()
                                .contentType(ContentType.JSON)
                                .body(updatedCardJson)
                                .when().put("/v1/cards/" + cardId)
                                .then()
                                .statusCode(200)
                                .body("ord", is(1));

                // Delete
                given()
                                .when().delete("/v1/cards/" + cardId)
                                .then()
                                .statusCode(204);
        }
}
