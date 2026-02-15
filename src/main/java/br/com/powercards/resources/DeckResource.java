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

    @jakarta.inject.Inject
    br.com.powercards.security.WorkspaceContext workspaceContext;

    @GET
    @org.eclipse.microprofile.openapi.annotations.Operation(summary = "List all decks")
    public PaginatedResponse<DeckResponse> list(
            @QueryParam("page") @DefaultValue("1") int page,
            @QueryParam("perPage") @DefaultValue("20") int perPage,
            @QueryParam("search") String search,
            @QueryParam("sort") String sort,
            @Context UriInfo uriInfo) {

        if (page < 1)
            page = 1;
        if (perPage < 1)
            perPage = 20;

        io.quarkus.panache.common.Sort sortObj = io.quarkus.panache.common.Sort.by("id");
        if (sort != null && !sort.isBlank()) {
            if (sort.startsWith("-")) {
                sortObj = io.quarkus.panache.common.Sort.descending(sort.substring(1));
            } else {
                sortObj = io.quarkus.panache.common.Sort.ascending(sort);
            }
        }

        io.quarkus.hibernate.orm.panache.PanacheQuery<Deck> query;
        if (search != null && !search.isBlank()) {
            query = Deck.find("lower(name) like ?1", sortObj, "%" + search.toLowerCase() + "%");
        } else {
            query = Deck.findAll(sortObj);
        }

        long total = query.count();
        List<Deck> decks = query.page(page - 1, perPage).list();
        List<DeckResponse> data = decks.stream()
                .map(d -> {
                    long newCards = d.cards.stream().filter(c -> c.queue == 0).count();
                    long learningCards = d.cards.stream().filter(c -> c.queue == 1 || c.queue == 3).count();
                    long reviewCards = d.cards.stream().filter(c -> c.queue == 2).count();
                    // Simplified due count: learning + review (can be refined with due date logic
                    // later)
                    long dueCards = learningCards + reviewCards;
                    long totalCards = d.cards.size();
                    Long lastStudied = d.cards.stream()
                            .map(c -> c.mod)
                            .max(Long::compare)
                            .orElse(null);
                    return new DeckResponse(d.id, d.name, totalCards, newCards, learningCards, reviewCards, dueCards,
                            totalCards, lastStudied);
                }).toList();

        long totalPages = (total + perPage - 1) / perPage;
        if (totalPages == 0)
            totalPages = 1;

        String nextPageUri = null;
        if (page < totalPages) {
            var builder = uriInfo.getAbsolutePathBuilder()
                    .queryParam("page", page + 1)
                    .queryParam("perPage", perPage);
            if (search != null)
                builder.queryParam("search", search);
            if (sort != null)
                builder.queryParam("sort", sort);
            nextPageUri = builder.build().toString();
        }

        var lastPageBuilder = uriInfo.getAbsolutePathBuilder()
                .queryParam("page", totalPages)
                .queryParam("perPage",
                        perPage);
        if (search != null)
            lastPageBuilder.queryParam("search", search);
        if (sort != null)
            lastPageBuilder.queryParam("sort", sort);
        String lastPageUri = lastPageBuilder.build().toString();

        PaginationMeta meta = new PaginationMeta(total, page, nextPageUri,
                lastPageUri);
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
        long newCards = deck.cards.stream().filter(c -> c.queue == 0).count();
        long learningCards = deck.cards.stream().filter(c -> c.queue == 1 || c.queue == 3).count();
        long reviewCards = deck.cards.stream().filter(c -> c.queue == 2).count();
        long dueCards = learningCards + reviewCards;
        long totalCards = deck.cards.size();
        Long lastStudied = deck.cards.stream()
                .map(c -> c.mod)
                .max(Long::compare)
                .orElse(null);
        return new DeckResponse(deck.id, deck.name, totalCards, newCards, learningCards, reviewCards, dueCards,
                totalCards, lastStudied);
    }

    @POST
    @Transactional
    @org.eclipse.microprofile.openapi.annotations.Operation(summary = "Create a new deck")
    @org.eclipse.microprofile.openapi.annotations.responses.APIResponse(responseCode = "201", description = "Deck created")
    public Response create(DeckRequest deckRequest) {
        br.com.powercards.model.Workspace currentWorkspace = workspaceContext.getWorkspace();
        if (currentWorkspace == null) {
            throw new BadRequestException("Invalid or missing Workspace ID");
        }
        Deck deck = new Deck();
        deck.workspace = currentWorkspace;
        deck.name = deckRequest.name();
        deck.persist();
        return Response.status(Response.Status.CREATED)
                .entity(new DeckResponse(deck.id, deck.name, 0, 0, 0, 0, 0, 0, null))
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
        long newCards = entity.cards.stream().filter(c -> c.queue == 0).count();
        long learningCards = entity.cards.stream().filter(c -> c.queue == 1 || c.queue == 3).count();
        long reviewCards = entity.cards.stream().filter(c -> c.queue == 2).count();
        long dueCards = learningCards + reviewCards;
        long totalCards = entity.cards.size();
        Long lastStudied = entity.cards.stream()
                .map(c -> c.mod)
                .max(Long::compare)
                .orElse(null);
        return new DeckResponse(entity.id, entity.name, totalCards, newCards, learningCards, reviewCards, dueCards,
                totalCards, lastStudied);
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
