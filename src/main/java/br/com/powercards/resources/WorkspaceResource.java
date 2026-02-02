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
            w.delete();
        } catch (NumberFormatException e) {
            throw new NotFoundException();
        }
    }
}
