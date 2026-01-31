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
import { Loader2 } from "lucide-react";

interface CardEditDialogProps {
    card: CardResponse | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSaved: () => void;
    readOnly?: boolean;
}

export function CardEditDialog({ card, open, onOpenChange, onSaved, readOnly = false }: CardEditDialogProps) {
    const [tags, setTags] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [fetchingDetails, setFetchingDetails] = useState(false);

    // Model Aware State
    const [model, setModel] = useState<AnkiModelResponse | null>(null);
    const [fieldValues, setFieldValues] = useState<string[]>([]);
    const [note, setNote] = useState<NoteResponse | null>(null);

    const { toast } = useToast();

    useEffect(() => {
        if (card && open && card.noteId) {
            fetchNoteDetails(card.noteId);
            const tagString = card.noteTags || "";
            setTags(tagString.split(" ").filter(Boolean));
        } else {
            // Reset state
            setModel(null);
            setFieldValues([]);
            setNote(null);
        }
    }, [card, open]);

    const fetchNoteDetails = async (noteId: number) => {
        setFetchingDetails(true);
        try {
            // 1. Fetch Note
            const noteRes = await noteApi.v1NotesIdGet(noteId);
            setNote(noteRes.data);

            // 2. Parse existing fields
            const currentFields = splitAnkiFields(noteRes.data.fields || "");

            // 3. Fetch Model
            if (noteRes.data.modelId) {
                const modelRes = await modelApi.v1ModelsIdGet(noteRes.data.modelId);
                setModel(modelRes.data);

                // Ensure fieldValues matches model fields length (pad with empty strings if needed)
                // or assume Anki flds matches model fields count.
                // We should align them.
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
        if (!card?.id || !note) return;

        setLoading(true);
        try {
            // Reconstruct flds string
            const flds = joinAnkiFields(fieldValues);

            // We update the Card (which implicitly updates the Note via our backend logic if we send noteContent/Tags)
            // But wait, our Backend CardResource.update updates properties on the CARD entity mainly.
            // However, we modified CardResource to update Note properties if passed?
            // Actually, the previous backend code showed:
            // "if (request.noteContent() != null) ..." - wait, I need to check if CardResource DOES update note fields.
            // checking CardResource.java...
            // It has 'noteContent' and 'noteTags' in CardRequest.
            // But 'noteContent' usually mapped to just one field or the 'sfld'. 
            // We want to update FULL 'flds'.

            // Since we exposed 'fields' in NoteRequest and NoteResource, maybe we should update the NOTE directly?
            // Updating the Note directly is cleaner for "Model-Aware" editing as we are editing the Note's data.
            // The Card is just a scheduling wrapper.

            // Let's update the Note directly using v1NotesIdPut.
            if (note.id) {
                await noteApi.v1NotesIdPut(note.id, {
                    ...note,
                    modelId: note.modelId,
                    modificationTimestamp: Date.now() / 1000,
                    tags: tags.join(" "),
                    fields: flds,
                    customData: note.customData
                });
            }

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
                    <DialogTitle>Edit Card</DialogTitle>
                    <DialogDescription>
                        Edit the note fields and tags.
                    </DialogDescription>
                </DialogHeader>

                {fetchingDetails ? (
                    <div className="flex justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : (
                    <div className="grid gap-4 py-4">
                        {model?.fields?.map((field: AnkiFieldDto, index: number) => (
                            <div key={index} className="grid gap-2">
                                <Label htmlFor={`field-${index}`}>{field.name}</Label>
                                <Textarea
                                    id={`field-${index}`}
                                    value={fieldValues[index] || ""}
                                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleFieldChange(index, e.target.value)}
                                    className="min-h-[80px]"
                                    disabled={readOnly}
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
                                placeholder="Add tags..."
                                disabled={readOnly}
                            />
                            <p className="text-xs text-muted-foreground">
                                Press Space to add a tag.
                            </p>
                        </div>
                    </div>
                )}

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                        {readOnly ? "Close" : "Cancel"}
                    </Button>
                    {!readOnly && (
                        <Button onClick={handleSave} disabled={loading || fetchingDetails}>
                            {loading ? "Saving..." : "Save Changes"}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
