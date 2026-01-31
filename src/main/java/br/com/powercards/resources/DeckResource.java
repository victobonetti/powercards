package br.com.powercards.resources;

import br.com.powercards.model.Deck;
import br.com.powercards.dto.DeckRequest;
import br.com.powercards.dto.DeckResponse;
import br.com.powercards.dto.PaginatedResponse;
import br.com.powercards.dto.PaginationMeta;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.Context;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.core.UriInfo;
import java.util.List;

@Path("/v1/decks")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class DeckResource {

    @GET
    @org.eclipse.microprofile.openapi.annotations.Operation(summary = "List all decks")
    public PaginatedResponse<DeckResponse> list(
            @QueryParam("page") @DefaultValue("1") int page,
            @QueryParam("perPage") @DefaultValue("20") int perPage,
            @Context UriInfo uriInfo) {

        if (page < 1)
            page = 1;
        if (perPage < 1)
            perPage = 20;

        long total = Deck.count();
        List<Deck> decks = Deck.findAll().page(page - 1, perPage).list();
        List<DeckResponse> data = decks.stream()
                .map(d -> new DeckResponse(d.id, d.name))
                .toList();

        long totalPages = (total + perPage - 1) / perPage;
        if (totalPages == 0)
            totalPages = 1;

        String nextPageUri = null;
        if (page < totalPages) {
            nextPageUri = uriInfo.getAbsolutePathBuilder()
                    .queryParam("page", page + 1)
                    .queryParam("perPage", perPage)
                    .build()
                    .toString();
        }

        String lastPageUri = uriInfo.getAbsolutePathBuilder()
                .queryParam("page", totalPages)
                .queryParam("perPage", perPage)
                .build()
                .toString();

        PaginationMeta meta = new PaginationMeta(total, page, nextPageUri, lastPageUri);
        return new PaginatedResponse<>(meta, data);
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
