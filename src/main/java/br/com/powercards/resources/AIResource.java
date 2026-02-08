package br.com.powercards.resources;

import br.com.powercards.services.AIEnhancementService;
import br.com.powercards.services.AIService;
import jakarta.inject.Inject;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;

@Path("/v1/ai")
public class AIResource {

    @Inject
    AIService aiService;

    @Inject
    AIEnhancementService enhancementService;

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
    public java.util.List<String> enhanceModel(java.util.List<String> contents) {
        String input = contents.toString();
        io.quarkus.logging.Log.info("Enhancing model input: " + input);

        java.util.List<String> result = enhancementService.enhanceModel(contents);

        String output = result != null ? result.toString() : "null";
        io.quarkus.logging.Log.info("Enhancing model output: " + output);

        return result;
    }
}
