import { useEffect, useState } from "react";
import { deckApi } from "@/lib/api";
import { DeckResponse } from "@/api/api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { CardList } from "./CardList";

interface DeckCRUDProps {
    highlightNew?: boolean;
}

export function DeckCRUD({ highlightNew }: DeckCRUDProps) {
    const [decks, setDecks] = useState<DeckResponse[]>([]);
    const [newDeckName, setNewDeckName] = useState("");
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [selectedDeck, setSelectedDeck] = useState<{ id: number; name: string } | null>(null);
    const { toast } = useToast();

    const fetchDecks = async () => {
        try {
            const response = await deckApi.v1DecksGet();
            setDecks(response.data);
        } catch (error) {
            toast({ title: "Error", description: "Failed to fetch decks", variant: "destructive" });
        }
    };

    // Refetch when highlightNew changes (implies a recent upload)
    useEffect(() => {
        if (highlightNew) {
            fetchDecks();
        }
    }, [highlightNew]);

    const createDeck = async () => {
        if (!newDeckName) return;
        try {
            await deckApi.v1DecksPost({ name: newDeckName });
            setNewDeckName("");
            setIsCreateOpen(false);
            fetchDecks();
            toast({ title: "Success", description: "Deck created successfully" });
        } catch (error) {
            toast({ title: "Error", description: "Failed to create deck", variant: "destructive" });
        }
    };

    const deleteDeck = async (id: number, e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent row click
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

    if (selectedDeck) {
        return (
            <CardList
                deckId={selectedDeck.id}
                deckName={selectedDeck.name}
                onBack={() => setSelectedDeck(null)}
            />
        );
    }

    return (
        <div className="space-y-6">
            <Card className={highlightNew ? "ring-2 ring-primary transition-all duration-500" : ""}>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                            Decks
                            {highlightNew && <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded-full animate-pulse">New Data</span>}
                        </CardTitle>
                        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                            <DialogTrigger asChild>
                                <Button size="sm">
                                    <Plus className="mr-2 h-4 w-4" /> New Deck
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Create New Deck</DialogTitle>
                                    <DialogDescription>
                                        Enter a name for your new deck.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                    <Input
                                        placeholder="Deck name"
                                        value={newDeckName}
                                        onChange={(e) => setNewDeckName(e.target.value)}
                                        onKeyDown={(e) => e.key === "Enter" && createDeck()}
                                    />
                                    <Button onClick={createDeck}>Create</Button>
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
                                <TableHead>Name</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {decks.map((deck) => (
                                <TableRow
                                    key={deck.id}
                                    className="cursor-pointer hover:bg-muted/50"
                                    onClick={() => deck.id && setSelectedDeck({ id: deck.id, name: deck.name || "Untitled" })}
                                >
                                    <TableCell>{deck.id}</TableCell>
                                    <TableCell>{deck.name}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="destructive" size="icon" onClick={(e) => deck.id && deleteDeck(deck.id, e)}>
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
