import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { cardApi, noteApi } from "@/lib/api";
import { CardResponse } from "@/api/api";
import { BulkMoveDialog } from "./BulkMoveDialog";
import { BulkTagDialog } from "./BulkTagDialog";
import { ConfirmationDialog } from "./ui/confirmation-dialog";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "./ui/page-header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

import { Badge } from "@/components/ui/badge";
import { stringToColor } from "@/lib/colorUtils";
import { getDisplayField, stripHtml } from "@/lib/displayUtils";

import { useDebounce } from "@/hooks/use-debounce";
import { Input } from "@/components/ui/input";
import { NoteDetail } from "./NoteDetail";
import { ResizableSidebar } from "./ui/resizable-sidebar";
import { DataTable } from "./ui/data-table";

interface CardListProps {
    deckId: number;
    deckName: string;
    onBack: () => void;
}

export function CardList({ deckId, deckName, onBack }: CardListProps) {
    const [cards, setCards] = useState<CardResponse[]>([]);
    const [totalCards, setTotalCards] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [perPage, setPerPage] = useState(25);
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

    const handleView = (card: CardResponse) => {
        setEditingCard(card);
    };

    const handleSaved = () => {
        fetchCards(currentPage);
    };

    const totalPages = Math.ceil(totalCards / perPage) || 1;



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
        <div className="flex h-full flex-col overflow-hidden">
            <div className="flex h-full overflow-hidden gap-6">
                {/* Main List Area */}
                <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${editingCard ? 'mr-0' : ''}`}>
                    <div className="w-full h-full flex flex-col">
                        <Card className="flex flex-col border shadow-sm flex-1 overflow-hidden">
                            <CardHeader className="p-8 pb-4 space-y-4 border-b">
                                <PageHeader
                                    title={deckName}
                                    description="Review and manage cards in this deck."
                                    className="mb-0"
                                >
                                    <div className="flex items-center gap-2">
                                        <Button variant="ghost" size="icon" onClick={onBack}>
                                            <ArrowLeft className="h-4 w-4" />
                                        </Button>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <Input
                                            placeholder="Search note content or tag=..."
                                            value={search}
                                            onChange={(e) => setSearch(e.target.value)}
                                            className="w-64"
                                        />
                                        <Button
                                            variant={isSelectionMode ? "secondary" : "outline"}
                                            onClick={() => setIsSelectionMode(!isSelectionMode)}
                                            size="sm"
                                        >
                                            {isSelectionMode ? "Cancel" : "Select"}
                                        </Button>
                                    </div>
                                </PageHeader>

                                {/* Bulk Actions Bar */}
                                {selectedIds.length > 0 && (
                                    <div className="py-2 flex items-center justify-between animate-in fade-in slide-in-from-top-2">
                                        <div className="text-sm font-medium">
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
                            </CardHeader>

                            <CardContent className="p-0 flex-1 flex flex-col min-h-0">
                                <DataTable
                                    data={cards}
                                    columns={[
                                        {
                                            header: "ID",
                                            accessorKey: "id",
                                            className: "w-24 text-xs text-muted-foreground",
                                            sortKey: "id"
                                        },
                                        {
                                            header: "Note Content",
                                            className: "max-w-xs truncate text-xs py-1 h-8",
                                            cell: (card) => {
                                                const rawField = getDisplayField((card as any).noteField);
                                                return (
                                                    <span title={rawField}>
                                                        {stripHtml(rawField)}
                                                    </span>
                                                );
                                            },
                                            sortKey: "sfld" // Backend usually uses 'sfld' (sort field) for note content, verifying with sort logic: previous code toggled 'sfld'?? No, checking previous code: onClick={() => toggleSort("tags")} for tags, but CardList previously didn't sort by content? 
                                            // Wait, looking at lines 284-293 in original file: 
                                            // ID sort is 'id'. 
                                            // Tags sort is 'tags'.
                                            // Note Content didn't have sort enabled in previous code.
                                            // I'll leave sortKey undefined for now to match behavior, or add if backend supports.
                                            // Update: NoteCRUD uses 'sfld', CardList previously didn't show sort icon on Note Content.
                                        },
                                        {
                                            header: "Tags",
                                            className: "max-w-xs truncate",
                                            sortKey: "tags",
                                            cell: (card) => (
                                                <div className="flex gap-1 flex-wrap" title={(card as any).noteTags}>
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
                                            )
                                        }
                                    ]}
                                    keyExtractor={(card) => String(card.id)}
                                    currentPage={currentPage}
                                    totalPages={totalPages}
                                    totalItems={totalCards}
                                    perPage={perPage}
                                    onPageChange={setCurrentPage}
                                    onPerPageChange={(newPerPage) => {
                                        setPerPage(newPerPage);
                                        setCurrentPage(1);
                                    }}
                                    sortColumn={sort}
                                    onSort={toggleSort}

                                    // Selection Mode
                                    selectionMode={isSelectionMode}
                                    selectedIds={selectedIds}
                                    onSelectionChange={setSelectedIds}
                                    isAllSelected={cards.length > 0 && selectedIds.length === cards.length}
                                    onSelectAll={(checked) => {
                                        if (checked) {
                                            setSelectedIds(cards.map(c => c.id!));
                                        } else {
                                            setSelectedIds([]);
                                        }
                                    }}

                                    // Row Interaction
                                    onRowClick={(card) => handleView(card)}
                                    rowClassName={(card) => editingCard?.id === card.id ? "bg-muted border-l-4 border-l-primary" : ""}
                                    isLoading={loading}
                                    emptyMessage="No cards found."
                                />
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Side Panel for Detail View */}
                {editingCard && (
                    <ResizableSidebar>
                        <NoteDetail
                            noteId={editingCard.noteId || null}
                            onSaved={handleSaved}
                            onClose={() => setEditingCard(null)}
                        />
                    </ResizableSidebar>
                )}

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
        </div>
    );
}
