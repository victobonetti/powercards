import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { HtmlInput } from "@/components/ui/html-input";
import { noteApi, modelApi, uploadMedia } from "@/lib/api";
import { NoteResponse, AnkiModelResponse, AnkiFieldDto, NoteRequest } from "@/api/api";
import { useToast } from "@/hooks/use-toast";
import { TagInput } from "./ui/tag-input";
import { splitAnkiFields, joinAnkiFields } from "@/lib/anki";
import { Loader2, X, Save, Image as ImageIcon, Undo, Redo, Sparkles, Trash2, ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useAuth } from "@/auth/AuthProvider";
import { AIKeyRequiredModal } from "./AIKeyRequiredModal";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";

interface NoteDetailProps {
    noteId: number | null;
    onClose: () => void;
    onSaved?: () => void;
    onDraftChange?: (isDraft: boolean) => void; // Notify parent of draft status change
    onEnhanceStart?: (noteId: number) => void;
    onEnhanceEnd?: (noteId: number) => void;
    onEnhance?: (noteId: number, fields: string[], tags: string[]) => void;
    isEnhancing?: boolean;
    className?: string;
}

// Simple debounce hook implementation
function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);
    return debouncedValue;
}

export function NoteDetail({ noteId, onSaved, onClose, onEnhance, isEnhancing, onDraftChange, className }: NoteDetailProps) {
    const [tags, setTags] = useState<string[]>([]);
    const [localLoading, setLocalLoading] = useState(false);

    // Combine local loading with parent loading state
    const loading = localLoading || isEnhancing;
    const [fetchingDetails, setFetchingDetails] = useState(false);
    const [isDraft, setIsDraft] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [savingDraft, setSavingDraft] = useState(false);

    // View vs Edit Mode (Granular)
    const [editingField, setEditingField] = useState<number | null>(null);

    // Model Aware State
    const [model, setModel] = useState<AnkiModelResponse | null>(null);
    const [fieldValues, setFieldValues] = useState<string[]>([]);
    const [note, setNote] = useState<NoteResponse | null>(null);

    // Dirty state
    const [isDirty, setIsDirty] = useState(false);
    // Interaction state to prevent auto-save on view
    const [hasInteracted, setHasInteracted] = useState(false);

    const { toast } = useToast();
    const { profile } = useAuth();
    const [showAIKeyModal, setShowAIKeyModal] = useState(false);

    // Debounce for auto-save
    const debouncedFields = useDebounce(fieldValues, 1000);
    const debouncedTags = useDebounce(tags, 1000);
    const isFirstLoad = useRef(true);
    const initialLoadId = useRef<number | null>(null);

    // Store initial state to determine dirty state and prevent empty drafts
    const initialFields = useRef<string[]>([]);
    const initialTags = useRef<string[]>([]);

    const resetState = () => {
        setModel(null);
        setFieldValues([]);
        setNote(null);
        setTags([]);
        setIsDraft(false);
        setIsDirty(false);
        setHasInteracted(false);
    };

    // Reset state when noteId changes
    // Reset first load when noteId changes
    useEffect(() => {
        if (noteId) {
            isFirstLoad.current = true;
            initialLoadId.current = noteId;
            resetState();
            // Undo/Redo history needs to be reset separately if not in resetState
            // setHistory([]); // Assuming these are state variables defined elsewhere or I should check
            // setFuture([]);
            // But wait, setHistory and setFuture were used in the original code, but I don't see them defined in the 1-100 lines I saw.
            // Let me check if setHistory/setFuture are defined.
            fetchNoteDetails(noteId);
        } else {
            resetState();
        }
    }, [noteId]);


    // Refetch when enhancement completes
    const prevEnhancing = useRef(isEnhancing);
    useEffect(() => {
        if (prevEnhancing.current && !isEnhancing && noteId) {
            fetchNoteDetails(noteId);
        }
        prevEnhancing.current = isEnhancing;
    }, [isEnhancing, noteId]);


    const fetchNoteDetails = async (id: number) => {
        setFetchingDetails(true);
        try {
            // 1. Fetch Note (Draft by default)
            const noteRes = await noteApi.v1NotesIdGet(id);
            setNote(noteRes.data);
            const isDraftNote = !!noteRes.data.isDraft;
            setIsDraft(isDraftNote);
            onDraftChange?.(isDraftNote);

            // Set tags from note
            const tagString = noteRes.data.tags || "";
            const tgs = tagString.split(" ").filter(Boolean);
            setTags(tgs);
            initialTags.current = tgs;

            // 2. Parse existing fields
            const currentFields = splitAnkiFields(noteRes.data.fields || "");

            // 3. Fetch Model
            if (noteRes.data.modelId) {
                const modelRes = await modelApi.v1ModelsIdGet(noteRes.data.modelId);
                setModel(modelRes.data);
                setFieldValues(currentFields);
                initialFields.current = currentFields;
            }

            // Recalculate dirty state
            // IMPORTANT: Reset dirty state explicitly after fetch
            setIsDirty(false);

            // 4. If Draft, fetch original for History
            if (isDraftNote) {
                try {
                    // Fetch original content (draft=false)
                    // @ts-ignore - Argument count might vary depending on generation
                    const originalRes = await noteApi.v1NotesIdGet(id, false);
                    const originalFields = splitAnkiFields(originalRes.data.fields || "");
                    setHistory([originalFields]);
                } catch (e) {
                    console.warn("Could not fetch original note content for history", e);
                }
            } else {
                setHistory([]);
            }
            setFuture([]);

        } catch (error) {
            console.error("Failed to fetch details", error);
            toast({ title: "Error", description: "Failed to load note details", variant: "destructive" });
        } finally {
            setFetchingDetails(false);
            // Critical: Only unset isFirstLoad after we are sure data is set
            // and give a small tick for the debounced values to stabilize if needed
            setTimeout(() => {
                if (initialLoadId.current === id) {
                    isFirstLoad.current = false;
                }
            }, 600);
        }
    };

    const checkDirty = (currentFlds: string[], currentTgs: string[], initFlds: string[], initTgs: string[]) => {
        // Deep compare
        const tagsDirty = JSON.stringify(currentTgs) !== JSON.stringify(initTgs);

        // If field values are empty and initial are empty, it's not dirty
        // This handles cases where splitting empty string gives [""] vs []
        const cleanCurrentFlds = currentFlds.filter(f => f !== "");
        const cleanInitFlds = initFlds.filter(f => f !== "");
        const fldsReallyDirty = JSON.stringify(cleanCurrentFlds) !== JSON.stringify(cleanInitFlds);

        const isReallyDirty = fldsReallyDirty || tagsDirty;
        setIsDirty(isReallyDirty);
        return isReallyDirty;
    };

    // Auto-save draft effect
    useEffect(() => {
        if (!noteId || !note) return;

        // Ensure we don't trigger save on initial load or if nothing changed
        if (isFirstLoad.current) {
            return;
        }

        // Additional safety: if we are loading, don't save
        if (fetchingDetails) return;

        // Double check against initial state
        // If the current debounced state matches existing draft or original note, do not save new draft
        // Logic:
        // 1. If currently Draft -> We are editing a draft. Auto-save updates the draft.
        // 2. If currently NOT Draft -> We are editing original. Auto-save CREATES a draft.
        // In both cases, we only save if content != initial content loaded.

        const dirty = checkDirty(debouncedFields, debouncedTags, initialFields.current, initialTags.current);

        if (dirty && hasInteracted) {
            saveDraft();
        }
    }, [debouncedFields, debouncedTags]);

    const saveDraft = async () => {
        if (!noteId || !note) return;
        // Verify dirty one last time to prevent race conditions
        const isActuallyDirty = JSON.stringify(debouncedFields) !== JSON.stringify(initialFields.current) ||
            JSON.stringify(debouncedTags) !== JSON.stringify(initialTags.current);

        if (!isActuallyDirty) return;

        setSavingDraft(true);
        try {
            await noteApi.v1NotesIdDraftPost(noteId, {
                modelId: note.modelId,
                fields: joinAnkiFields(debouncedFields),
                tags: debouncedTags.join(" ")
            } as NoteRequest);

            setIsDraft(true);
            setLastSaved(new Date());
            // Do NOT update initialRefs here, because "Undo" needs to go back to original state?
            // Actually, if we save draft, the "base" is still the original note (if we discard).
            // So initialRefs should remain pointing to the state we reverted to if we discard.
        } catch (error) {
            console.error("Failed to save draft", error);
        } finally {
            setSavingDraft(false);
        }
    };

    const handleDiscardDraft = async () => {
        if (!noteId) return;
        if (!confirm("Are you sure you want to discard unsaved changes? This cannot be undone.")) return;

        setLocalLoading(true);
        try {
            // Delete draft via API
            await noteApi.v1NotesIdDraftDelete(noteId);

            toast({ title: "Draft Discarded", description: "Reverted to original note." });

            // Reload note details to fetch original content
            await fetchNoteDetails(noteId);

        } catch (error) {
            console.error("Failed to discard draft", error);
            toast({ title: "Error", description: "Failed to discard draft.", variant: "destructive" });
        } finally {
            setLocalLoading(false);
        }
    };

    const handleSave = async () => {
        if (!note?.id) return;

        setLocalLoading(true);
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

            toast({ title: "Success", description: "Note updated and draft cleared" });
            setIsDraft(false);
            onDraftChange?.(false); // Explicitly notify parent
            setLastSaved(new Date());
            setEditingField(null); // Close any active edit

            // Update initialRefs to new saved state
            initialFields.current = fieldValues;
            initialTags.current = tags;
            setIsDirty(false);

            onSaved?.();
            fetchNoteDetails(note.id);
        } catch (error) {
            console.error("Failed to update note", error);
            toast({ title: "Error", description: "Failed to update note", variant: "destructive" });
        } finally {
            setLocalLoading(false);
        }
    };

    // History State
    const [history, setHistory] = useState<string[][]>([]);
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
        // We trigger dirty check in effect via debouncer, but instant UI update is nice
        // checkDirty(previous, tags, initialFields.current, initialTags.current);
    };

    const handleRedo = () => {
        if (future.length === 0) return;
        const next = future[0];
        const newFuture = future.slice(1);

        setHistory(prev => [...prev, [...fieldValues]]);
        setFuture(newFuture);
        setFieldValues(next);
    };

    // Keyboard Shortcut for Undo/Redo - ALWAYS ACTIVE
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Check for Ctrl+Z or Cmd+Z
            if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
                const target = e.target as HTMLElement;
                const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

                if (e.shiftKey) {
                    if (!isInput) {
                        e.preventDefault();
                        handleRedo();
                    }
                } else {
                    if (!isInput) {
                        e.preventDefault();
                        handleUndo();
                    }
                }
            }
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
    }, [history, future, fieldValues]);

    const handleFieldChange = (index: number, value: string) => {
        const newValues = [...fieldValues];
        newValues[index] = value;
        setFieldValues(newValues);
        setHasInteracted(true);
    };

    const handleUpload = async (index: number, file: File) => {
        if (!note?.id) {
            toast({ title: "Error", description: "Save the note first before uploading media.", variant: "destructive" });
            return;
        }

        saveToHistory();

        try {
            toast({ title: "Uploading...", description: "Please wait." });
            const result = await uploadMedia(note.id, file);

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

            const currentValue = fieldValues[index] || "";
            const newValue = currentValue ? `${currentValue}\n${tag}` : tag;

            const newValues = [...fieldValues];
            newValues[index] = newValue;
            setFieldValues(newValues);
            setHasInteracted(true);

            toast({ title: "Success", description: "Media uploaded." });
        } catch (error) {
            console.error("Upload failed", error);
            toast({ title: "Error", description: "Failed to upload media.", variant: "destructive" });
        }
    };

    useEffect(() => {
        return () => {
            // Cleanup if needed
        };
    }, [noteId, loading]); // Dependency on loading ensures we only trigger if it WAS loading

    const handleEnhanceModel = async () => {
        if (!profile?.hasAiApiKey) {
            setShowAIKeyModal(true);
            return;
        }
        if (fieldValues.every(val => !val || val.trim().length === 0)) {
            toast({ title: "Empty Context", description: "Please add content before enhancing." });
            return;
        }

        if (noteId && onEnhance) {
            onEnhance(noteId, fieldValues, tags);
            // We rely on parent to handle state and updating isEnhancing
        } else {
            // Fallback to local if no parent handler (though we expect parent handler now)
            toast({ title: "Error", description: "Enhanced feature not available in this context", variant: "destructive" });
        }
    };

    if (!noteId) return null;

    return (
        <TooltipProvider>
            <>
                <Card className={cn("h-full flex flex-col border-l rounded-none shadow-none", className)}>
                    <CardHeader className="flex flex-row items-center justify-between py-4 px-6 border-b space-y-0">
                        <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={onClose}
                                    title="Close"
                                >
                                    <ArrowLeft className="h-4 w-4" />
                                </Button>
                                <CardTitle className="text-lg font-medium">
                                    Note Details
                                </CardTitle>
                                {isDraft && (
                                    <Badge variant="secondary" className="bg-amber-100 text-amber-800 hover:bg-amber-200 border-amber-200">
                                        Unsaved Draft
                                    </Badge>
                                )}
                            </div>
                            {lastSaved && (
                                <CardDescription className="text-xs ml-10">
                                    {savingDraft ? "Saving..." : `Saved ${lastSaved.toLocaleTimeString()}`}
                                </CardDescription>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            {/* Undo/Redo Always Available */}
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={handleUndo}
                                        disabled={history.length === 0 || loading}
                                    >
                                        <Undo className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Undo (Ctrl+Z)</TooltipContent>
                            </Tooltip>

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={handleRedo}
                                        disabled={future.length === 0 || loading}
                                    >
                                        <Redo className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Redo (Ctrl+Shift+Z)</TooltipContent>
                            </Tooltip>

                            <div className="w-px h-4 bg-border mx-1" />

                            {/* Discard Draft Button */}
                            {isDraft && (
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={handleDiscardDraft}
                                            className="text-destructive hover:bg-destructive/10"
                                            disabled={loading}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Discard Draft</TooltipContent>
                                </Tooltip>
                            )}

                            <div className="w-px h-4 bg-border mx-1" />

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-primary hover:bg-primary/10"
                                        onClick={handleEnhanceModel}
                                        disabled={loading}
                                    >
                                        <Sparkles className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Enhance AI</TooltipContent>
                            </Tooltip>

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={handleSave}
                                        disabled={loading || (!isDirty && !isDraft)}
                                    >
                                        <Save className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Save (Ctrl+S)</TooltipContent>
                            </Tooltip>

                            <Button variant="ghost" size="icon" onClick={onClose} title="Close">
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    </CardHeader>

                    <CardContent className="flex-1 overflow-y-auto p-6 relative">
                        {localLoading && (
                            <div className="absolute inset-0 bg-background/50 flex flex-col items-center justify-center z-50 backdrop-blur-sm">
                                <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                                <span className="text-sm font-medium text-muted-foreground animate-pulse">Processing...</span>
                            </div>
                        )}
                        {fetchingDetails ? (
                            <div className="flex justify-center py-8">
                                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                            </div>
                        ) : (
                            <div className="grid">
                                {model?.fields?.map((field: AnkiFieldDto, index: number) => {
                                    const isFieldEditing = editingField === index;

                                    return (
                                        <div key={index} className="grid gap-2 mb-4 group">
                                            <Label htmlFor={`field-${index}`} className="text-xs uppercase text-muted-foreground font-semibold tracking-wide flex justify-between">
                                                <span>{field.name}</span>
                                                {!isFieldEditing && (
                                                    <span className="text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">Double-click to edit</span>
                                                )}
                                            </Label>

                                            {isFieldEditing ? (
                                                <div className="flex items-start gap-2 animate-in fade-in duration-200">
                                                    <HtmlInput
                                                        id={`field-${index}`}
                                                        value={fieldValues[index] || ""}
                                                        onChange={(value) => handleFieldChange(index, value)}
                                                        className={cn("min-h-[80px] flex-1")}
                                                        disabled={loading}
                                                        autoFocus
                                                        onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
                                                            if (e.key === 'Escape') setEditingField(null);
                                                        }}
                                                    />
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
                                                                    e.target.value = "";
                                                                }}
                                                            />
                                                        </label>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingField(null)} title="Done Editing">
                                                            <X className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div
                                                    className="min-h-[40px] p-3 text-sm border rounded-md bg-muted/20 hover:bg-muted/40 cursor-text transition-colors relative"
                                                    onDoubleClick={() => setEditingField(index)}
                                                >
                                                    <div dangerouslySetInnerHTML={{ __html: fieldValues[index] || "" }} className="prose prose-sm max-w-none dark:prose-invert" />
                                                    {(!fieldValues[index] || fieldValues[index].trim() === "") && (
                                                        <span className="text-muted-foreground italic text-xs">Double click to add content...</span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}

                                {!model && (
                                    <div className="text-center text-muted-foreground py-4">
                                        Could not load model details.
                                    </div>
                                )}

                                <div className="grid gap-2 pt-4 border-t mt-4">
                                    <Label className="text-xs uppercase text-muted-foreground font-semibold tracking-wide">Tags</Label>
                                    <TagInput
                                        selected={tags}
                                        onChange={(newTags) => {
                                            setTags(newTags);
                                            setHasInteracted(true);
                                        }}
                                        placeholder="Add tags..."
                                        disabled={loading} // Always valid
                                    />
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
                <AIKeyRequiredModal open={showAIKeyModal} onOpenChange={setShowAIKeyModal} />
            </>
        </TooltipProvider>
    );
}
