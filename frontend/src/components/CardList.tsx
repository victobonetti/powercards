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

import { useDebounce } from "@/hooks/use-debounce";
import { ArrowUpDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { CardEditDialog } from "./CardEditDialog";

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

    // Search & Sort
    const [search, setSearch] = useState("");
    const debouncedSearch = useDebounce(search, 500);
    const [sort, setSort] = useState("id");

    const fetchCards = async (page: number) => {
        setLoading(true);
        try {
            const response = await cardApi.v1CardsGet(page, perPage, debouncedSearch, sort);
            const paginatedData = response.data as any;
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
    }, [deckId, currentPage, debouncedSearch, sort]);

    // Reset page on search change
    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedSearch]);


    const toggleSort = (field: string) => {
        if (sort === field) {
            setSort(`-${field}`);
        } else {
            setSort(field);
        }
    };


    const [editingCard, setEditingCard] = useState<CardResponse | null>(null);

    const handleEdit = (card: CardResponse) => {
        setEditingCard(card);
    };

    const handleSaved = () => {
        fetchCards(currentPage);
    };

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
                    <div className="flex items-center justify-between">
                        <CardTitle>Card List</CardTitle>
                        <Input
                            placeholder="Search note content..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-64"
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-24 cursor-pointer" onClick={() => toggleSort("id")}>
                                    ID {sort === "id" && <ArrowUpDown className="ml-2 h-4 w-4 inline" />}
                                    {sort === "-id" && <ArrowUpDown className="ml-2 h-4 w-4 inline rotate-180" />}
                                </TableHead>
                                <TableHead>Note Content</TableHead>
                                <TableHead className="cursor-pointer" onClick={() => toggleSort("tags")}>
                                    Tags {sort === "tags" && <ArrowUpDown className="ml-2 h-4 w-4 inline" />}
                                    {sort === "-tags" && <ArrowUpDown className="ml-2 h-4 w-4 inline rotate-180" />}
                                </TableHead>
                                <TableHead className="w-[100px]">Actions</TableHead>
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
                                        <TableCell className="max-w-xs truncate" title={(card as any).noteField}>
                                            {(card as any).noteField || "-"}
                                        </TableCell>
                                        <TableCell className="max-w-xs truncate" title={(card as any).noteTags}>
                                            <div className="flex gap-1 flex-wrap">
                                                {((card as any).noteTags || "").split(" ").filter(Boolean).map((tag: string) => (
                                                    <span key={tag} className="bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded text-xs">
                                                        {tag}
                                                    </span>
                                                ))}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Button variant="outline" size="sm" onClick={() => handleEdit(card)}>
                                                Edit
                                            </Button>
                                        </TableCell>
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

            <CardEditDialog
                card={editingCard}
                open={!!editingCard}
                onOpenChange={(open) => !open && setEditingCard(null)}
                onSaved={handleSaved}
            />
        </div>
    );
}
