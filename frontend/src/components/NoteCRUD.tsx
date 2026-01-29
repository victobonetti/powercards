import { useEffect, useState } from "react";
import { noteApi, modelApi } from "@/lib/api";
import { NoteResponse, AnkiModelResponse } from "@/api/api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";

export function NoteCRUD() {
    const [notes, setNotes] = useState<NoteResponse[]>([]);
    const [models, setModels] = useState<AnkiModelResponse[]>([]);
    const [selectedModelId, setSelectedModelId] = useState<string>("");
    const [fields, setFields] = useState("");
    const [tags, setTags] = useState("");
    const { toast } = useToast();

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
            if (response.data.length > 0) setSelectedModelId(response.data[0].id?.toString() || "");
        } catch (error) {
            toast({ title: "Error", description: "Failed to fetch models", variant: "destructive" });
        }
    };

    const createNote = async () => {
        if (!selectedModelId || !fields) return;
        try {
            await noteApi.v1NotesPost({
                modelId: parseInt(selectedModelId),
                fields: fields,
                tags: tags,
            });
            setFields("");
            setTags("");
            fetchNotes();
            toast({ title: "Success", description: "Note created successfully" });
        } catch (error) {
            toast({ title: "Error", description: "Failed to create note", variant: "destructive" });
        }
    };

    const deleteNote = async (id: number) => {
        try {
            await noteApi.v1NotesIdDelete(id);
            fetchNotes();
            toast({ title: "Success", description: "Note deleted successfully" });
        } catch (error) {
            toast({ title: "Error", description: "Failed to delete note", variant: "destructive" });
        }
    };

    useEffect(() => {
        fetchNotes();
        fetchModels();
    }, []);

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Create New Note</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
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
                        <div className="space-y-2">
                            <Label>Tags (space separated)</Label>
                            <Input
                                placeholder="tag1 tag2"
                                value={tags}
                                onChange={(e) => setTags(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>Fields (JSON string or raw text)</Label>
                        <Input
                            placeholder="e.g. Front\u001fBack"
                            value={fields}
                            onChange={(e) => setFields(e.target.value)}
                        />
                    </div>
                    <Button onClick={createNote} className="w-full">
                        <Plus className="mr-2 h-4 w-4" /> Create Note
                    </Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Notes</CardTitle>
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
                                    <TableCell className="max-w-xs truncate">{note.fields}</TableCell>
                                    <TableCell>{note.tags}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="destructive" size="icon" onClick={() => note.id && deleteNote(note.id)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
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
        </div>
    );
}
