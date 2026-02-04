import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useWorkspace } from "@/context/WorkspaceContext";

interface WorkspaceCreateDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    force?: boolean; // If true, cannot be closed (no cancel, no click outside)
}

export function WorkspaceCreateDialog({ open, onOpenChange, force = false }: WorkspaceCreateDialogProps) {
    const { createWorkspace } = useWorkspace();
    const [newWorkspaceName, setNewWorkspaceName] = useState("");
    const [isCreating, setIsCreating] = useState(false);

    const handleCreateWorkspace = async () => {
        if (!newWorkspaceName.trim()) return;
        setIsCreating(true);
        try {
            await createWorkspace(newWorkspaceName);
            setNewWorkspaceName("");
            onOpenChange(false);
        } catch (error) {
            // Toast handled in context
        } finally {
            setIsCreating(false);
        }
    };

    const handleOpenChange = (newOpen: boolean) => {
        if (force && !newOpen) {
            // Prevent closing if forced
            return;
        }
        onOpenChange(newOpen);
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className={force ? "sm:max-w-[425px] [&>button]:hidden pointer-events-auto" : "sm:max-w-[425px]"}>
                <DialogHeader>
                    <DialogTitle>{force ? "Welcome to PowerCards" : "Create Workspace"}</DialogTitle>
                    <DialogDescription>
                        {force
                            ? "You need to create a workspace to get started. Workspaces help organize your decks and notes."
                            : "Add a new workspace to organize your decks and notes separately."}
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <Input
                        autoFocus
                        placeholder="Workspace Name (e.g., Personal, Work, Study)"
                        value={newWorkspaceName}
                        onChange={(e) => setNewWorkspaceName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleCreateWorkspace()}
                        disabled={isCreating}
                    />
                </div>
                <DialogFooter>
                    {!force && (
                        <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isCreating}>
                            Cancel
                        </Button>
                    )}
                    <Button onClick={handleCreateWorkspace} disabled={isCreating || !newWorkspaceName.trim()}>
                        {isCreating ? "Creating..." : force ? "Get Started" : "Create"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
