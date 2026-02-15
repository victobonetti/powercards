import { useEffect, useState } from "react";
import { noteApi, modelApi } from "@/lib/api";
import { useSearchParams } from "react-router-dom";
import { NoteResponse, AnkiModelResponse } from "@/api/api";
import { getDisplayField, stripHtml } from "@/lib/displayUtils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "./ui/page-header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Plus, Loader2, Sparkles, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { stringToColor } from "@/lib/colorUtils";
import { DataTable } from "./ui/data-table";
import { TagInput } from "./ui/tag-input";
import { ConfirmationDialog } from "./ui/confirmation-dialog";
import { BulkTagDialog } from "./BulkTagDialog";
import { BulkMoveDialog } from "./BulkMoveDialog";
import { useDebounce } from "@/hooks/use-debounce";
import { ResizableSidebar } from "./ui/resizable-sidebar";
import { NoteDetail } from "./NoteDetail";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/auth/AuthProvider";
import { updateProfile } from "@/api/profile";
import { useTask } from "@/context/TaskContext";
import { AIKeyRequiredModal } from "./AIKeyRequiredModal";


interface NoteCRUDProps {
    deckId?: number;
    deckName?: string;
    onBack?: () => void;
}

export function NoteCRUD({ deckId, deckName, onBack }: NoteCRUDProps) {
    const { t } = useLanguage();
    const { profile, updateProfileLocally } = useAuth();
    const { enhanceNote, enhancingNoteIds, registerNoteUpdateCallback } = useTask();
    const [notes, setNotes] = useState<NoteResponse[]>([]);
    const [models, setModels] = useState<AnkiModelResponse[]>([]);
    const [totalNotes, setTotalNotes] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [perPage, setPerPage] = useState(25);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [selectedModel, setSelectedModel] = useState<AnkiModelResponse | null>(null);
    const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [editingNote, setEditingNote] = useState<NoteResponse | null>(null);
    const [loading, setLoading] = useState(false);

    // Search & Sort
    const [searchParams, setSearchParams] = useSearchParams();
    const [search, setSearch] = useState(searchParams.get("search") || "");
    const debouncedSearch = useDebounce(search, 500);
    const [sort, setSort] = useState("id");

    // Delete State
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [deleteNoteId, setDeleteNoteId] = useState<number | null>(null);

    // Bulk Actions State
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [isBatchEnhancing, setIsBatchEnhancing] = useState(false);
    const [isBulkTagOpen, setIsBulkTagOpen] = useState(false);
    const [isBulkMoveOpen, setIsBulkMoveOpen] = useState(false);
    const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);

    // AI Check State
    const [showAIKeyModal, setShowAIKeyModal] = useState(false);
    const [isEnhanceConfirmOpen, setIsEnhanceConfirmOpen] = useState(false);

    // Keyboard Navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (selectedIds.length > 0) {
                    setSelectedIds([]);
                    return;
                }
                if (editingNote) {
                    setEditingNote(null);
                    return;
                }
            }

            if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
                e.preventDefault();
                setSelectedIds(notes.map(n => n.id!));
                return;
            }

            // Do not handle shortcuts if typing in an input
            const target = e.target as HTMLElement;
            if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable) {
                return;
            }

            if (e.key === 'Delete' && selectedIds.length > 0) {
                e.preventDefault();
                setIsBulkDeleteOpen(true);
                return;
            }

            // Only navigate if a note is currently selected/editing
            if (!editingNote) return;

            // Navigation logic below...

            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                e.preventDefault();

                const currentIndex = notes.findIndex(n => n.id === editingNote.id);
                if (currentIndex === -1) return;

                let newIndex = currentIndex;
                if (e.key === 'ArrowDown') {
                    newIndex = Math.min(notes.length - 1, currentIndex + 1);
                } else {
                    newIndex = Math.max(0, currentIndex - 1);
                }

                if (newIndex !== currentIndex) {
                    setEditingNote(notes[newIndex]);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [editingNote, notes, selectedIds]);

    useEffect(() => {
        setSelectedIds([]);
    }, [currentPage, debouncedSearch, deckId]);

    // Confirmation State
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);



    const { toast } = useToast();

    const handleOpenChangeCreate = (open: boolean) => {
        if (!open && (selectedModel || Object.keys(fieldValues).length > 0 || selectedTags.length > 0)) {
            setPendingAction(() => () => {
                setIsCreateOpen(false);
                setSelectedModel(null);
                setFieldValues({});
                setSelectedTags([]);
            });
            setIsConfirmOpen(true);
        } else {
            setIsCreateOpen(open);
        }
    };

    const fetchNotes = async (page: number) => {
        setLoading(true);
        try {
            const response = await noteApi.v1NotesGet(deckId, page, perPage, debouncedSearch, sort);
            const paginatedData = response.data as any;
            setNotes(paginatedData.data);
            setTotalNotes(paginatedData.pagination.total);
        } catch (error) {
            toast({ title: "Error", description: "Failed to fetch notes", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const fetchModels = async () => {
        try {
            const response = await modelApi.v1ModelsGet();
            setModels(response.data);
        } catch (error) {
            console.error("Failed to fetch models", error);
        }
    };

    useEffect(() => {
        fetchNotes(currentPage);
        fetchModels();
    }, [currentPage, debouncedSearch, sort, perPage, deckId]);

    // Listen for background task updates
    useEffect(() => {
        return registerNoteUpdateCallback((noteId) => {
            setNotes(prev => prev.map(n =>
                n.id === noteId ? { ...n, isDraft: true } : n
            ));
        });
    }, [registerNoteUpdateCallback]);

    // Sync search to URL
    useEffect(() => {
        if (debouncedSearch) {
            setSearchParams({ search: debouncedSearch });
        } else {
            setSearchParams({});
        }
    }, [debouncedSearch, setSearchParams]);

    const createNote = async () => {
        if (!selectedModel) return;
        try {
            const fieldsString = selectedModel.fields?.map(f => fieldValues[f.name || ""] || "").join("\u001f") || "";
            await noteApi.v1NotesPost({
                modelId: selectedModel.id,
                fields: fieldsString,
                tags: selectedTags.join(" "),
            });
            setIsCreateOpen(false);
            setSelectedModel(null);
            setFieldValues({});
            setSelectedTags([]);
            fetchNotes(currentPage);
            toast({ title: "Success", description: "Note created successfully" });
        } catch (error) {
            toast({ title: "Error", description: "Failed to create note", variant: "destructive" });
        }
    };

    const handleViewClick = (note: NoteResponse) => {
        setEditingNote(note);
    };

    /**
     * Delete functionality moved to Bulk Actions or potentially Detail View.
     * Single row delete via actions menu is removed per user request.
     */
    const confirmDelete = async () => {
        if (!deleteNoteId) return;
        try {
            await noteApi.v1NotesIdDelete(deleteNoteId);

            if (editingNote?.id === deleteNoteId) {
                setEditingNote(null);
            }

            setDeleteNoteId(null);
            setIsDeleteOpen(false);
            fetchNotes(currentPage);
            toast({ title: "Success", description: "Note deleted successfully" });
        } catch (error) {
            toast({ title: "Error", description: "Failed to delete note", variant: "destructive" });
        }
    };

    const toggleSort = (field: string) => {
        if (sort === field) {
            setSort(`-${field}`);
        } else {
            setSort(field);
        }
    };

    const handleBulkTag = async (tags: string[]) => {
        if (selectedIds.length === 0) return;
        try {
            await noteApi.v1NotesBulkTagsPost({
                noteIds: selectedIds,
                tags: tags
            });
            toast({ title: "Success", description: "Tags added successfully" });
            fetchNotes(currentPage);
            setSelectedIds([]);
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Failed to add tags", variant: "destructive" });
        }
    };

    const handleBulkMove = async (targetDeckId: number) => {
        if (selectedIds.length === 0) return;
        try {
            // @ts-ignore - Check API generation for precise name if needed, assuming v1NotesBulkMovePost
            await noteApi.v1NotesBulkMovePost({
                noteIds: selectedIds,
                targetDeckId: targetDeckId
            });
            toast({ title: "Success", description: "Notes moved successfully" });
            fetchNotes(currentPage);
            setSelectedIds([]);
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Failed to move notes", variant: "destructive" });
        }
    };

    const initiateBatchEnhance = () => {
        if (selectedIds.length === 0) return;

        // Check for API Key
        if (!profile?.hasAiApiKey) {
            setShowAIKeyModal(true);
            return;
        }

        setIsEnhanceConfirmOpen(true);
    };

    const confirmBatchEnhance = async () => {
        setIsEnhanceConfirmOpen(false);
        setIsBatchEnhancing(true);
        try {
            await noteApi.v1NotesBulkEnhancePost({
                noteIds: selectedIds
            });
            toast({ title: "Success", description: "Batch enhancement complete. Drafts created." });
            fetchNotes(currentPage);
            setSelectedIds([]);
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Failed to enhance notes", variant: "destructive" });
        } finally {
            setIsBatchEnhancing(false);
        }
    };

    const handleBulkDelete = async () => {
        if (selectedIds.length === 0) return;
        try {
            await noteApi.v1NotesBulkDeletePost({
                ids: selectedIds
            });

            if (editingNote?.id && selectedIds.includes(editingNote.id)) {
                setEditingNote(null);
            }

            toast({ title: "Success", description: "Notes deleted successfully" });
            fetchNotes(currentPage);
            setSelectedIds([]);
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Failed to delete notes", variant: "destructive" });
        }
    };

    const totalPages = Math.ceil(totalNotes / perPage) || 1;



    return (
        <div className="flex h-full flex-col overflow-hidden">
            <div className="flex h-full overflow-hidden gap-6">
                {/* Main List Area - Flexible width */}
                <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${selectedIds.length === 1 && selectedIds[0] ? 'mr-0' : ''}`}>
                    <div className="w-full h-full flex flex-col">
                        <Card className="flex flex-col border shadow-sm flex-1 overflow-hidden">
                            <CardHeader className="p-8 pb-4 space-y-4 border-b">
                                <PageHeader
                                    title={deckName || t.notes.title}
                                    description={deckName ? `Manage notes in ${deckName}` : t.notes.description}
                                    className="mb-0"
                                >
                                    <div className="flex items-center gap-2">
                                        {onBack && (
                                            <Button variant="ghost" size="icon" onClick={onBack}>
                                                <ArrowLeft className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Input
                                            placeholder={t.notes.searchPlaceholder}
                                            value={search}
                                            onChange={(e) => setSearch(e.target.value)}
                                            className="w-64"
                                        />
                                        <Dialog open={isCreateOpen} onOpenChange={handleOpenChangeCreate}>
                                            <DialogTrigger asChild>
                                                <Button size="sm">
                                                    <Plus className="mr-2 h-4 w-4" /> {t.notes.newNote}
                                                </Button>
                                            </DialogTrigger>

                                            {/* ... Create Dialog Content kept as is ... */}
                                            <DialogContent className="max-w-2xl" onInteractOutside={(e) => e.preventDefault()}>
                                                <DialogHeader>
                                                    <DialogTitle>{t.notes.createTitle}</DialogTitle>
                                                </DialogHeader>
                                                <div className="grid gap-4 py-4">
                                                    <div className="space-y-2">
                                                        <Label>{t.notes.modelLabel}</Label>
                                                        <div className="flex flex-wrap gap-2">
                                                            {models.map(m => (
                                                                <Button
                                                                    key={m.id}
                                                                    variant={selectedModel?.id === m.id ? "default" : "outline"}
                                                                    size="sm"
                                                                    onClick={() => setSelectedModel(m)}
                                                                >
                                                                    {m.name}
                                                                </Button>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    {selectedModel && (
                                                        <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                                                            {selectedModel.fields?.map((field, idx) => (
                                                                <div key={idx} className="space-y-2">
                                                                    <Label>{field.name}</Label>
                                                                    <Input
                                                                        value={fieldValues[field.name || ""] || ""}
                                                                        onChange={(e) => setFieldValues(prev => ({ ...prev, [field.name || ""]: e.target.value }))}
                                                                    />
                                                                </div>
                                                            ))}
                                                            <div className="space-y-2">
                                                                <Label>{t.notes.tagsLabel}</Label>
                                                                <TagInput selected={selectedTags} onChange={setSelectedTags} />
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                                <DialogFooter>
                                                    <Button onClick={createNote} disabled={!selectedModel}>{t.notes.createAction}</Button>
                                                </DialogFooter>
                                            </DialogContent>
                                        </Dialog>
                                    </div>
                                </PageHeader>

                                {/* Bulk Actions Bar - Moved inside header area */}
                                {selectedIds.length > 0 && (
                                    <div className="py-2 flex items-center justify-between animate-in fade-in slide-in-from-top-2">
                                        <div className="text-sm font-medium">
                                            {selectedIds.length} {t.notes.bulkSelected}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button size="sm" variant="outline" onClick={() => setIsBulkMoveOpen(true)}>
                                                Move to Deck
                                            </Button>
                                            <Button size="sm" variant="outline" onClick={() => setIsBulkTagOpen(true)}>
                                                {t.notes.bulkAddTags}
                                            </Button>
                                            <Button size="sm" variant="outline" onClick={initiateBatchEnhance} disabled={enhancingNoteIds.length > 0}>
                                                <Sparkles className="mr-2 h-4 w-4" />
                                                Batch Enhance
                                            </Button>
                                            <Button size="sm" variant="destructive" onClick={() => setIsBulkDeleteOpen(true)}>
                                                {t.notes.bulkDelete}
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </CardHeader>

                            <CardContent className="flex-1 flex flex-col p-0 min-h-0">
                                <DataTable
                                    data={notes}
                                    columns={[
                                        {
                                            header: "ID",
                                            accessorKey: "id",
                                            className: "w-24 text-xs text-muted-foreground",
                                            sortKey: "id"
                                        },
                                        {
                                            header: "Field Content",
                                            className: "max-w-md truncate text-xs py-1 h-8",
                                            cell: (note) => {
                                                const rawField = getDisplayField(note.fields);
                                                const isEnhancing = note.id ? enhancingNoteIds.includes(note.id) : false;
                                                // Should show loader if globally enhancing loop includes this note OR if manual enhance
                                                const isPendingEnhance = note.id ? (isBatchEnhancing && selectedIds.includes(note.id)) : false;
                                                const showLoader = isEnhancing || isPendingEnhance;
                                                const isDraft = !!note.isDraft;

                                                return (
                                                    <div className="flex items-center gap-2 overflow-hidden">
                                                        {showLoader && <Loader2 className="h-3 w-3 animate-spin flex-shrink-0 text-muted-foreground" />}
                                                        {!showLoader && isDraft && (
                                                            <span className="h-2 w-2 rounded-full bg-orange-400 flex-shrink-0" title="Draft (Unsaved Changes)" />
                                                        )}
                                                        <span title={rawField} className="truncate">
                                                            {stripHtml(rawField)}
                                                        </span>
                                                    </div>
                                                );
                                            },
                                            sortKey: "sfld"
                                        },
                                        {
                                            header: "Tags",
                                            className: "max-w-xs truncate",
                                            cell: (note) => (
                                                <div className="flex gap-1 flex-wrap">
                                                    {(note.tags?.split(" ").filter(t => t.length > 0) || []).map((tag: string) => {
                                                        const color = stringToColor(tag);
                                                        return (
                                                            <Badge
                                                                key={tag}
                                                                variant="secondary"
                                                                style={{
                                                                    backgroundColor: `${color}20`,
                                                                    color: color,
                                                                    borderColor: `${color}40`
                                                                }}
                                                            >
                                                                {tag}
                                                            </Badge>
                                                        );
                                                    })}
                                                </div>
                                            )
                                        }
                                    ]}
                                    keyExtractor={(note) => String(note.id)}
                                    currentPage={currentPage}
                                    totalPages={totalPages}
                                    totalItems={totalNotes}
                                    perPage={perPage}
                                    onPageChange={setCurrentPage}
                                    onPerPageChange={(newPerPage) => {
                                        setPerPage(newPerPage);
                                        setCurrentPage(1);
                                    }}
                                    sortColumn={sort}
                                    onSort={toggleSort}

                                    // Selection Mode
                                    selectionMode={true}
                                    selectedIds={selectedIds}
                                    onSelectionChange={setSelectedIds}
                                    isAllSelected={notes.length > 0 && selectedIds.length === notes.length}
                                    onSelectAll={(checked) => {
                                        if (checked) {
                                            setSelectedIds(notes.map(n => n.id!));
                                        } else {
                                            setSelectedIds([]);
                                        }
                                    }}

                                    // Row Interaction
                                    onRowDoubleClick={(note) => handleViewClick(note)}
                                    hideSelectionColumn={true}
                                    rowClassName={(note) => (editingNote?.id === note.id ? "bg-muted border-l-4 border-l-primary" : "") + " select-none"}
                                    isLoading={loading} // Removed isBatchEnhancing to allow rows to be seen
                                    emptyMessage={t.notes.empty}
                                />
                                <div className="p-2 text-xs text-muted-foreground text-center border-t border-muted/20">
                                    Tip: Use Ctrl+Click to select multiple. Double-click to open.
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Side Panel for Detail View */}
                {editingNote && (
                    <ResizableSidebar
                        initialWidth={profile?.preferences ? JSON.parse(profile.preferences).noteDetailWidth || 450 : 450}
                        onResizeEnd={(width) => {
                            const newPrefs = profile?.preferences ? JSON.parse(profile.preferences) : {};
                            newPrefs.noteDetailWidth = width;
                            const prefsString = JSON.stringify(newPrefs);

                            // Optimistic update
                            if (profile) {
                                updateProfileLocally({ ...profile, preferences: prefsString });
                            }

                            // Persist to backend
                            updateProfile({ preferences: prefsString }).catch(err => console.error("Failed to save preferences", err));
                        }}
                    >
                        <NoteDetail
                            noteId={editingNote.id || null}
                            onSaved={() => fetchNotes(currentPage)}
                            onClose={() => setEditingNote(null)}
                            onDraftChange={(isDraft) => {
                                // Optimistic update of the local state without refetching
                                setNotes(prev => prev.map(n =>
                                    n.id === editingNote.id ? { ...n, isDraft } : n
                                ));
                            }}
                            onEnhanceStart={() => { }} // No-op, handled by context
                            onEnhanceEnd={() => { }}   // No-op
                            onEnhance={(id, fields, tags) => {
                                if (editingNote?.modelId) {
                                    enhanceNote(id, fields, tags, editingNote.modelId);
                                }
                            }}
                            isEnhancing={!!editingNote.id && enhancingNoteIds.includes(editingNote.id)}
                        />
                    </ResizableSidebar>
                )}

                <ConfirmationDialog
                    open={isDeleteOpen}
                    onOpenChange={setIsDeleteOpen}
                    onConfirm={confirmDelete}
                    title={t.notes.deleteTitle}
                    description={t.notes.deleteDescription}
                />
                <ConfirmationDialog
                    open={isConfirmOpen}
                    onOpenChange={setIsConfirmOpen}
                    onConfirm={() => {
                        if (pendingAction) pendingAction();
                        setIsConfirmOpen(false);
                    }}
                    title={t.notes.unsavedChangesTitle}
                    description={t.notes.unsavedChangesDescription}
                />

                <ConfirmationDialog
                    open={isEnhanceConfirmOpen}
                    onOpenChange={setIsEnhanceConfirmOpen}
                    onConfirm={confirmBatchEnhance}
                    title="Batch Enhance"
                    description={`Are you sure you want to enhance ${selectedIds.length} notes with AI? This will create drafts for each note.`}
                />

                <AIKeyRequiredModal
                    open={showAIKeyModal}
                    onOpenChange={setShowAIKeyModal}
                />

                <BulkTagDialog
                    open={isBulkTagOpen}
                    onOpenChange={setIsBulkTagOpen}
                    onConfirm={handleBulkTag}
                    itemCount={selectedIds.length}
                />
                <BulkMoveDialog
                    open={isBulkMoveOpen}
                    onOpenChange={setIsBulkMoveOpen}
                    onConfirm={handleBulkMove}
                    itemCount={selectedIds.length}
                />

                <ConfirmationDialog
                    open={isBulkDeleteOpen}
                    onOpenChange={setIsBulkDeleteOpen}
                    onConfirm={handleBulkDelete}
                    title={`Delete ${selectedIds.length} Notes`}
                    description="Are you sure you want to delete the selected notes? This action cannot be undone."
                />
            </div>
        </div>
    );
}
