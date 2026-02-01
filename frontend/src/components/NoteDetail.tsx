import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { HtmlInput } from "@/components/ui/html-input";
import { noteApi, modelApi } from "@/lib/api";
import { NoteResponse, AnkiModelResponse, AnkiFieldDto } from "@/api/api";
import { useToast } from "@/hooks/use-toast";
import { TagInput } from "./ui/tag-input";
import { splitAnkiFields, joinAnkiFields } from "@/lib/anki";
import { Loader2, Pencil, X, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface NoteDetailProps {
    noteId: number | null;
    onSaved: () => void;
    onClose: () => void;
    className?: string;
}

export function NoteDetail({ noteId, onSaved, onClose, className }: NoteDetailProps) {
    const [tags, setTags] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [fetchingDetails, setFetchingDetails] = useState(false);

    // Default to read-only when opening directly in side panel
    const [isEditing, setIsEditing] = useState(false);

    // Model Aware State
    const [model, setModel] = useState<AnkiModelResponse | null>(null);
    const [fieldValues, setFieldValues] = useState<string[]>([]);
    const [note, setNote] = useState<NoteResponse | null>(null);

    const { toast } = useToast();

    // Reset state when noteId changes
    useEffect(() => {
        if (noteId) {
            setIsEditing(false); // Always start in view mode
            fetchNoteDetails(noteId);
        } else {
            resetState();
        }
    }, [noteId]);

    const resetState = () => {
        setModel(null);
        setFieldValues([]);
        setNote(null);
        setTags([]);
        setIsEditing(false);
    };

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
            setIsEditing(false);
            onSaved();
        } catch (error) {
            console.error("Failed to update note", error);
            toast({ title: "Error", description: "Failed to update note", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    if (!noteId) return null;

    return (
        <Card className={cn("h-full flex flex-col border-l rounded-none shadow-none", className)}>
            <CardHeader className="flex flex-row items-center justify-between py-4 px-6 border-b space-y-0">
                <CardTitle className="text-lg font-medium">
                    {isEditing ? "Edit Note" : "Note Details"}
                </CardTitle>
                <div className="flex items-center gap-2">
                    {!isEditing && !fetchingDetails && (
                        <Button variant="ghost" size="icon" onClick={() => setIsEditing(true)} title="Edit Note">
                            <Pencil className="h-4 w-4" />
                        </Button>
                    )}
                    {isEditing && (
                        <div className="flex items-center gap-1">
                            <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)} disabled={loading}>
                                Cancel
                            </Button>
                            <Button size="sm" onClick={handleSave} disabled={loading}>
                                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                                Save
                            </Button>
                        </div>
                    )}
                    <Button variant="ghost" size="icon" onClick={onClose} title="Close">
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            </CardHeader>

            <CardContent className="flex-1 overflow-y-auto p-6">
                {fetchingDetails ? (
                    <div className="flex justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                ) : (
                    <div className="grid gap-6">
                        {model?.fields?.map((field: AnkiFieldDto, index: number) => (
                            <div key={index} className="grid gap-2">
                                <Label htmlFor={`field-${index}`} className="text-xs uppercase text-muted-foreground font-semibold tracking-wide">
                                    {field.name}
                                </Label>
                                <HtmlInput
                                    id={`field-${index}`}
                                    value={fieldValues[index] || ""}
                                    onChange={(value) => handleFieldChange(index, value)}
                                    // Use a slightly larger or different background to distinguish visual read-only mode if needed
                                    className={cn("min-h-[80px]", !isEditing && "bg-muted/10 border-transparent px-0")}
                                    disabled={!isEditing}
                                />
                            </div>
                        ))}

                        {!model && (
                            <div className="text-center text-muted-foreground py-4">
                                Could not load model details.
                            </div>
                        )}

                        <div className="grid gap-2 pt-4 border-t">
                            <Label className="text-xs uppercase text-muted-foreground font-semibold tracking-wide">Tags</Label>
                            <TagInput
                                selected={tags}
                                onChange={setTags}
                                placeholder={isEditing ? "Add tags..." : "No tags"}
                                disabled={!isEditing}
                            />
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
