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

    @Transactional
    void createTags(int count) {
        for (int i = 0; i < count; i++) {
            Tag t = new Tag();
            t.name = "generated_" + i;
            t.persist();
        }
    }
}
