package br.com.powercards.resources;

import br.com.powercards.dto.WorkspaceRequest;
import br.com.powercards.dto.WorkspaceResponse;
import br.com.powercards.model.Workspace;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.util.List;

import java.util.stream.Collectors;

@Path("/v1/workspaces")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class WorkspaceResource {

    @GET
    public List<WorkspaceResponse> list() {
        List<Workspace> list = Workspace.listAll();
        return list.stream()
                .map(w -> new WorkspaceResponse(w.id.toString(), w.name))
                .collect(Collectors.toList());
    }

    @POST
    @Transactional
    public Response create(WorkspaceRequest request) {
        if (request.name() == null || request.name().isBlank()) {
            throw new BadRequestException("Name is required");
        }
        Workspace w = new Workspace(request.name());
        w.persist();
        return Response.status(Response.Status.CREATED)
                .entity(new WorkspaceResponse(w.id.toString(), w.name))
                .build();
    }

    @DELETE
    @Path("/{id}")
    @Transactional
    public void delete(@PathParam("id") String id) {
        try {
            Long longId = Long.parseLong(id);
            Workspace w = Workspace.findById(longId);
            if (w == null) {
                throw new NotFoundException();
            }
            // Delete Cards first (referencing Note and Deck)
            // Note: Card doesn't have a direct workspace link, so we reach it via Deck
            br.com.powercards.model.Card.delete("deck.workspace.id = ?1", longId);

            // Delete Notes (referencing Workspace and AnkiModel)
            br.com.powercards.model.Note.delete("workspace.id = ?1", longId);

            // Delete Decks (referencing Workspace)
            br.com.powercards.model.Deck.delete("workspace.id = ?1", longId);

            // Delete AnkiTemplates and AnkiFields (referencing AnkiModel)
            br.com.powercards.model.AnkiTemplate.delete("model.workspace.id = ?1", longId);
            br.com.powercards.model.AnkiField.delete("model.workspace.id = ?1", longId);

            // Delete AnkiModels (referencing Workspace)
            br.com.powercards.model.AnkiModel.delete("workspace.id = ?1", longId);

            // Delete Tags (referencing Workspace)
            br.com.powercards.model.Tag.delete("workspace.id = ?1", longId);

            // Finally, delete the Workspace
            w.delete();
        } catch (NumberFormatException e) {
            throw new NotFoundException();
        }
    }
}
