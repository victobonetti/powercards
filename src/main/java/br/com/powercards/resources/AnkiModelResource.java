package br.com.powercards.resources;

import br.com.powercards.model.AnkiModel;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.util.List;

@Path("/v1/models")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class AnkiModelResource {

    @GET
    @org.eclipse.microprofile.openapi.annotations.Operation(summary = "List all Anki models")
    public List<AnkiModel> list() {
        return AnkiModel.listAll();
    }

    @GET
    @Path("/{id}")
    @org.eclipse.microprofile.openapi.annotations.Operation(summary = "Get an Anki model by ID")
    @org.eclipse.microprofile.openapi.annotations.responses.APIResponse(responseCode = "200", description = "Model found")
    @org.eclipse.microprofile.openapi.annotations.responses.APIResponse(responseCode = "404", description = "Model not found")
    public AnkiModel get(@PathParam("id") Long id) {
        AnkiModel model = AnkiModel.findById(id);
        if (model == null) {
            throw new NotFoundException();
        }
        return model;
    }

    @POST
    @Transactional
    @org.eclipse.microprofile.openapi.annotations.Operation(summary = "Create a new Anki model")
    @org.eclipse.microprofile.openapi.annotations.responses.APIResponse(responseCode = "201", description = "Model created")
    public Response create(AnkiModel model) {
        model.persist();
        return Response.status(Response.Status.CREATED).entity(model).build();
    }

    @PUT
    @Path("/{id}")
    @Transactional
    @org.eclipse.microprofile.openapi.annotations.Operation(summary = "Update an existing Anki model")
    @org.eclipse.microprofile.openapi.annotations.responses.APIResponse(responseCode = "200", description = "Model updated")
    @org.eclipse.microprofile.openapi.annotations.responses.APIResponse(responseCode = "404", description = "Model not found")
    public AnkiModel update(@PathParam("id") Long id, AnkiModel model) {
        AnkiModel entity = AnkiModel.findById(id);
        if (entity == null) {
            throw new NotFoundException();
        }
        entity.name = model.name;
        entity.css = model.css;
        // Fields and Templates are cascaded, but updating them might require more
        // logic.
        // For simplicity in this CRUD, we just update the main model info.
        return entity;
    }

    @DELETE
    @Path("/{id}")
    @Transactional
    @org.eclipse.microprofile.openapi.annotations.Operation(summary = "Delete an Anki model")
    @org.eclipse.microprofile.openapi.annotations.responses.APIResponse(responseCode = "204", description = "Model deleted")
    @org.eclipse.microprofile.openapi.annotations.responses.APIResponse(responseCode = "404", description = "Model not found")
    public void delete(@PathParam("id") Long id) {
        AnkiModel entity = AnkiModel.findById(id);
        if (entity == null) {
            throw new NotFoundException();
        }
        entity.delete();
    }
}
