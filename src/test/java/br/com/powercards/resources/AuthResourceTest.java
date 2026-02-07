package br.com.powercards.resources;

import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.is;

@QuarkusTest
public class AuthResourceTest {

    @Test
    public void testRegisterEndpointExists() {
        given()
                .contentType(ContentType.JSON)
                .body("{\"username\":\"test\",\"password\":\"test\",\"email\":\"test@test.com\",\"firstName\":\"Test\",\"lastName\":\"User\"}")
                .when().post("/v1/auth/register")
                .then()
                .statusCode(org.hamcrest.Matchers.not(404));
    }

    @Test
    public void testRegisterValidation() {
        given()
                .contentType(ContentType.JSON)
                .body("{}")
                .when().post("/v1/auth/register")
                .then()
                .statusCode(400);
    }
}
