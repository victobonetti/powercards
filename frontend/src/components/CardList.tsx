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
import { ArrowLeft, MoreVertical, Pencil } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PaginationControls } from "./ui/pagination-controls";
import { useToast } from "@/hooks/use-toast";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { stringToColor } from "@/lib/colorUtils";

import { useDebounce } from "@/hooks/use-debounce";
import { ArrowUpDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { NoteDialog } from "./NoteDialog";

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
    const [isReadOnly, setIsReadOnly] = useState(false);

    const handleEdit = (card: CardResponse) => {
        setEditingCard(card);
        setIsReadOnly(false);
    };

    const handleView = (card: CardResponse) => {
        setEditingCard(card);
        setIsReadOnly(true);
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
                            placeholder="Search note content or tag=..."
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
                                <TableHead className="w-[100px] text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center h-24">Loading...</TableCell>
                                </TableRow>
                            ) : cards.length > 0 ? (
                                cards.map((card) => (
                                    <TableRow key={card.id} className="cursor-pointer hover:bg-muted/50" onClick={(e) => {
                                        // Prevent triggering when clicking buttons
                                        if ((e.target as HTMLElement).closest('button')) return;
                                        handleView(card);
                                    }}>
                                        <TableCell className="text-xs text-muted-foreground">{card.id}</TableCell>
                                        <TableCell className="max-w-xs truncate" title={(card as any).noteField}>
                                            {(card as any).noteField || "-"}
                                        </TableCell>
                                        <TableCell className="max-w-xs truncate" title={(card as any).noteTags}>
                                            <div className="flex gap-1 flex-wrap">
                                                {((card as any).noteTags || "").split(" ").filter(Boolean).map((tag: string) => {
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
                                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                                        <span className="sr-only">Open menu</span>
                                                        <MoreVertical className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => handleEdit(card)}>
                                                        <Pencil className="mr-2 h-4 w-4" /> Edit
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
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

            <NoteDialog
                noteId={editingCard?.noteId || null}
                open={!!editingCard}
                onOpenChange={(open) => !open && setEditingCard(null)}
                onSaved={handleSaved}
                initialReadOnly={isReadOnly}
            />
        </div>
    );
}
