package br.com.powercards.security;

import jakarta.annotation.Priority;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;

import jakarta.ws.rs.Priorities;
import jakarta.ws.rs.container.ContainerRequestContext;
import jakarta.ws.rs.container.ContainerRequestFilter;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.ext.Provider;
import org.hibernate.Session;
import org.jboss.logging.Logger;

@Provider
@Priority(Priorities.USER)
public class WorkspaceFilter implements ContainerRequestFilter {

    private static final Logger LOG = Logger.getLogger(WorkspaceFilter.class);

    @Inject
    WorkspaceContext workspaceContext;

    @Inject
    EntityManager entityManager;

    @Override
    public void filter(ContainerRequestContext requestContext) {
        String path = requestContext.getUriInfo().getPath();
        // Skip Quarkus internal paths and Workspace management
        if (path.startsWith("/q/") || path.equals("/health") || path.startsWith("/v1/workspaces")) {
            return;
        }

        String workspaceId = requestContext.getHeaderString("X-Workspace-Id");

        if (workspaceId != null && !workspaceId.isBlank()) {
            workspaceContext.setWorkspaceId(workspaceId);
            try {
                long id = Long.parseLong(workspaceId);
                Session session = entityManager.unwrap(Session.class);
                session.enableFilter("workspaceFilter").setParameter("workspaceId", id);
            } catch (NumberFormatException e) {
                requestContext.abortWith(Response.status(Response.Status.BAD_REQUEST)
                        .entity("Invalid X-Workspace-Id header format")
                        .build());
            } catch (Exception e) {
                LOG.error("Failed to enable workspace filter", e);
            }
        } else if (path.startsWith("/v1/")) {
            // Enforce workspace for API endpoints
            requestContext.abortWith(Response.status(Response.Status.BAD_REQUEST)
                    .entity("Missing X-Workspace-Id header")
                    .build());
        }
    }
}
