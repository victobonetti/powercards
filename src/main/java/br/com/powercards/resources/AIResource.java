package br.com.powercards.resources;

import java.util.List;

import br.com.powercards.services.AIService;
import br.com.powercards.services.UserAIProxyService;
import io.quarkus.security.identity.SecurityIdentity;
import jakarta.inject.Inject;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

@Path("/v1/ai")
public class AIResource {

    @Inject
    AIService aiService;

    @Inject
    UserAIProxyService userAIProxyService;

    @Inject
    SecurityIdentity identity;

    @POST
    @Path("/chat")
    @Consumes(MediaType.TEXT_PLAIN)
    @Produces(MediaType.TEXT_PLAIN)
    public String chat(String message) {
        return aiService.chat(message);
    }

    @POST
    @Path("/enhance-model")
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    public Response enhanceModel(java.util.List<String> contents) {
        String keycloakId = identity.getPrincipal().getName();
        io.quarkus.logging.Log.info("Enhancing model for user: " + keycloakId + ", input: " + contents);

        try {
            List<String> result = userAIProxyService.enhanceModel(keycloakId, contents);

            if (result.size() == contents.size()) {
                return Response.ok(result).build();
            }

            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity(java.util.Map.of("error", "AI_RESPONSE_MISMATCH",
                            "message", "AI returned " + result.size() + " fields, expected " + contents.size()))
                    .build();
        } catch (RuntimeException e) {
            if (e.getMessage() != null && (e.getMessage().contains("not configured"))) {
                return Response.status(Response.Status.BAD_REQUEST)
                        .entity(java.util.Map.of("error", "AI_KEY_NOT_CONFIGURED",
                                "message", "Please configure your AI API key in Profile Settings."))
                        .build();
            }
            io.quarkus.logging.Log.error("AI enhancement failed: " + e.getMessage(), e);
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity(java.util.Map.of("error", "AI_ENHANCEMENT_FAILED",
                            "message", e.getMessage()))
                    .build();
        }
    }
}
