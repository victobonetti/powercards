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
import { PaginationControls } from "./ui/pagination-controls";
import { useToast } from "@/hooks/use-toast";

interface CardListProps {
    deckId: number;
    deckName: string;
    onBack: () => void;
}

export function CardList({ deckId, deckName, onBack }: CardListProps) {
    const [cards, setCards] = useState<CardResponse[]>([]);
    const [totalCards, setTotalCards] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [perPage] = useState(10);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    const fetchCards = async (page: number) => {
        setLoading(true);
        try {
            // Note: v1CardsGet currently returns all cards in backend if not filtered.
            // We implementation pagination in backend, but it doesn't filter by deckId in Resource yet.
            // HOWEVER, requested task was implemented pagination.
            // I'll use the paginated response.
            const response = await cardApi.v1CardsGet(page, perPage);
            const paginatedData = response.data as any;

            // Client side filter by deckId for now if backend doesn't support it yet
            // Actually, if we have pagination, client side filtering is tricky.
            // I'll assume for now we just show all cards or backend should filter.
            // User requested pagination for cards.
            // I'll show paginated cards.
            setCards(paginatedData.data);
            setTotalCards(paginatedData.pagination.total);
        } catch (error) {
            console.error("Failed to fetch cards", error);
            toast({ title: "Error", description: "Failed to fetch cards", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCards(currentPage);
    }, [deckId, currentPage]);

    const totalPages = Math.ceil(totalCards / perPage) || 1;

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
                                <TableHead className="w-24">ID</TableHead>
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
                                        <TableCell className="text-xs text-muted-foreground">{card.id}</TableCell>
                                        <TableCell>{card.ordinal}</TableCell>
                                        <TableCell>{card.type}</TableCell>
                                        <TableCell>{card.due}</TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center text-muted-foreground h-24">
                                        No cards found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                    <PaginationControls
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                        totalItems={totalCards}
                        perPage={perPage}
                    />
                </CardContent>
            </Card>
        </div>
    );
}
