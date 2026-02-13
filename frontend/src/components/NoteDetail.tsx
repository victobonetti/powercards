import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { HtmlInput } from "@/components/ui/html-input";
import { noteApi, modelApi, uploadMedia, enhanceModel } from "@/lib/api";
import { NoteResponse, AnkiModelResponse, AnkiFieldDto } from "@/api/api";
import { useToast } from "@/hooks/use-toast";
import { TagInput } from "./ui/tag-input";
import { splitAnkiFields, joinAnkiFields } from "@/lib/anki";
import { Loader2, Pencil, X, Save, Image as ImageIcon, Undo, Redo, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useAuth } from "@/auth/AuthProvider";
import { AIKeyRequiredModal } from "./AIKeyRequiredModal";

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
    const { profile } = useAuth();
    const [showAIKeyModal, setShowAIKeyModal] = useState(false);

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

    // History State
    const [history, setHistory] = useState<string[][]>([]); // Array of fieldValues arrays
    const [future, setFuture] = useState<string[][]>([]);

    const saveToHistory = () => {
        setHistory(prev => [...prev, [...fieldValues]]);
        setFuture([]);
    };

    const handleUndo = () => {
        if (history.length === 0) return;
        const previous = history[history.length - 1];
        const newHistory = history.slice(0, -1);

        setFuture(prev => [[...fieldValues], ...prev]);
        setHistory(newHistory);
        setFieldValues(previous);
    };

    const handleRedo = () => {
        if (future.length === 0) return;
        const next = future[0];
        const newFuture = future.slice(1);

        setHistory(prev => [...prev, [...fieldValues]]);
        setFuture(newFuture);
        setFieldValues(next);
    };

    // Keyboard Shortcut for Undo/Redo
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Check for Ctrl+Z or Cmd+Z
            if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
                const target = e.target as HTMLElement;
                const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

                // If Shift is pressed, it's Redo (Ctrl+Shift+Z)
                if (e.shiftKey) {
                    // Only intercept if NOT input, OR if we decide custom redo is better
                    // Ideally, avoiding conflict with browser native redo
                    if (!isInput) {
                        e.preventDefault();
                        handleRedo();
                    }
                } else {
                    // Undo
                    if (!isInput) {
                        e.preventDefault();
                        handleUndo();
                    }
                }
            }
            // Check for Ctrl+Y (Redo on Windows/Linux sometimes)
            if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
                const target = e.target as HTMLElement;
                const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
                if (!isInput) {
                    e.preventDefault();
                    handleRedo();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [history, future, fieldValues]); // Dependencies needed for handlers

    const handleFieldChange = (index: number, value: string) => {
        const newValues = [...fieldValues];
        newValues[index] = value;
        setFieldValues(newValues);
    };

    const handleUpload = async (index: number, file: File) => {
        if (!note?.id) {
            toast({ title: "Error", description: "Save the note first before uploading media.", variant: "destructive" });
            return;
        }

        // Save state before upload
        saveToHistory();

        try {
            toast({ title: "Uploading...", description: "Please wait." });
            const result = await uploadMedia(note.id, file);

            // Determine tag based on file type
            let tag = "";
            if (file.type.startsWith("image/")) {
                tag = `<img src="${result.url}" alt="${result.filename}" style="max-width: 100%;" />`;
            } else if (file.type.startsWith("audio/")) {
                tag = `<audio controls src="${result.url}"></audio>`;
            } else if (file.type.startsWith("video/")) {
                tag = `<video controls src="${result.url}" style="max-width: 100%;"></video>`;
            } else {
                tag = `<a href="${result.url}">${result.filename}</a>`;
            }

            // Append to field
            const currentValue = fieldValues[index] || "";
            // Add a newline if not empty
            const newValue = currentValue ? `${currentValue}\n${tag}` : tag;

            // Update state directly (we already saved history)
            const newValues = [...fieldValues];
            newValues[index] = newValue;
            setFieldValues(newValues);

            toast({ title: "Success", description: "Media uploaded and added to field." });
        } catch (error) {
            console.error("Upload failed", error);
            toast({ title: "Error", description: "Failed to upload media.", variant: "destructive" });
        }
    };




    const handleEnhanceModel = async () => {
        // Check BYOK before proceeding
        if (!profile?.hasAiApiKey) {
            setShowAIKeyModal(true);
            return;
        }

        // Validation: Ensure at least one field has content
        if (fieldValues.every(val => !val || val.trim().length === 0)) {
            toast({ title: "Empty Context", description: "Please add content to at least one field before enhancing." });
            return;
        }

        // Save state before bulk enhance
        saveToHistory();

        toast({ title: "Enhancing Note...", description: "AI is improving all fields ensuring consistency." });
        setLoading(true);
        try {
            // Send all fields to the new endpoint
            const enhancedFields = await enhanceModel(fieldValues);

            // Validation: Ensure we get back the same number of fields
            if (enhancedFields.length !== fieldValues.length) {
                console.error("Mismatch in field count", { sent: fieldValues.length, received: enhancedFields.length });
                toast({ title: "Warning", description: "AI returned an unexpected number of fields. Enhancement aborted to prevent data loss.", variant: "destructive" });
                return;
            }

            setFieldValues(enhancedFields);
            toast({ title: "Note Enhanced!", description: "All fields improved successfully." });
        } catch (error: any) {
            console.error("Enhancement failed", error);
            const errorData = error?.response?.data;
            if (errorData?.error === "AI_KEY_NOT_CONFIGURED") {
                setShowAIKeyModal(true);
            } else {
                toast({ title: "Error", description: errorData?.message || "Failed to enhance note.", variant: "destructive" });
            }
        } finally {
            setLoading(false);
        }
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
            setHistory([]); setFuture([]); // Clear history on save? Or keep it? Clearing is safer vs inconsistencies.
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
        <>
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
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={handleUndo}
                                    disabled={history.length === 0 || loading}
                                    title="Undo (Ctrl+Z)"
                                >
                                    <Undo className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={handleRedo}
                                    disabled={future.length === 0 || loading}
                                    title="Redo (Ctrl+Shift+Z)"
                                >
                                    <Redo className="h-4 w-4" />
                                </Button>
                                <div className="w-px h-4 bg-border mx-1" />

                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="gap-2 text-primary border-primary/20 hover:bg-primary/5"
                                    onClick={handleEnhanceModel}
                                    disabled={loading}
                                >
                                    <Sparkles className="h-4 w-4" />
                                    Enhance Note
                                </Button>

                                <div className="w-px h-4 bg-border mx-1" />

                                <Button variant="ghost" size="sm" onClick={() => {
                                    // Revert changes
                                    if (note) {
                                        const currentFields = splitAnkiFields(note.fields || "");
                                        setFieldValues(currentFields);

                                        const tagString = note.tags || "";
                                        setTags(tagString.split(" ").filter(Boolean));
                                    }
                                    setIsEditing(false);
                                    setHistory([]);
                                    setFuture([]);
                                }} disabled={loading}>
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

                <CardContent className="flex-1 overflow-y-auto p-6 relative">
                    {loading && (
                        <div className="absolute inset-0 bg-background/50 flex flex-col items-center justify-center z-50 backdrop-blur-sm">
                            <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                            <span className="text-sm font-medium text-muted-foreground animate-pulse">Enhancing...</span>
                        </div>
                    )}
                    {fetchingDetails ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : (
                        <div className="grid">
                            {model?.fields?.map((field: AnkiFieldDto, index: number) => (
                                <div key={index} className="grid gap-2">
                                    <Label htmlFor={`field-${index}`} className="text-xs uppercase text-muted-foreground font-semibold tracking-wide">
                                        {field.name}
                                    </Label>
                                    <div className="flex items-start gap-2">
                                        <HtmlInput
                                            id={`field-${index}`}
                                            value={fieldValues[index] || ""}
                                            onChange={(value) => handleFieldChange(index, value)}
                                            // Use a slightly larger or different background to distinguish visual read-only mode if needed
                                            className={cn("min-h-[80px] flex-1", (!isEditing || loading) && "bg-muted/10 border-transparent px-0")}
                                            disabled={!isEditing || loading}
                                        />
                                        {isEditing && (
                                            <div className="flex flex-col gap-1 pt-1">
                                                <label htmlFor={`upload-${index}`} className="cursor-pointer">
                                                    <div className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-8 w-8 text-muted-foreground hover:text-primary">
                                                        <ImageIcon className="h-4 w-4" />
                                                    </div>
                                                    <input
                                                        id={`upload-${index}`}
                                                        type="file"
                                                        className="hidden"
                                                        onChange={(e) => {
                                                            const file = e.target.files?.[0];
                                                            if (file) handleUpload(index, file);
                                                            e.target.value = ""; // Reset
                                                        }}
                                                    />
                                                </label>
                                            </div>
                                        )}
                                    </div>
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
                                    disabled={!isEditing || loading}
                                />
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
            <AIKeyRequiredModal open={showAIKeyModal} onOpenChange={setShowAIKeyModal} />
        </>
    );
}
