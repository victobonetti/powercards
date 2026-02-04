import { useState, useEffect } from "react";
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
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface WorkspaceDeleteDialogProps {
    workspaceId: string | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function WorkspaceDeleteDialog({ workspaceId, open, onOpenChange }: WorkspaceDeleteDialogProps) {
    const { workspaces, deleteWorkspace } = useWorkspace();
    const [step, setStep] = useState<"initial" | "confirm_name">("initial");
    const [confirmName, setConfirmName] = useState("");
    const [isDeleting, setIsDeleting] = useState(false);

    const workspace = workspaces.find((w) => w.id === workspaceId);

    // Reset state when dialog opens/closes
    useEffect(() => {
        if (open) {
            setStep("initial");
            setConfirmName("");
            setIsDeleting(false);
        }
    }, [open]);

    const handleDelete = async () => {
        if (!workspaceId) return;
        setIsDeleting(true);
        try {
            await deleteWorkspace(workspaceId);
            onOpenChange(false);
        } catch (error) {
            // Toast handled in context
        } finally {
            setIsDeleting(false);
        }
    };

    if (!workspace) return null;

    if (step === "initial") {
        return (
            <AlertDialog open={open} onOpenChange={onOpenChange}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the workspace "{workspace.name}" and ALL data associated with it (decks, notes, cards, tags). This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={(e) => {
                                e.preventDefault(); // Prevent closing
                                setStep("confirm_name");
                            }}
                        >
                            Continue
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        );
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Type workspace name to confirm</DialogTitle>
                    <DialogDescription>
                        Please type <strong>{workspace.name}</strong> to confirm deletion.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <Input
                        value={confirmName}
                        onChange={(e) => setConfirmName(e.target.value)}
                        placeholder={workspace.name}
                        autoFocus
                    />
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isDeleting}>
                        Cancel
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={handleDelete}
                        disabled={isDeleting || confirmName !== workspace.name}
                    >
                        {isDeleting ? "Deleting..." : "Delete Workspace"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
