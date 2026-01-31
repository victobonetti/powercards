package br.com.powercards.resources;

import br.com.powercards.model.Note;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;
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
                Note.deleteAll();
                for (int i = 0; i < 15; i++) {
                        Note note = new Note();
                        note.flds = "Note " + i;
                        note.tags = "tag" + i;
                        note.persist();
                }
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
}
