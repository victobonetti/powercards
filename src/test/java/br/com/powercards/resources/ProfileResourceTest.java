package br.com.powercards.resources;

import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;
import static org.hamcrest.Matchers.*;

@QuarkusTest
@TestSecurity(user = "test-user-profile", roles = "user")
public class ProfileResourceTest {

        @Test
        public void testGetProfile() {
                given()
                                .when().get("/v1/profile")
                                .then()
                                .statusCode(200)
                                .body("keycloakId", equalTo("test-user-profile"))
                                .body("id", notNullValue());
        }

        @Test
        public void testGetProfileCreatesUserIfNotExists() {
                // First call should create the user
                given()
                                .when().get("/v1/profile")
                                .then()
                                .statusCode(200)
                                .body("keycloakId", equalTo("test-user-profile"));

                // Second call should return the same user
                given()
                                .when().get("/v1/profile")
                                .then()
                                .statusCode(200)
                                .body("keycloakId", equalTo("test-user-profile"));
        }

        @Test
        public void testUpdateProfile() {
                // Update display name
                given()
                                .contentType(ContentType.JSON)
                                .body("{\"displayName\": \"John Doe\"}")
                                .when().put("/v1/profile")
                                .then()
                                .statusCode(200)
                                .body("displayName", equalTo("John Doe"))
                                .body("keycloakId", equalTo("test-user-profile"));

                // Verify update persisted
                given()
                                .when().get("/v1/profile")
                                .then()
                                .statusCode(200)
                                .body("displayName", equalTo("John Doe"));
        }

        @Test
        public void testUpdateProfileWithDescription() {
                // Update with markdown description (using simple text for JSON)
                String description = "I love flashcards!";
                given()
                                .contentType(ContentType.JSON)
                                .body("{\"displayName\": \"Test User\", \"description\": \"" + description + "\"}")
                                .when().put("/v1/profile")
                                .then()
                                .statusCode(200)
                                .body("description", equalTo(description))
                                .body("displayName", equalTo("Test User"));

                // Verify description persisted
                given()
                                .when().get("/v1/profile")
                                .then()
                                .statusCode(200)
                                .body("description", equalTo(description));
        }

        @Test
        public void testUpdateProfileWithEmptyName() {
                // Update with empty display name should work (clearing the name)
                given()
                                .contentType(ContentType.JSON)
                                .body("{\"displayName\": \"\"}")
                                .when().put("/v1/profile")
                                .then()
                                .statusCode(200);
        }

        @Test
        public void testUpdateProfileWithNullName() {
                given()
                                .contentType(ContentType.JSON)
                                .body("{\"displayName\": null}")
                                .when().put("/v1/profile")
                                .then()
                                .statusCode(200);
        }

        @Test
        @TestSecurity(user = "different-user", roles = "user")
        public void testProfileIsolationBetweenUsers() {
                // Update profile for different-user
                given()
                                .contentType(ContentType.JSON)
                                .body("{\"displayName\": \"Different User\"}")
                                .when().put("/v1/profile")
                                .then()
                                .statusCode(200)
                                .body("displayName", equalTo("Different User"))
                                .body("keycloakId", equalTo("different-user"));
        }

        @Test
        public void testAvatarUploadWithoutFile() {
                given()
                                .contentType("multipart/form-data")
                                .when().post("/v1/profile/avatar")
                                .then()
                                .statusCode(400);
        }

        @Test
        public void testBannerUploadWithoutFile() {
                given()
                                .contentType("multipart/form-data")
                                .when().post("/v1/profile/banner")
                                .then()
                                .statusCode(400);
        }

        @Test
        public void testProfileResponseIncludesAllFields() {
                // First set some values
                given()
                                .contentType(ContentType.JSON)
                                .body("{\"displayName\": \"Full Test\", \"description\": \"Test bio\"}")
                                .when().put("/v1/profile")
                                .then()
                                .statusCode(200);

                // Now verify response has all expected fields
                given()
                                .when().get("/v1/profile")
                                .then()
                                .statusCode(200)
                                .body("id", notNullValue())
                                .body("keycloakId", equalTo("test-user-profile"))
                                .body("displayName", equalTo("Full Test"))
                                .body("description", equalTo("Test bio"))
                                .body("$", hasKey("avatarUrl"))
                                .body("$", hasKey("bannerUrl"))
                                .body("colorPalette", equalTo("tangerine"));
        }

        @Test
        public void testUpdateProfileWithColorPalette() {
                // Update color palette
                given()
                                .contentType(ContentType.JSON)
                                .body("{\"colorPalette\": \"blue\"}")
                                .when().put("/v1/profile")
                                .then()
                                .statusCode(200)
                                .body("colorPalette", equalTo("blue"));

                // Verify persistence
                given()
                                .when().get("/v1/profile")
                                .then()
                                .statusCode(200)
                                .body("colorPalette", equalTo("blue"));
        }

        @Test
        public void testBannerUpload() {
                // Upload a dummy file
                given()
                                .multiPart("file", "banner.txt", "some content".getBytes())
                                .when().post("/v1/profile/banner")
                                .then()
                                .statusCode(200)
                                .body("bannerUrl", notNullValue())
                                .body("bannerUrl", containsString("user-banners/banner-"));
        }

        @Test
        public void testAvatarUpload() {
                // Upload a dummy file
                given()
                                .multiPart("file", "avatar.png", "image data".getBytes())
                                .when().post("/v1/profile/avatar")
                                .then()
                                .statusCode(200)
                                .body("avatarUrl", notNullValue())
                                .body("avatarUrl", containsString("user-avatars/avatar-"));
        }
}
