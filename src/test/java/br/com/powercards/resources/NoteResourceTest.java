package br.com.powercards.resources;

import br.com.powercards.model.Card;
import br.com.powercards.model.Note;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.transaction.Transactional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;

@QuarkusTest
public class NoteResourceTest {

        @BeforeEach
        @Transactional
        void setUp() {
                // Card.deleteAll();
                // Note.deleteAll();
                /*
                 * for (int i = 0; i < 15; i++) {
                 * Note note = new Note();
                 * note.flds = "Note " + i + (i % 2 == 0 ? " even" : " odd");
                 * note.tags = "tag" + i;
                 * note.persist();
                 * }
                 */
        }

        @Test
        public void testListPagination() {
                given()
                                .queryParam("page", 1)
                                .queryParam("perPage", 10)
                                .when().get("/v1/notes")
                                .then()
                                .statusCode(200)
                                .body("data.size()", is(10))
                                .body("pagination.total", is(15))
                                .body("pagination.page", is(1));

                given()
                                .queryParam("page", 2)
                                .queryParam("perPage", 10)
                                .when().get("/v1/notes")
                                .then()
                                .statusCode(200)
                                .body("data.size()", is(5))
                                .body("pagination.page", is(2));
        }

        @Test
        public void testListSearch() {
                // Search by content
                given()
                                .queryParam("search", "even")
                                .when().get("/v1/notes")
                                .then()
                                .statusCode(200)
                                .body("data.size()", is(8)); // 0, 2, ... 14 -> 8 numbers

                // Search by tag
                given()
                                .queryParam("search", "tag=tag1")
                                .when().get("/v1/notes")
                                .then()
                                .statusCode(200)
                                .body("data[0].tags", is("tag1"));
        }

        @Test
        public void testListSort() {
                // Sort by id desc
                given()
                                .queryParam("sort", "-id")
                                .when().get("/v1/notes")
                                .then()
                                .statusCode(200)
                                .body("data[0].fields", containsString("Note 14"));
        }

        @Test
        @Transactional
        public void testUpdateNoteFields() {
                // Create a note first
                Note note = new Note();
                note.flds = "Original Fields";
                note.tags = "original";
                note.persist();

                Long noteId = note.id;

                // Update flds
                given()
                                .contentType("application/json")
                                .body("{\"fields\": \"Updated Fields\", \"tags\": \"original\"}")
                                .when().put("/v1/notes/" + noteId)
                                .then()
                                .statusCode(200)
                                .body("fields", is("Updated Fields"));

                // Verify persistence
                given()
                                .when().get("/v1/notes/" + noteId)
                                .then()
                                .statusCode(200)
                                .body("fields", is("Updated Fields"));
        }
}
