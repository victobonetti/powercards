import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { DeckResponse } from "@/api/api";
import { deckApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface BulkMoveDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: (deckId: number) => void;
    itemCount: number;
}

export function BulkMoveDialog({ open, onOpenChange, onConfirm, itemCount }: BulkMoveDialogProps) {
    const [decks, setDecks] = useState<DeckResponse[]>([]);
    const [selectedDeckId, setSelectedDeckId] = useState<string>("");
    const { toast } = useToast();

    useEffect(() => {
        if (open) {
            deckApi.v1DecksGet().then(res => {
                const data = res.data as any;
                setDecks(data.data || []);
            }).catch(err => {
                console.error(err);
                toast({ title: "Error", description: "Failed to fetch decks", variant: "destructive" });
            });
        }
    }, [open, toast]);

    const handleConfirm = () => {
        if (!selectedDeckId) return;
        onConfirm(Number(selectedDeckId));
        setSelectedDeckId("");
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Move {itemCount} cards</DialogTitle>
                    <DialogDescription>
                        Select the destination deck for the selected cards.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-2">
                    <Label>Deck</Label>
                    <select
                        className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={selectedDeckId}
                        onChange={(e) => setSelectedDeckId(e.target.value)}
                    >
                        <option value="" disabled>Select a deck</option>
                        {decks.map(deck => (
                            <option key={deck.id} value={String(deck.id)}>
                                {deck.name}
                            </option>
                        ))}
                    </select>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleConfirm} disabled={!selectedDeckId}>Move Cards</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
