import { useEffect, useState } from "react";
import { noteApi, modelApi } from "@/lib/api";
import { NoteResponse, AnkiModelResponse } from "@/api/api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { stringToColor } from "@/lib/colorUtils";
import { PaginationControls } from "./ui/pagination-controls";
import { TagInput } from "./ui/tag-input";

export function NoteCRUD() {
    const [notes, setNotes] = useState<NoteResponse[]>([]);
    const [models, setModels] = useState<AnkiModelResponse[]>([]);
    const [totalNotes, setTotalNotes] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [perPage] = useState(10);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [selectedModel, setSelectedModel] = useState<AnkiModelResponse | null>(null);
    const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
    const [selectedTags, setSelectedTags] = useState<string[]>([]);

    // Edit State
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editingNote, setEditingNote] = useState<NoteResponse | null>(null);
    const [editFields, setEditFields] = useState<string[]>([]);
    const [editTags, setEditTags] = useState<string[]>([]);

    // Delete State
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [deleteNoteId, setDeleteNoteId] = useState<number | null>(null);

    const { toast } = useToast();

    const fetchNotes = async (page: number) => {
        try {
            const response = await noteApi.v1NotesGet(page, perPage);
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
    }, [currentPage]);

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

    const handleEditClick = (note: NoteResponse) => {
        setEditingNote(note);
        setEditFields(note.fields?.split("\u001f") || []);
        setEditTags(note.tags ? note.tags.split(" ").filter(t => t.length > 0) : []);
        setIsEditOpen(true);
    };

    const updateNote = async () => {
        if (!editingNote || !editingNote.id) return;
        try {
            await noteApi.v1NotesIdPut(editingNote.id, {
                modelId: editingNote.modelId,
                fields: editFields.join("\u001f"),
                tags: editTags.join(" "),
            });
            setIsEditOpen(false);
            fetchNotes(currentPage);
            toast({ title: "Success", description: "Note updated successfully" });
        } catch (error) {
            toast({ title: "Error", description: "Failed to update note", variant: "destructive" });
        }
    };

    const handleDeleteClick = (id: number) => {
        setDeleteNoteId(id);
        setIsDeleteOpen(true);
    };

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

    const totalPages = Math.ceil(totalNotes / perPage) || 1;

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>Notes</CardTitle>
                        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                            <DialogTrigger asChild>
                                <Button size="sm">
                                    <Plus className="mr-2 h-4 w-4" /> New Note
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
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
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-24">ID</TableHead>
                                <TableHead>Field Content</TableHead>
                                <TableHead>Tags</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {notes.map((note) => (
                                <TableRow key={note.id}>
                                    <TableCell className="text-xs text-muted-foreground">{note.id}</TableCell>
                                    <TableCell className="font-medium max-w-xs truncate">
                                        {note.fields?.split("\u001f")[0]}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-wrap gap-1">
                                            {note.tags?.split(" ").filter(t => t.length > 0).map(tag => {
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
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                                    <MoreVertical className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => handleEditClick(note)}>
                                                    <Pencil className="mr-2 h-4 w-4" /> Edit
                                                </DropdownMenuItem>
                                                <DropdownMenuItem className="text-red-600" onClick={() => note.id && handleDeleteClick(note.id)}>
                                                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {notes.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center text-muted-foreground h-24">
                                        No notes found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                    <PaginationControls
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                        totalItems={totalNotes}
                        perPage={perPage}
                    />
                </CardContent>
            </Card>

            {/* Edit Dialog */}
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Edit Note</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        {editFields.map((fieldValue, idx) => (
                            <div key={idx} className="space-y-2">
                                <Label>Field {idx + 1}</Label>
                                <Input
                                    value={fieldValue}
                                    onChange={(e) => {
                                        const newFields = [...editFields];
                                        newFields[idx] = e.target.value;
                                        setEditFields(newFields);
                                    }}
                                />
                            </div>
                        ))}
                        <div className="space-y-2">
                            <Label>Tags</Label>
                            <TagInput selected={editTags} onChange={setEditTags} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={updateNote}>Save Changes</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Note</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete this note? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>Cancel</Button>
                        <Button variant="destructive" onClick={confirmDelete}>Delete</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
