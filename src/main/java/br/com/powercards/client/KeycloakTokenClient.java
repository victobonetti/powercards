package br.com.powercards.client;

import br.com.powercards.dto.TokenResponse;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.FormParam;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import org.eclipse.microprofile.rest.client.inject.RegisterRestClient;

@Path("/realms")
@RegisterRestClient(configKey = "keycloak-token-api")
public interface KeycloakTokenClient {

        @POST
        @Path("/{realm}/protocol/openid-connect/token")
        @Consumes(MediaType.APPLICATION_FORM_URLENCODED)
        @Produces(MediaType.APPLICATION_JSON)
        TokenResponse getAccessToken(
                        @jakarta.ws.rs.PathParam("realm") String realm,
                        @FormParam("client_id") String clientId,
                        @FormParam("username") String username,
                        @FormParam("password") String password,
                        @FormParam("grant_type") String grantType);

        @POST
        @Path("/{realm}/protocol/openid-connect/token")
        @Consumes(MediaType.APPLICATION_FORM_URLENCODED)
        @Produces(MediaType.APPLICATION_JSON)
        TokenResponse refreshAccessToken(
                        @jakarta.ws.rs.PathParam("realm") String realm,
                        @FormParam("client_id") String clientId,
                        @FormParam("refresh_token") String refreshToken,
                        @FormParam("grant_type") String grantType);

        @POST
        @Path("/{realm}/protocol/openid-connect/token")
        @Consumes(MediaType.APPLICATION_FORM_URLENCODED)
        @Produces(MediaType.APPLICATION_JSON)
        TokenResponse exchangeCode(
                        @jakarta.ws.rs.PathParam("realm") String realm,
                        @FormParam("client_id") String clientId,
                        @FormParam("code") String code,
                        @FormParam("redirect_uri") String redirectUri,
                        @FormParam("grant_type") String grantType);
}
