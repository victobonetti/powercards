import React, { createContext, useContext, useState, useEffect } from "react";
import { workspaceApi } from "@/lib/api"; // We will export this from lib/api.ts
import { WorkspaceResponse } from "@/api/api";
import { useToast } from "@/hooks/use-toast";

interface WorkspaceContextType {
    workspaces: WorkspaceResponse[];
    currentWorkspaceId: string | null;
    selectWorkspace: (id: string) => void;
    createWorkspace: (name: string) => Promise<void>;
    deleteWorkspace: (id: string) => Promise<void>;
    isLoading: boolean;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
    const [workspaces, setWorkspaces] = useState<WorkspaceResponse[]>([]);
    const [currentWorkspaceId, setCurrentWorkspaceId] = useState<string | null>(() => {
        return localStorage.getItem("currentWorkspaceId");
    });
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();

    const fetchWorkspaces = async () => {
        try {
            const response = await workspaceApi.v1WorkspacesGet();
            setWorkspaces(response.data);

            // Auto-select if none selected or invalid
            if (response.data.length > 0) {
                if (!currentWorkspaceId || !response.data.find(w => w.id === currentWorkspaceId)) {
                    // Prefer one named "Default" or the first one
                    const defaultWs = response.data.find(w => w.name === "Default") || response.data[0];
                    selectWorkspace(defaultWs.id!);
                }
            } else {
                // No workspaces exist, maybe prompt to create one? 
                // Ideally backend ensures at least one? Or we handle empty state.
            }
        } catch (error) {
            console.error("Failed to fetch workspaces", error);
            toast({ title: "Error", description: "Failed to load workspaces", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchWorkspaces();
    }, []);

    const selectWorkspace = (id: string) => {
        setCurrentWorkspaceId(id);
        localStorage.setItem("currentWorkspaceId", id);
        // Force reload or trigger re-fetch of data in other components?
        // Ideally, other components depend on currentWorkspaceId or we use a query client that we invalidate.
        // For now, a window reload might be crudest but safest way to ensure all stale data is gone, 
        // OR we just rely on React state updates if everything is reactive. 
        // Given the app structure, let's try reactive first.

        // However, axios instance needs to be updated or interceptor needs to read from this state.
        // Since axios instance is outside React, we might need to store in localStorage (done) and read from there in interceptor.
        window.location.reload();
    };

    const createWorkspace = async (name: string) => {
        try {
            await workspaceApi.v1WorkspacesPost({ name });
            await fetchWorkspaces();
            toast({ title: "Success", description: "Workspace created" });
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Failed to create workspace", variant: "destructive" });
            throw error;
        }
    };

    const deleteWorkspace = async (id: string) => {
        try {
            await workspaceApi.v1WorkspacesIdDelete(id);
            if (currentWorkspaceId === id) {
                setCurrentWorkspaceId(null);
                localStorage.removeItem("currentWorkspaceId");
            }
            await fetchWorkspaces();
            toast({ title: "Success", description: "Workspace deleted" });
        } catch (error) {
            console.error(error);
            // Check if 409 conflict (not empty)
            toast({ title: "Error", description: "Failed to delete workspace. Ensure it is empty.", variant: "destructive" });
            throw error;
        }
    };

    return (
        <WorkspaceContext.Provider value={{ workspaces, currentWorkspaceId, selectWorkspace, createWorkspace, deleteWorkspace, isLoading }}>
            {children}
        </WorkspaceContext.Provider>
    );
}

export function useWorkspace() {
    const context = useContext(WorkspaceContext);
    if (context === undefined) {
        throw new Error("useWorkspace must be used within a WorkspaceProvider");
    }
    return context;
}
