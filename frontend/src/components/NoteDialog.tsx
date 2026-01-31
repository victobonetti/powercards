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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { noteApi, modelApi } from "@/lib/api";
import { CardResponse, NoteResponse, AnkiModelResponse, AnkiFieldDto } from "@/api/api";
import { useToast } from "@/hooks/use-toast";
import { TagInput } from "./ui/tag-input";
import { splitAnkiFields, joinAnkiFields } from "@/lib/anki";
import { Loader2, Pencil } from "lucide-react";

interface NoteDialogProps {
    noteId: number | null; // Can come from Card or Note
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSaved: () => void;
    initialReadOnly?: boolean;
}

export function NoteDialog({ noteId, open, onOpenChange, onSaved, initialReadOnly = false }: NoteDialogProps) {
    const [tags, setTags] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [fetchingDetails, setFetchingDetails] = useState(false);

    // Edit Mode State
    // If initialReadOnly is true, we start in view mode (isEditing=false).
    // If initialReadOnly is false, we start in edit mode (isEditing=true).
    const [isEditing, setIsEditing] = useState(!initialReadOnly);

    // Model Aware State
    const [model, setModel] = useState<AnkiModelResponse | null>(null);
    const [fieldValues, setFieldValues] = useState<string[]>([]);
    const [note, setNote] = useState<NoteResponse | null>(null);

    const { toast } = useToast();

    // Reset editing state when dialog opens/closes
    useEffect(() => {
        if (open) {
            setIsEditing(!initialReadOnly);
        }
    }, [open, initialReadOnly]);

    useEffect(() => {
        if (noteId && open) {
            fetchNoteDetails(noteId);
        } else {
            // Reset state
            setModel(null);
            setFieldValues([]);
            setNote(null);
            setTags([]);
        }
    }, [noteId, open]);

    const fetchNoteDetails = async (id: number) => {
        setFetchingDetails(true);
        try {
            // 1. Fetch Note
            const noteRes = await noteApi.v1NotesIdGet(id);
            setNote(noteRes.data);

            // Set tags from note
            const tagString = noteRes.data.tags || "";
            setTags(tagString.split(" ").filter(Boolean));

            // 2. Parse existing fields
            const currentFields = splitAnkiFields(noteRes.data.fields || "");

            // 3. Fetch Model
            if (noteRes.data.modelId) {
                const modelRes = await modelApi.v1ModelsIdGet(noteRes.data.modelId);
                setModel(modelRes.data);
                setFieldValues(currentFields);
            }
        } catch (error) {
            console.error("Failed to fetch details", error);
            toast({ title: "Error", description: "Failed to load note details", variant: "destructive" });
        } finally {
            setFetchingDetails(false);
        }
    };

    const handleFieldChange = (index: number, value: string) => {
        const newValues = [...fieldValues];
        newValues[index] = value;
        setFieldValues(newValues);
    };

    const handleSave = async () => {
        if (!note?.id) return;

        setLoading(true);
        try {
            // Reconstruct flds string
            const flds = joinAnkiFields(fieldValues);

            await noteApi.v1NotesIdPut(note.id, {
                ...note,
                modelId: note.modelId,
                modificationTimestamp: Date.now() / 1000,
                tags: tags.join(" "),
                fields: flds,
                customData: note.customData
            });

            toast({ title: "Success", description: "Note updated successfully" });
            onOpenChange(false);
            onSaved();
        } catch (error) {
            console.error("Failed to update note", error);
            toast({ title: "Error", description: "Failed to update note", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        {isEditing ? "Edit Note" : "View Note"}
                    </DialogTitle>
                    <DialogDescription>
                        {isEditing ? "Edit the note fields and tags." : "View note details."}
                    </DialogDescription>
                </DialogHeader>

                {fetchingDetails ? (
                    <div className="flex justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : (
                    <div className="grid gap-4 py-4">
                        {/* View Mode Actions */}
                        {!isEditing && (
                            <div className="flex justify-end">
                                <Button size="sm" onClick={() => setIsEditing(true)}>
                                    <Pencil className="mr-2 h-4 w-4" /> Enable Editing
                                </Button>
                            </div>
                        )}

                        {model?.fields?.map((field: AnkiFieldDto, index: number) => (
                            <div key={index} className="grid gap-2">
                                <Label htmlFor={`field-${index}`}>{field.name}</Label>
                                <Textarea
                                    id={`field-${index}`}
                                    value={fieldValues[index] || ""}
                                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleFieldChange(index, e.target.value)}
                                    className="min-h-[80px]"
                                    disabled={!isEditing}
                                />
                            </div>
                        ))}

                        {!model && (
                            <div className="text-center text-muted-foreground py-4">
                                Could not load model details.
                            </div>
                        )}

                        <div className="grid gap-2">
                            <Label>Tags</Label>
                            <TagInput
                                selected={tags}
                                onChange={setTags}
                                placeholder={isEditing ? "Add tags..." : "No tags"}
                                disabled={!isEditing}
                            />
                            {isEditing && (
                                <p className="text-xs text-muted-foreground">
                                    Type and select to create tags.
                                </p>
                            )}
                        </div>
                    </div>
                )}

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                        Close
                    </Button>
                    {isEditing && (
                        <Button onClick={handleSave} disabled={loading || fetchingDetails}>
                            {loading ? "Saving..." : "Save Changes"}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
