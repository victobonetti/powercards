package br.com.powercards;

import br.com.powercards.services.AnkiService;
import jakarta.inject.Inject;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.jboss.resteasy.reactive.RestForm;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.InputStream;

@Path("/v1/anki")
public class GreetingResource {

    Logger logger = LoggerFactory.getLogger(GreetingResource.class);

    @Inject
    AnkiService anki;

    @POST
    @Path("/upload")
    @Consumes(MediaType.MULTIPART_FORM_DATA)
    @Produces(MediaType.APPLICATION_JSON)
    public Response upload(@RestForm("file") InputStream file) {
        anki.load(file);
        return Response.ok(anki.getDecks()).build();
    }
}
