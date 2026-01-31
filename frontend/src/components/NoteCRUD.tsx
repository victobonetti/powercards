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

export function NoteCRUD() {
    const [notes, setNotes] = useState<NoteResponse[]>([]);
    const [models, setModels] = useState<AnkiModelResponse[]>([]);
    const { toast } = useToast();

    // Create State
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [selectedModelId, setSelectedModelId] = useState<string>("");
    const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
    const [tags, setTags] = useState("");

    // Delete State
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [deleteNoteId, setDeleteNoteId] = useState<number | null>(null);

    const fetchNotes = async () => {
        try {
            const response = await noteApi.v1NotesGet();
            setNotes(response.data);
        } catch (error) {
            toast({ title: "Error", description: "Failed to fetch notes", variant: "destructive" });
        }
    };

    const fetchModels = async () => {
        try {
            const response = await modelApi.v1ModelsGet();
            setModels(response.data);
            if (response.data.length > 0) {
                // Do not auto-select here to force user choice or handle in Valid effect
                // Actually good UX to select first
                setSelectedModelId(response.data[0].id?.toString() || "");
            }
        } catch (error) {
            toast({ title: "Error", description: "Failed to fetch models", variant: "destructive" });
        }
    };

    useEffect(() => {
        fetchNotes();
        fetchModels();
    }, []);

    // Reset fields when model changes
    useEffect(() => {
        setFieldValues({});
    }, [selectedModelId]);

    const getSelectedModel = () => {
        return models.find(m => m.id?.toString() === selectedModelId);
    };

    const handleFieldChange = (fieldName: string, value: string) => {
        setFieldValues(prev => ({ ...prev, [fieldName]: value }));
    };

    const createNote = async () => {
        if (!selectedModelId) return;

        const model = getSelectedModel();
        if (!model || !model.fields) return;

        // Construct fields string using specific separator (unit separator 0x1f)
        // Order must match model.fields order
        const joinedFields = model.fields.map(f => fieldValues[f.name || ""] || "").join("\x1f");

        try {
            await noteApi.v1NotesPost({
                modelId: parseInt(selectedModelId),
                fields: joinedFields,
                tags: tags,
            });
            setFieldValues({});
            setTags("");
            setIsCreateOpen(false);
            fetchNotes();
            toast({ title: "Success", description: "Note created successfully" });
        } catch (error) {
            toast({ title: "Error", description: "Failed to create note", variant: "destructive" });
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
            fetchNotes();
            toast({ title: "Success", description: "Note deleted successfully" });
        } catch (error) {
            toast({ title: "Error", description: "Failed to delete note", variant: "destructive" });
        }
    };

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
                            <DialogContent className="max-w-xl">
                                <DialogHeader>
                                    <DialogTitle>Create New Note</DialogTitle>
                                    <DialogDescription>
                                        Select a model and fill in the fields.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                    <div className="space-y-2">
                                        <Label>Anki Model</Label>
                                        <select
                                            className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                            value={selectedModelId}
                                            onChange={(e) => setSelectedModelId(e.target.value)}
                                        >
                                            {models.map(m => (
                                                <option key={m.id} value={m.id}>{m.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {getSelectedModel()?.fields?.map((field) => (
                                        <div key={field.name} className="space-y-2">
                                            <Label>{field.name}</Label>
                                            <Input
                                                value={fieldValues[field.name || ""] || ""}
                                                onChange={(e) => handleFieldChange(field.name || "", e.target.value)}
                                            />
                                        </div>
                                    ))}

                                    <div className="space-y-2">
                                        <Label>Tags (space separated)</Label>
                                        <Input
                                            placeholder="tag1 tag2"
                                            value={tags}
                                            onChange={(e) => setTags(e.target.value)}
                                        />
                                    </div>
                                    <DialogFooter>
                                        <Button onClick={createNote}>Create Note</Button>
                                    </DialogFooter>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>ID</TableHead>
                                <TableHead>Fields (Partial)</TableHead>
                                <TableHead>Tags</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {notes.map((note) => (
                                <TableRow key={note.id}>
                                    <TableCell>{note.id}</TableCell>
                                    <TableCell className="max-w-xs truncate">{note.fields?.replace(/\x1f/g, " | ")}</TableCell>
                                    <TableCell>{note.tags}</TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                                    <MoreVertical className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem disabled>
                                                    <Pencil className="mr-2 h-4 w-4" /> Edit (Not Impl)
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
                </CardContent>
            </Card>

            {/* Delete Confirmation Dialog */}
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
