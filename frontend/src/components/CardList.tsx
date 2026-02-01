import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { cardApi, noteApi } from "@/lib/api";
import { CardResponse } from "@/api/api";
import { BulkMoveDialog } from "./BulkMoveDialog";
import { BulkTagDialog } from "./BulkTagDialog";
import { ConfirmationDialog } from "./ui/confirmation-dialog";
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
    const [perPage, setPerPage] = useState(10);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    // Bulk Actions State
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [isBulkMoveOpen, setIsBulkMoveOpen] = useState(false);
    const [isBulkTagOpen, setIsBulkTagOpen] = useState(false);
    const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);

    // Search & Sort
    const [searchParams, setSearchParams] = useSearchParams();
    const [search, setSearch] = useState(searchParams.get("search") || "");
    const debouncedSearch = useDebounce(search, 500);
    const [sort, setSort] = useState("id");

    // Reset selection on deck change or page change? 
    // Usually keep selection on current page? Or global?
    // Let's reset on page change for simplicity or keep it?
    // Simple: reset on page change.
    useEffect(() => {
        if (!isSelectionMode) {
            setSelectedIds([]);
        }
    }, [isSelectionMode]);

    useEffect(() => {
        setSelectedIds([]);
    }, [currentPage, deckId, debouncedSearch]);


    const fetchCards = async (page: number) => {
        setLoading(true);
        try {
            const response = await cardApi.v1CardsGet(deckId, page, perPage, debouncedSearch, sort);
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
    }, [deckId, currentPage, debouncedSearch, sort, perPage]);

    // Sync search to URL
    useEffect(() => {
        if (debouncedSearch) {
            setSearchParams({ search: debouncedSearch });
        } else {
            setSearchParams({});
        }
    }, [debouncedSearch, setSearchParams]);


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

    const stripHtml = (html: string) => {
        const tmp = document.createElement("DIV");
        tmp.innerHTML = html;
        return tmp.textContent || tmp.innerText || "";
    };

    const handleBulkMove = async (targetDeckId: number) => {
        try {
            await cardApi.v1CardsBulkMovePost({
                cardIds: selectedIds,
                targetDeckId: targetDeckId
            });
            toast({ title: "Success", description: "Cards moved successfully" });
            fetchCards(currentPage);
            setSelectedIds([]);
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Failed to move cards", variant: "destructive" });
        }
    };

    const handleBulkTag = async (tags: string[]) => {
        try {
            // We need Note IDs for the selected Cards.
            // But we only have Card IDs in selectedIds.
            // We need to map Card ID -> Note ID.
            // Option 1: The current 'cards' array has the data!
            const notesIds = cards
                .filter(c => selectedIds.includes(c.id!))
                .map(c => c.noteId!)
                .filter(id => id !== undefined && id !== null);

            if (notesIds.length === 0) return;

            // Use noteApi (v1NotesBulkTagsPost)
            await noteApi.v1NotesBulkTagsPost({
                noteIds: notesIds,
                tags: tags
            });
            toast({ title: "Success", description: "Tags added successfully" });
            fetchCards(currentPage);
            setSelectedIds([]);
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Failed to add tags", variant: "destructive" });
        }
    };

    const handleBulkDelete = async () => {
        try {
            await cardApi.v1CardsBulkDeletePost({
                ids: selectedIds
            });
            toast({ title: "Success", description: "Cards deleted successfully" });
            fetchCards(currentPage);
            setSelectedIds([]);
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Failed to delete cards", variant: "destructive" });
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={onBack}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <h2 className="text-3xl font-bold tracking-tight">{deckName} - Cards</h2>
            </div>
            <div className="flex justify-end">
                <Button
                    variant={isSelectionMode ? "secondary" : "outline"}
                    onClick={() => setIsSelectionMode(!isSelectionMode)}
                >
                    {isSelectionMode ? "Cancel Selection" : "Select Cards"}
                </Button>
            </div>

            {/* Bulk Actions Bar */}
            {selectedIds.length > 0 && (
                <div className="bg-muted/40 border rounded-lg p-2 flex items-center justify-between sticky top-0 z-10 backdrop-blur-sm">
                    <div className="px-4 text-sm font-medium">
                        {selectedIds.length} selected
                    </div>
                    <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" onClick={() => setIsBulkMoveOpen(true)}>
                            Move to Deck
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setIsBulkTagOpen(true)}>
                            Add Tags
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => setIsBulkDeleteOpen(true)}>
                            Delete
                        </Button>
                    </div>
                </div>
            )}

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
                                {isSelectionMode && (
                                    <TableHead className="w-10">
                                        <input
                                            type="checkbox"
                                            className="h-4 w-4 rounded border-gray-300"
                                            checked={cards.length > 0 && selectedIds.length === cards.length}
                                            ref={input => {
                                                if (input) {
                                                    input.indeterminate = selectedIds.length > 0 && selectedIds.length < cards.length;
                                                }
                                            }}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setSelectedIds(cards.map(c => c.id!));
                                                } else {
                                                    setSelectedIds([]);
                                                }
                                            }}
                                        />
                                    </TableHead>
                                )}
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
                                    <TableCell colSpan={5} className="text-center h-24">Loading...</TableCell>
                                </TableRow>
                            ) : cards.length > 0 ? (
                                cards.map((card) => (
                                    <TableRow
                                        key={card.id}
                                        className={`cursor-pointer hover:bg-muted/50 ${selectedIds.includes(card.id!) ? "bg-muted" : ""}`}
                                        onClick={(e) => {
                                            if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('input')) return;
                                            handleView(card);
                                        }}
                                    >
                                        {isSelectionMode && (
                                            <TableCell>
                                                <input
                                                    type="checkbox"
                                                    className="h-4 w-4 rounded border-gray-300"
                                                    checked={selectedIds.includes(card.id!)}
                                                    onClick={(e) => e.stopPropagation()}
                                                    onChange={(e) => {
                                                        const checked = e.target.checked;
                                                        setSelectedIds(prev =>
                                                            checked ? [...prev, card.id!] : prev.filter(id => id !== card.id)
                                                        );
                                                    }}
                                                />
                                            </TableCell>
                                        )}
                                        <TableCell className="text-xs text-muted-foreground py-1 h-8">{card.id}</TableCell>
                                        <TableCell className="max-w-xs truncate text-xs py-1 h-8" title={(card as any).noteField}>
                                            {stripHtml((card as any).noteField || "-")}
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
                                    <TableCell colSpan={5} className="text-center text-muted-foreground h-24">
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
                        onPerPageChange={(newPerPage) => {
                            setPerPage(newPerPage);
                            setCurrentPage(1);
                        }}
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

            <BulkMoveDialog
                open={isBulkMoveOpen}
                onOpenChange={setIsBulkMoveOpen}
                onConfirm={handleBulkMove}
                itemCount={selectedIds.length}
            />

            <BulkTagDialog
                open={isBulkTagOpen}
                onOpenChange={setIsBulkTagOpen}
                onConfirm={handleBulkTag}
                itemCount={selectedIds.length}
            />

            <ConfirmationDialog
                open={isBulkDeleteOpen}
                onOpenChange={setIsBulkDeleteOpen}
                onConfirm={handleBulkDelete}
                title={`Delete ${selectedIds.length} Cards`}
                description="Are you sure you want to delete the selected cards? This action cannot be undone."
            />
        </div>
    );
}
