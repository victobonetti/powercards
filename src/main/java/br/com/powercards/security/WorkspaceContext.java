package br.com.powercards.security;

import br.com.powercards.model.Workspace;
import jakarta.enterprise.context.RequestScoped;

@RequestScoped
public class WorkspaceContext {

    private String workspaceId;

    public String getWorkspaceId() {
        return workspaceId;
    }

    public void setWorkspaceId(String workspaceId) {
        this.workspaceId = workspaceId;
    }

    public Workspace getWorkspace() {
        if (workspaceId == null) {
            return null;
        }
        try {
            return Workspace.findById(Long.parseLong(workspaceId));
        } catch (NumberFormatException e) {
            return null;
        }
    }
}
