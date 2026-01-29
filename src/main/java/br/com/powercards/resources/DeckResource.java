package br.com.powercards.resources;

import br.com.powercards.model.Deck;
import br.com.powercards.dto.DeckRequest;
import br.com.powercards.dto.DeckResponse;
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
    public List<DeckResponse> list() {
        return Deck.<Deck>listAll().stream()
                .map(d -> new DeckResponse(d.id, d.name))
                .toList();
    }

    @GET
    @Path("/{id}")
    @org.eclipse.microprofile.openapi.annotations.Operation(summary = "Get a deck by ID")
    @org.eclipse.microprofile.openapi.annotations.responses.APIResponse(responseCode = "200", description = "Deck found")
    @org.eclipse.microprofile.openapi.annotations.responses.APIResponse(responseCode = "404", description = "Deck not found")
    public DeckResponse get(@PathParam("id") Long id) {
        Deck deck = Deck.findById(id);
        if (deck == null) {
            throw new NotFoundException();
        }
        return new DeckResponse(deck.id, deck.name);
    }

    @POST
    @Transactional
    @org.eclipse.microprofile.openapi.annotations.Operation(summary = "Create a new deck")
    @org.eclipse.microprofile.openapi.annotations.responses.APIResponse(responseCode = "201", description = "Deck created")
    public Response create(DeckRequest deckRequest) {
        Deck deck = new Deck();
        deck.name = deckRequest.name();
        deck.persist();
        return Response.status(Response.Status.CREATED)
                .entity(new DeckResponse(deck.id, deck.name))
                .build();
    }

    @PUT
    @Path("/{id}")
    @Transactional
    @org.eclipse.microprofile.openapi.annotations.Operation(summary = "Update an existing deck")
    @org.eclipse.microprofile.openapi.annotations.responses.APIResponse(responseCode = "200", description = "Deck updated")
    @org.eclipse.microprofile.openapi.annotations.responses.APIResponse(responseCode = "404", description = "Deck not found")
    public DeckResponse update(@PathParam("id") Long id, DeckRequest deckRequest) {
        Deck entity = Deck.findById(id);
        if (entity == null) {
            throw new NotFoundException();
        }
        entity.name = deckRequest.name();
        return new DeckResponse(entity.id, entity.name);
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
