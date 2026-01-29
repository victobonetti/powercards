package br.com.powercards.resources;

import br.com.powercards.model.Deck;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.util.List;

@Path("/v1/decks")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class DeckResource {

    @GET
    @org.eclipse.microprofile.openapi.annotations.Operation(summary = "List all decks")
    public List<Deck> list() {
        return Deck.listAll();
    }

    @GET
    @Path("/{id}")
    @org.eclipse.microprofile.openapi.annotations.Operation(summary = "Get a deck by ID")
    @org.eclipse.microprofile.openapi.annotations.responses.APIResponse(responseCode = "200", description = "Deck found")
    @org.eclipse.microprofile.openapi.annotations.responses.APIResponse(responseCode = "404", description = "Deck not found")
    public Deck get(@PathParam("id") Long id) {
        Deck deck = Deck.findById(id);
        if (deck == null) {
            throw new NotFoundException();
        }
        return deck;
    }

    @POST
    @Transactional
    @org.eclipse.microprofile.openapi.annotations.Operation(summary = "Create a new deck")
    @org.eclipse.microprofile.openapi.annotations.responses.APIResponse(responseCode = "201", description = "Deck created")
    public Response create(Deck deck) {
        deck.persist();
        return Response.status(Response.Status.CREATED).entity(deck).build();
    }

    @PUT
    @Path("/{id}")
    @Transactional
    @org.eclipse.microprofile.openapi.annotations.Operation(summary = "Update an existing deck")
    @org.eclipse.microprofile.openapi.annotations.responses.APIResponse(responseCode = "200", description = "Deck updated")
    @org.eclipse.microprofile.openapi.annotations.responses.APIResponse(responseCode = "404", description = "Deck not found")
    public Deck update(@PathParam("id") Long id, Deck deck) {
        Deck entity = Deck.findById(id);
        if (entity == null) {
            throw new NotFoundException();
        }
        entity.name = deck.name;
        return entity;
    }

    @DELETE
    @Path("/{id}")
    @Transactional
    @org.eclipse.microprofile.openapi.annotations.Operation(summary = "Delete a deck")
    @org.eclipse.microprofile.openapi.annotations.responses.APIResponse(responseCode = "204", description = "Deck deleted")
    @org.eclipse.microprofile.openapi.annotations.responses.APIResponse(responseCode = "404", description = "Deck not found")
    public void delete(@PathParam("id") Long id) {
        Deck entity = Deck.findById(id);
        if (entity == null) {
            throw new NotFoundException();
        }
        entity.delete();
    }
}
