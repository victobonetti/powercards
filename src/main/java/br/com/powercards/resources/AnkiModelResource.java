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
    public List<AnkiModel> list() {
        return AnkiModel.listAll();
    }

    @GET
    @Path("/{id}")
    public AnkiModel get(@PathParam("id") Long id) {
        AnkiModel model = AnkiModel.findById(id);
        if (model == null) {
            throw new NotFoundException();
        }
        return model;
    }

    @POST
    @Transactional
    public Response create(AnkiModel model) {
        model.persist();
        return Response.status(Response.Status.CREATED).entity(model).build();
    }

    @PUT
    @Path("/{id}")
    @Transactional
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
    public void delete(@PathParam("id") Long id) {
        AnkiModel entity = AnkiModel.findById(id);
        if (entity == null) {
            throw new NotFoundException();
        }
        entity.delete();
    }
}
