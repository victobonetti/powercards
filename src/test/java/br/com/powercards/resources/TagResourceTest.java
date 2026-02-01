package br.com.powercards.resources;

import br.com.powercards.model.Tag;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.transaction.Transactional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;
import static org.hamcrest.CoreMatchers.hasItem;
import static org.hamcrest.CoreMatchers.is;
import static org.hamcrest.Matchers.empty;

@QuarkusTest
public class TagResourceTest {

    @BeforeEach
    @Transactional
    void setUp() {
        br.com.powercards.model.Note.deleteAll();
        Tag.deleteAll();

        Tag t1 = new Tag();
        t1.name = "urgent";
        t1.persist();

        Tag t2 = new Tag();
        t2.name = "important";
        t2.persist();

        Tag t3 = new Tag();
        t3.name = "waiting";
        t3.persist();
    }

    @Test
    public void testListSearch() {
        given()
                .queryParam("search", "urg")
                .when().get("/v1/tags")
                .then()
                .statusCode(200)
                .body("size()", is(1))
                .body("name", hasItem("urgent"));

        given()
                .queryParam("search", "nt")
                .when().get("/v1/tags")
                .then()
                .statusCode(200)
                .body("size()", is(2)); // urgent, important
    }

    @Test
    public void testListLimit() {
        // Create more tags
        createTags(15);

        given()
                .when().get("/v1/tags")
                .then()
                .statusCode(200)
                .body("size()", is(10));
    }

    @Test
    public void testTagStats() {
        // Create notes with tags
        createNoteWithTags("urgent", "important");
        createNoteWithTags("urgent");
        createNoteWithTags("other");

        given()
                .when().get("/v1/tags/stats")
                .then()
                .statusCode(200)
                .body("data.find { it.name == 'urgent' }.noteCount", is(2))
                .body("data.find { it.name == 'important' }.noteCount", is(1))
                .body("data.find { it.name == 'waiting' }.noteCount", is(0));
    }

    @Test
    public void testDeleteTagCascade() {
        createNoteWithTags("urgent", "important");

        Tag tag = Tag.find("name", "urgent").firstResult();

        given()
                .when().delete("/v1/tags/" + tag.id)
                .then()
                .statusCode(204);

        // Verify tag is gone from Note
        br.com.powercards.model.Note note = br.com.powercards.model.Note.findAll().firstResult();
        // The tag "urgent" should be removed. "important" should remain.
        // Logic implemented: TRIM(REPLACE(concat(' ', n.tags, ' '), concat(' ',
        // :tagName, ' '), ' '))
        // " urgent important " -> replace " urgent " with " " -> " important " -> trim
        // -> "important"
        assert !note.tags.contains("urgent");
        assert note.tags.contains("important");
    }

    @Transactional
    void createNoteWithTags(String... tags) {
        br.com.powercards.model.Note note = new br.com.powercards.model.Note();
        note.tags = String.join(" ", tags);
        note.model = new br.com.powercards.model.AnkiModel();
        note.model.persist(); // simple persist
        note.persist();
    }

    @Transactional
    void createTags(int count) {
        for (int i = 0; i < count; i++) {
            Tag t = new Tag();
            t.name = "generated_" + i;
            t.persist();
        }
    }
}
