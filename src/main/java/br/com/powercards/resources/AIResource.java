package br.com.powercards.resources;

import br.com.powercards.services.AIService;
import jakarta.inject.Inject;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;

@Path("/ai")
public class AIResource {

    @Inject
    AIService aiService;

    @POST
    @Path("/chat")
    @Consumes(MediaType.TEXT_PLAIN)
    @Produces(MediaType.TEXT_PLAIN)
    public String chat(String message) {
        return aiService.chat(message);
    }
}
