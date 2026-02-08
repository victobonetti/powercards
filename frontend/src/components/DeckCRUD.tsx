import { useEffect, useState } from "react";
import { deckApi } from "@/lib/api";
import { DeckResponse } from "@/api/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Plus, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CardList } from "./CardList";

import { ConfirmationDialog } from "./ui/confirmation-dialog";

import { useDebounce } from "@/hooks/use-debounce";
import { DataTable } from "./ui/data-table";
import { PageHeader } from "./ui/page-header";
import { useLanguage } from "@/context/LanguageContext";

interface DeckCRUDProps {
    highlightNew?: boolean;
}

export function DeckCRUD({ highlightNew }: DeckCRUDProps) {
    const [decks, setDecks] = useState<DeckResponse[]>([]);
    const [totalDecks, setTotalDecks] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [perPage] = useState(25);
    const [isCreateOpen, setIsCreateOpen] = useState(false);

    // Search & Sort
    const [search, setSearch] = useState("");
    const debouncedSearch = useDebounce(search, 500);
    const [sort, setSort] = useState("id");

    // Create State
    const [newDeckName, setNewDeckName] = useState("");

    // Edit State
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editDeck, setEditDeck] = useState<DeckResponse | null>(null);
    const [editName, setEditName] = useState("");

    // Delete State
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [deleteDeckData, setDeleteDeckData] = useState<DeckResponse | null>(null);
    const [deleteConfirmation, setDeleteConfirmation] = useState("");

    const [selectedDeck, setSelectedDeck] = useState<{ id: number; name: string } | null>(null);

    // Confirmation State
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

    const { toast } = useToast();
    const { t } = useLanguage();

    // ... handleOpenChangeCreate and handleOpenChangeEdit (omitted for brevity in replacement if unchanged, but I'm replacing the whole top part so I need to keep them or be careful with ranges)
    // Actually, I'll replace the fetchDecks and render part mainly.

    const handleOpenChangeCreate = (open: boolean) => {
        if (!open && newDeckName) {
            setPendingAction(() => () => {
                setIsCreateOpen(false);
                setNewDeckName("");
            });
            setIsConfirmOpen(true);
        } else {
            setIsCreateOpen(open);
        }
    };

    const handleOpenChangeEdit = (open: boolean) => {
        if (!open) {
            setPendingAction(() => () => setIsEditOpen(false));
            setIsConfirmOpen(true);
        } else {
            setIsEditOpen(open);
        }
    };

    const fetchDecks = async (page: number) => {
        try {
            const response = await deckApi.v1DecksGet(page, perPage, debouncedSearch, sort);
            const paginatedData = response.data as any;
            setDecks(paginatedData.data);
            setTotalDecks(paginatedData.pagination.total);
        } catch (error) {
            toast({ title: "Error", description: "Failed to fetch decks", variant: "destructive" });
        }
    };

    // Refetch when highlightNew changes or search/sort/page changes
    useEffect(() => {
        fetchDecks(currentPage);
    }, [highlightNew, currentPage, debouncedSearch, sort]);

    // Reset page on search change
    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedSearch]);


    const createDeck = async () => {
        if (!newDeckName) return;
        try {
            await deckApi.v1DecksPost({ name: newDeckName });
            setNewDeckName("");
            setIsCreateOpen(false);
            fetchDecks(currentPage);
            toast({ title: "Success", description: "Deck created successfully" });
        } catch (error) {
            toast({ title: "Error", description: "Failed to create deck", variant: "destructive" });
        }
    };

    const handleEditClick = (deck: DeckResponse, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditDeck(deck);
        setEditName(deck.name || "");
        setIsEditOpen(true);
    };

    const updateDeck = async () => {
        if (!editDeck || !editDeck.id) return;
        try {
            await deckApi.v1DecksIdPut(editDeck.id, { name: editName });
            setEditDeck(null);
            setIsEditOpen(false);
            fetchDecks(currentPage);
            toast({ title: "Success", description: "Deck updated successfully" });
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Failed to update deck", variant: "destructive" });
        }
    };

    const handleDeleteClick = (deck: DeckResponse, e: React.MouseEvent) => {
        e.stopPropagation();
        setDeleteDeckData(deck);
        setDeleteConfirmation("");
        setIsDeleteOpen(true);
    };

    const confirmDelete = async () => {
        if (!deleteDeckData || !deleteDeckData.id) return;
        if (deleteConfirmation !== deleteDeckData.name) return;

        try {
            await deckApi.v1DecksIdDelete(deleteDeckData.id);
            setDeleteDeckData(null);
            setIsDeleteOpen(false);
            fetchDecks(currentPage);
            toast({ title: "Success", description: "Deck deleted successfully" });
        } catch (error) {
            toast({ title: "Error", description: "Failed to delete deck", variant: "destructive" });
        }
    };

    const toggleSort = (field: string) => {
        if (sort === field) {
            setSort(`-${field}`);
        } else {
            setSort(field);
        }
    };


    if (selectedDeck) {
        return (
            <CardList
                deckId={selectedDeck.id}
                deckName={selectedDeck.name}
                onBack={() => setSelectedDeck(null)}
            />
        );
    }

    const totalPages = Math.ceil(totalDecks / perPage) || 1;

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <Card className={`flex flex-col border shadow-sm flex-1 overflow-hidden ${highlightNew ? "ring-2 ring-primary transition-all duration-500" : ""}`}>
                <CardHeader className="p-8">
                    <div className="flex items-center justify-between">
                        <PageHeader
                            title={t.decks.title}
                            description={t.decks.description}
                            className="mb-0"
                        />
                        <div className="flex items-center gap-2">
                            <Input
                                placeholder={t.decks.searchPlaceholder}
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-64"
                            />
                            <Dialog open={isCreateOpen} onOpenChange={handleOpenChangeCreate}>
                                <DialogTrigger asChild>
                                    <Button size="sm">
                                        <Plus className="mr-2 h-4 w-4" /> {t.decks.newDeck}
                                    </Button>
                                </DialogTrigger>
                                <DialogContent onInteractOutside={(e) => e.preventDefault()}>
                                    <DialogHeader>
                                        <DialogTitle>{t.decks.createTitle}</DialogTitle>
                                        <DialogDescription>
                                            {t.decks.createDescription}
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="grid gap-4 py-4">
                                        <Input
                                            placeholder={t.decks.deckNamePlaceholder}
                                            value={newDeckName}
                                            onChange={(e) => setNewDeckName(e.target.value)}
                                            onKeyDown={(e) => e.key === "Enter" && createDeck()}
                                        />
                                        <DialogFooter>
                                            <Button onClick={createDeck}>{t.common.create}</Button>
                                        </DialogFooter>
                                    </div>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col p-0 min-h-0">
                    <DataTable
                        data={decks}
                        columns={[
                            {
                                header: "ID",
                                accessorKey: "id",
                                className: "w-24 text-xs text-muted-foreground",
                                sortKey: "id"
                            },
                            {
                                header: "Name",
                                accessorKey: "name",
                                sortKey: "name"
                            },
                            {
                                header: "Cards",
                                accessorKey: "cardCount",
                                className: "text-right w-32",
                            },
                            {
                                header: "Actions",
                                className: "text-right",
                                cell: (deck) => (
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                                <MoreVertical className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                                            <DropdownMenuItem onClick={(e) => handleEditClick(deck, e)}>
                                                <Pencil className="mr-2 h-4 w-4" /> {t.common.edit}
                                            </DropdownMenuItem>
                                            <DropdownMenuItem className="text-red-600" onClick={(e) => handleDeleteClick(deck, e)}>
                                                <Trash2 className="mr-2 h-4 w-4" /> {t.common.delete}
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                )
                            }
                        ]}
                        keyExtractor={(deck) => String(deck.id)}
                        currentPage={currentPage}
                        totalPages={totalPages}
                        totalItems={totalDecks}
                        perPage={perPage}
                        onPageChange={setCurrentPage}
                        sortColumn={sort}
                        onSort={toggleSort}
                        emptyMessage={t.decks.empty}
                        onRowClick={(deck) => deck.id && setSelectedDeck({ id: deck.id, name: deck.name || "Untitled" })}
                        rowClassName={() => "cursor-pointer hover:bg-muted/50"}
                    />
                </CardContent>
            </Card>


            {/* Edit Dialog */}
            <Dialog open={isEditOpen} onOpenChange={handleOpenChangeEdit}>
                <DialogContent onInteractOutside={(e) => e.preventDefault()}>
                    <DialogHeader>
                        <DialogTitle>{t.decks.editTitle}</DialogTitle>
                        <DialogDescription>{t.decks.editDescription}</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <Input
                            placeholder={t.decks.deckNamePlaceholder}
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && updateDeck()}
                        />
                        <DialogFooter>
                            <Button onClick={updateDeck}>{t.common.save}</Button>
                        </DialogFooter>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t.decks.deleteTitle}</DialogTitle>
                        <DialogDescription>
                            {t.decks.deleteDescription} <strong>{deleteDeckData?.name}</strong>
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <Input
                            placeholder={t.decks.deleteConfirmPlaceholder}
                            value={deleteConfirmation}
                            onChange={(e) => setDeleteConfirmation(e.target.value)}
                            className={deleteConfirmation === deleteDeckData?.name ? "border-green-500" : ""}
                        />
                        <DialogFooter>
                            <Button
                                variant="destructive"
                                onClick={confirmDelete}
                                disabled={deleteConfirmation !== deleteDeckData?.name}
                            >
                                {t.decks.deleteAction}
                            </Button>
                        </DialogFooter>
                    </div>
                </DialogContent>
            </Dialog>

            <ConfirmationDialog
                open={isConfirmOpen}
                onOpenChange={setIsConfirmOpen}
                onConfirm={() => {
                    if (pendingAction) pendingAction();
                    setIsConfirmOpen(false);
                }}
                description="You have unsaved changes. Are you sure you want to close?"
            />
        </div >
    );
}
