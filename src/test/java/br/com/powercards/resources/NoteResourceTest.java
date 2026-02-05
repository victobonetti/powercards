package br.com.powercards.resources;

import br.com.powercards.model.Card;
import br.com.powercards.model.Note;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import jakarta.transaction.Transactional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;

@QuarkusTest
@TestSecurity(user = "test-user", roles = "user")
public class NoteResourceTest {

        private br.com.powercards.model.Workspace workspace;

        @BeforeEach
        @Transactional
        void setUp() {
                br.com.powercards.domain.entities.AnkiMedia.deleteAll();
                br.com.powercards.model.Card.deleteAll();
                Note.deleteAll();
                br.com.powercards.model.Deck.deleteAll();
                br.com.powercards.model.AnkiTemplate.deleteAll();
                br.com.powercards.model.AnkiField.deleteAll();
                br.com.powercards.model.AnkiModel.deleteAll();
                br.com.powercards.model.Tag.deleteAll();
                br.com.powercards.model.Workspace.deleteAll();

                workspace = new br.com.powercards.model.Workspace();
                workspace.name = "Test Workspace";
                workspace.persist();

                for (int i = 0; i < 15; i++) {
                        Note note = new Note();
                        note.flds = "Note " + i + (i % 2 == 0 ? " even" : " odd");
                        note.tags = "tag" + i;
                        note.workspace = workspace;
                        note.persist();
                }
        }

        @Test
        public void testListPagination() {
                given()
                                .header("X-Workspace-Id", workspace.id)
                                .queryParam("page", 1)
                                .queryParam("perPage", 10)
                                .when().get("/v1/notes")
                                .then()
                                .statusCode(200)
                                .body("data.size()", is(10))
                                .body("pagination.total", is(15))
                                .body("pagination.page", is(1));

                given()
                                .header("X-Workspace-Id", workspace.id)
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
                                .header("X-Workspace-Id", workspace.id)
                                .queryParam("search", "even")
                                .when().get("/v1/notes")
                                .then()
                                .statusCode(200)
                                .body("data.size()", is(8)); // 0, 2, ... 14 -> 8 numbers

                // Search by tag
                given()
                                .header("X-Workspace-Id", workspace.id)
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
                                .header("X-Workspace-Id", workspace.id)
                                .queryParam("sort", "-id")
                                .when().get("/v1/notes")
                                .then()
                                .statusCode(200)
                                .body("data[0].fields", containsString("Note 14"));
        }

        @Test
        public void testUpdateNoteFields() {
                // Use an existing note
                Note note = Note.<Note>listAll().get(0);
                Long noteId = note.id;

                // Update flds
                given()
                                .header("X-Workspace-Id", workspace.id)
                                .contentType("application/json")
                                .body("{\"fields\": \"Updated Fields\", \"tags\": \"original\"}")
                                .when().put("/v1/notes/" + noteId)
                                .then()
                                .statusCode(200)
                                .body("fields", is("Updated Fields"));

                // Verify persistence
                given()
                                .header("X-Workspace-Id", workspace.id)
                                .when().get("/v1/notes/" + noteId)
                                .then()
                                .statusCode(200)
                                .body("fields", is("Updated Fields"));
        }

        @Test
        public void testBulkTags() {
                java.util.List<Note> notes = Note.listAll();
                Note n1 = notes.get(1);
                Note n2 = notes.get(2);

                given()
                                .header("X-Workspace-Id", workspace.id)
                                .contentType("application/json")
                                .body("{\"noteIds\": [" + n1.id + ", " + n2.id + "], \"tags\": [\"bulk1\", \"bulk2\"]}")
                                .when().post("/v1/notes/bulk/tags")
                                .then()
                                .statusCode(204);
        }

        @Test
        public void testBulkDelete() {
                java.util.List<Note> notes = Note.listAll();
                Note n1 = notes.get(3);
                Note n2 = notes.get(4);

                given()
                                .header("X-Workspace-Id", workspace.id)
                                .contentType("application/json")
                                .body("{\"ids\": [" + n1.id + ", " + n2.id + "]}")
                                .when().post("/v1/notes/bulk/delete")
                                .then()
                                .statusCode(204);

                given()
                                .header("X-Workspace-Id", workspace.id)
                                .when().get("/v1/notes/" + n1.id)
                                .then()
                                .statusCode(404);
        }
}
