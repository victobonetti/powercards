import { useEffect, useState } from "react";
import { deckApi } from "@/lib/api";
import { DeckResponse } from "@/api/api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function DeckCRUD() {
    const [decks, setDecks] = useState<DeckResponse[]>([]);
    const [newDeckName, setNewDeckName] = useState("");
    const { toast } = useToast();

    const fetchDecks = async () => {
        try {
            const response = await deckApi.v1DecksGet();
            setDecks(response.data);
        } catch (error) {
            toast({ title: "Error", description: "Failed to fetch decks", variant: "destructive" });
        }
    };

    const createDeck = async () => {
        if (!newDeckName) return;
        try {
            await deckApi.v1DecksPost({ name: newDeckName });
            setNewDeckName("");
            fetchDecks();
            toast({ title: "Success", description: "Deck created successfully" });
        } catch (error) {
            toast({ title: "Error", description: "Failed to create deck", variant: "destructive" });
        }
    };

    const deleteDeck = async (id: number) => {
        try {
            await deckApi.v1DecksIdDelete(id);
            fetchDecks();
            toast({ title: "Success", description: "Deck deleted successfully" });
        } catch (error) {
            toast({ title: "Error", description: "Failed to delete deck", variant: "destructive" });
        }
    };

    useEffect(() => {
        fetchDecks();
    }, []);

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Create New Deck</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex gap-4">
                        <Input
                            placeholder="Deck name"
                            value={newDeckName}
                            onChange={(e) => setNewDeckName(e.target.value)}
                        />
                        <Button onClick={createDeck}>
                            <Plus className="mr-2 h-4 w-4" /> Create
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Decks</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>ID</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {decks.map((deck) => (
                                <TableRow key={deck.id}>
                                    <TableCell>{deck.id}</TableCell>
                                    <TableCell>{deck.name}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="destructive" size="icon" onClick={() => deck.id && deleteDeck(deck.id)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {decks.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={3} className="text-center text-muted-foreground h-24">
                                        No decks found.
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
