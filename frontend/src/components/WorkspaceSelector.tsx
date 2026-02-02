import { useState } from "react";
import { Check, ChevronsUpDown, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { useWorkspace } from "@/context/WorkspaceContext";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
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

export function WorkspaceSelector() {
    const { workspaces, currentWorkspaceId, selectWorkspace, createWorkspace, deleteWorkspace } = useWorkspace();
    const [open, setOpen] = useState(false);
    const [showNewWorkspaceDialog, setShowNewWorkspaceDialog] = useState(false);
    const [newWorkspaceName, setNewWorkspaceName] = useState("");
    const [workspaceToDelete, setWorkspaceToDelete] = useState<string | null>(null);

    const currentWorkspace = workspaces.find((w) => w.id === currentWorkspaceId);

    const handleCreateWorkspace = async () => {
        if (!newWorkspaceName.trim()) return;
        try {
            await createWorkspace(newWorkspaceName);
            setShowNewWorkspaceDialog(false);
            setNewWorkspaceName("");
        } catch (error) {
            // Toast handled in context
        }
    };

    const handleDeleteWorkspace = async () => {
        if (!workspaceToDelete) return;
        try {
            await deleteWorkspace(workspaceToDelete);
            setWorkspaceToDelete(null);
        } catch (error) {
            // Toast handled in context
        }
    };

    return (
        <>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        className="w-[200px] justify-between"
                    >
                        {currentWorkspace ? currentWorkspace.name : "Select Workspace..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-0">
                    <Command>
                        <CommandInput placeholder="Search workspace..." />
                        <CommandList>
                            <CommandEmpty>No workspace found.</CommandEmpty>
                            <CommandGroup heading="Workspaces">
                                {workspaces.map((workspace) => (
                                    <CommandItem
                                        key={workspace.id}
                                        value={workspace.name || ""}
                                        onSelect={() => {
                                            if (workspace.id) {
                                                selectWorkspace(workspace.id);
                                                setOpen(false);
                                            }
                                        }}
                                        className="flex justify-between items-center group"
                                    >
                                        <div className="flex items-center">
                                            <Check
                                                className={cn(
                                                    "mr-2 h-4 w-4",
                                                    currentWorkspaceId === workspace.id ? "opacity-100" : "opacity-0"
                                                )}
                                            />
                                            {workspace.name}
                                        </div>
                                        {workspace.id && workspace.name !== "Default" && ( // Prevent deleting default if needed, or just allow it
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive hover:text-destructive-foreground"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setWorkspaceToDelete(workspace.id || null);
                                                }}
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        )}
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                            <CommandSeparator />
                            <CommandGroup>
                                <CommandItem
                                    onSelect={() => {
                                        setOpen(false);
                                        setShowNewWorkspaceDialog(true);
                                    }}
                                >
                                    <Plus className="mr-2 h-4 w-4" />
                                    Create Workspace
                                </CommandItem>
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>

            <Dialog open={showNewWorkspaceDialog} onOpenChange={setShowNewWorkspaceDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create Workspace</DialogTitle>
                        <DialogDescription>
                            Add a new workspace to organize your decks and notes separately.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <Input
                            placeholder="Workspace Name"
                            value={newWorkspaceName}
                            onChange={(e) => setNewWorkspaceName(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleCreateWorkspace()}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowNewWorkspaceDialog(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleCreateWorkspace}>Create</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={!!workspaceToDelete} onOpenChange={(open) => !open && setWorkspaceToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the workspace. You can only delete empty workspaces.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteWorkspace} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
