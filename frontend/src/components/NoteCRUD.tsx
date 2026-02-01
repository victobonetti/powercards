import { useEffect, useState } from "react";
import { noteApi, modelApi } from "@/lib/api";
import { useSearchParams } from "react-router-dom";
import { NoteResponse, AnkiModelResponse } from "@/api/api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "./ui/page-header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Plus, ArrowUpDown } from "lucide-react";
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
import { PaginationControls } from "./ui/pagination-controls";
import { TagInput } from "./ui/tag-input";
import { ConfirmationDialog } from "./ui/confirmation-dialog";
import { BulkTagDialog } from "./BulkTagDialog";
import { useDebounce } from "@/hooks/use-debounce";
import { NoteDetail } from "./NoteDetail";

export function NoteCRUD() {
    const [notes, setNotes] = useState<NoteResponse[]>([]);
    const [models, setModels] = useState<AnkiModelResponse[]>([]);
    const [totalNotes, setTotalNotes] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [selectedModel, setSelectedModel] = useState<AnkiModelResponse | null>(null);
    const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [editingNote, setEditingNote] = useState<NoteResponse | null>(null);

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
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [isBulkTagOpen, setIsBulkTagOpen] = useState(false);
    const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);

    useEffect(() => {
        if (!isSelectionMode) {
            setSelectedIds([]);
        }
    }, [isSelectionMode]);

    useEffect(() => {
        setSelectedIds([]);
    }, [currentPage, debouncedSearch]);

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
        try {
            const response = await noteApi.v1NotesGet(page, perPage, debouncedSearch, sort);
            const paginatedData = response.data as any;
            setNotes(paginatedData.data);
            setTotalNotes(paginatedData.pagination.total);
        } catch (error) {
            toast({ title: "Error", description: "Failed to fetch notes", variant: "destructive" });
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
    }, [currentPage, debouncedSearch, sort, perPage]);

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

    const handleBulkDelete = async () => {
        if (selectedIds.length === 0) return;
        try {
            await noteApi.v1NotesBulkDeletePost({
                ids: selectedIds
            });
            toast({ title: "Success", description: "Notes deleted successfully" });
            fetchNotes(currentPage);
            setSelectedIds([]);
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Failed to delete notes", variant: "destructive" });
        }
    };

    const totalPages = Math.ceil(totalNotes / perPage) || 1;

    const stripHtml = (html: string) => {
        const tmp = document.createElement("DIV");
        tmp.innerHTML = html;
        return tmp.textContent || tmp.innerText || "";
    };

    return (
        <div className="flex h-full flex-col overflow-hidden p-10">
            <div className="flex h-full overflow-hidden gap-6">
                {/* Main List Area - Flexible width */}
                <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${selectedIds.length === 1 && selectedIds[0] ? 'mr-0' : ''}`}>
                    <div className="w-full h-full flex flex-col">
                        <Card className="flex flex-col border shadow-sm flex-1 overflow-hidden">
                            <CardHeader className="p-8 pb-4 space-y-4 border-b">
                                <PageHeader
                                    title="Notes"
                                    description="Search and manage all notes in your collection."
                                    className="mb-0"
                                >
                                    <div className="flex items-center gap-2">
                                        <Input
                                            placeholder="Search content or tag=..."
                                            value={search}
                                            onChange={(e) => setSearch(e.target.value)}
                                            className="w-64"
                                        />
                                        <Dialog open={isCreateOpen} onOpenChange={handleOpenChangeCreate}>
                                            <DialogTrigger asChild>
                                                <Button size="sm">
                                                    <Plus className="mr-2 h-4 w-4" /> New Note
                                                </Button>
                                            </DialogTrigger>
                                            {/* ... Create Dialog Content kept as is ... */}
                                            <DialogContent className="max-w-2xl" onInteractOutside={(e) => e.preventDefault()}>
                                                <DialogHeader>
                                                    <DialogTitle>Create New Note</DialogTitle>
                                                </DialogHeader>
                                                <div className="grid gap-4 py-4">
                                                    <div className="space-y-2">
                                                        <Label>Note Model</Label>
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
                                                                <Label>Tags</Label>
                                                                <TagInput selected={selectedTags} onChange={setSelectedTags} />
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                                <DialogFooter>
                                                    <Button onClick={createNote} disabled={!selectedModel}>Create Note</Button>
                                                </DialogFooter>
                                            </DialogContent>
                                        </Dialog>
                                        <Button
                                            variant={isSelectionMode ? "secondary" : "outline"}
                                            onClick={() => setIsSelectionMode(!isSelectionMode)}
                                            size="sm"
                                        >
                                            {isSelectionMode ? "Cancel" : "Select"}
                                        </Button>
                                    </div>
                                </PageHeader>

                                {/* Bulk Actions Bar - Moved inside header area */}
                                {selectedIds.length > 0 && (
                                    <div className="py-2 flex items-center justify-between animate-in fade-in slide-in-from-top-2">
                                        <div className="text-sm font-medium">
                                            {selectedIds.length} selected
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button size="sm" variant="outline" onClick={() => setIsBulkTagOpen(true)}>
                                                Add Tags
                                            </Button>
                                            <Button size="sm" variant="destructive" onClick={() => setIsBulkDeleteOpen(true)}>
                                                Delete
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </CardHeader>

                            <CardContent className="h-[600px] flex flex-col p-0">
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
                                            cell: (note) => (
                                                <span title={note.fields?.split("\u001f")[0] || ""}>
                                                    {stripHtml(note.fields?.split("\u001f")[0] || "")}
                                                </span>
                                            ),
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
                                    onRowClick={(note) => handleViewClick(note)}
                                    rowClassName={(note) => editingNote?.id === note.id ? "bg-muted border-l-4 border-l-primary" : ""}
                                    isLoading={loading}
                                    emptyMessage="No notes found."
                                />
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Side Panel for Detail View */}
                {editingNote && (
                    <div className="w-[450px] min-w-[400px] border-l bg-background shadow-xl z-20 transition-all duration-300 animate-in slide-in-from-right">
                        <NoteDetail
                            noteId={editingNote.id || null}
                            onSaved={() => fetchNotes(currentPage)}
                            onClose={() => setEditingNote(null)}
                        />
                    </div>
                )}

                <ConfirmationDialog
                    open={isDeleteOpen}
                    onOpenChange={setIsDeleteOpen}
                    onConfirm={confirmDelete}
                    title="Delete Note"
                    description="Are you sure you want to delete this note? This action cannot be undone."
                />
                <ConfirmationDialog
                    open={isConfirmOpen}
                    onOpenChange={setIsConfirmOpen}
                    onConfirm={() => {
                        if (pendingAction) pendingAction();
                        setIsConfirmOpen(false);
                    }}
                    title="Unsaved Changes"
                    description="You have unsaved changes. Are you sure you want to discard them?"
                />
                <BulkTagDialog
                    open={isBulkTagOpen}
                    onOpenChange={setIsBulkTagOpen}
                    onConfirm={handleBulkTag}
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
