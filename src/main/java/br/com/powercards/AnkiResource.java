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

import java.io.InputStream;
import java.util.List;

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
    public Response upload(@RestForm("file") InputStream file, @RestForm("force") boolean force) {
        logger.info("Recebendo requisição de upload de arquivo .apkg... Force: " + force);
        if (file == null) {
            logger.warn("Arquivo .apkg não fornecido na requisição.");
            return Response.status(400).build();
        }

        anki.load(file);
        br.com.powercards.dto.ImportResponse importResponse = anki.getDecks(force);
        Response response = Response.ok(importResponse).build();

        logger.info("Upload e processamento do arquivo .apkg finalizados com sucesso.");
        return response;
    }

    @POST
    @Path("/export")
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_OCTET_STREAM)
    @org.eclipse.microprofile.openapi.annotations.Operation(summary = "Export Anki package", description = "Exports selected decks to an .apkg file.")
    public Response export(List<Long> deckIds) {
        logger.info("Exporting decks with IDs: " + deckIds);
        try {
            java.io.File apkgFile = anki.exportDecks(deckIds);

            return Response.ok(apkgFile)
                    .header("Content-Disposition", "attachment; filename=\"export.apkg\"")
                    .build();
        } catch (Exception e) {
            logger.error("Error exporting decks", e);
            return Response.serverError().entity("Failed to export decks: " + e.getMessage()).build();
        }
    }
}
