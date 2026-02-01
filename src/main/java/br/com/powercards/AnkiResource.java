package br.com.powercards;

import br.com.powercards.services.AnkiService;
import jakarta.inject.Inject;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.jboss.resteasy.reactive.RestForm;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import br.com.powercards.dto.DeckResponse;
import java.io.InputStream;

@Path("/v1/anki")
public class AnkiResource {

    Logger logger = LoggerFactory.getLogger(AnkiResource.class);

    @Inject
    AnkiService anki;

    @POST
    @Path("/upload")
    @Consumes(MediaType.MULTIPART_FORM_DATA)
    @Produces(MediaType.APPLICATION_JSON)
    @org.eclipse.microprofile.openapi.annotations.Operation(summary = "Upload Anki package", description = "Uploads an .apkg file and returns the loaded decks.")
    @org.eclipse.microprofile.openapi.annotations.responses.APIResponse(responseCode = "200", description = "File uploaded successfully")
    @org.eclipse.microprofile.openapi.annotations.responses.APIResponse(responseCode = "400", description = "No file provided")
    public Response upload(@RestForm("file") InputStream file) {
        logger.info("Recebendo requisição de upload de arquivo .apkg...");
        if (file == null) {
            logger.warn("Arquivo .apkg não fornecido na requisição.");
            return Response.status(400).build();
        }

        anki.load(file);
        Response response = Response.ok(anki.getDecks().stream()
                .map(d -> new DeckResponse(d.id, d.name, d.cards.size()))
                .collect(java.util.stream.Collectors.toList())).build();

        logger.info("Upload e processamento do arquivo .apkg finalizados com sucesso.");
        return response;
    }
}
