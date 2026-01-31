import { useEffect, useState } from "react";
import { cardApi } from "@/lib/api";
import { CardResponse } from "@/api/api";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface CardListProps {
    deckId: number;
    deckName: string;
    onBack: () => void;
}

export function CardList({ deckId, deckName, onBack }: CardListProps) {
    const [cards, setCards] = useState<CardResponse[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCards = async () => {
            try {
                // Assuming the API supports filtering by deckId via query param or we filter client side
                // For now, fetching all and filtering client side if necessary, 
                // OR assuming the endpoint is /v1/cards?deckId=... which is common.
                // If not, we might need to adjust backend.
                // Let's try fetching all and filtering for now to be safe without backend changes yet.
                const response = await cardApi.v1CardsGet();
                const deckCards = response.data.filter(c => c.deckId === deckId);
                setCards(deckCards);
            } catch (error) {
                console.error("Failed to fetch cards", error);
            } finally {
                setLoading(false);
            }
        };

        fetchCards();
    }, [deckId]);

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={onBack}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <h2 className="text-3xl font-bold tracking-tight">{deckName} - Cards</h2>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Card List</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>ID</TableHead>
                                <TableHead>Ordinal</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Due</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center h-24">Loading...</TableCell>
                                </TableRow>
                            ) : cards.length > 0 ? (
                                cards.map((card) => (
                                    <TableRow key={card.id}>
                                        <TableCell>{card.id}</TableCell>
                                        <TableCell>{card.ordinal}</TableCell>
                                        <TableCell>{card.type}</TableCell>
                                        <TableCell>{card.due}</TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center text-muted-foreground h-24">
                                        No cards found in this deck.
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
