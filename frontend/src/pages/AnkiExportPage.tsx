import { useState, useEffect } from "react";
import { useWorkspace } from "../context/WorkspaceContext";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Download } from "lucide-react";
import { deckApi } from "@/lib/api";
import axios from "axios";

interface Deck {
    id: number;
    name: string;
    cardCount?: number;
}

export function AnkiExportPage() {
    const { workspaces, currentWorkspaceId } = useWorkspace();
    const { toast } = useToast();
    const [decks, setDecks] = useState<Deck[]>([]);
    const [selectedDecks, setSelectedDecks] = useState<number[]>([]);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);

    // Derive workspace object
    const workspace = workspaces.find(w => String(w.id) === currentWorkspaceId);

    useEffect(() => {
        if (workspace) {
            fetchDecks();
        }
    }, [workspace]);

    const fetchDecks = async () => {
        try {
            setLoading(true);
            // Fetch first 100 decks for now.
            const response = await deckApi.v1DecksGet(1, 100, "", "name");
            const paginatedData = response.data as any;
            setDecks(paginatedData.data);
        } catch (error) {
            console.error("Failed to fetch decks", error);
            toast({
                title: "Error",
                description: "Failed to load decks.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleToggleDeck = (deckId: number) => {
        setSelectedDecks(prev =>
            prev.includes(deckId)
                ? prev.filter(id => id !== deckId)
                : [...prev, deckId]
        );
    };

    const handleSelectAll = () => {
        if (selectedDecks.length === decks.length) {
            setSelectedDecks([]);
        } else {
            setSelectedDecks(decks.map(d => d.id));
        }
    };

    const handleExport = async () => {
        if (selectedDecks.length === 0) return;

        try {
            setExporting(true);
            const response = await axios.post("/api/v1/anki/export", selectedDecks, {
                responseType: 'blob',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Workspace-Id': workspace?.id
                }
            });

            // Create download link
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'powercards_export.apkg');
            document.body.appendChild(link);
            link.click();
            link.remove();

            toast({
                title: "Success",
                description: "Export downloaded successfully.",
            });
        } catch (error) {
            console.error("Export failed", error);
            toast({
                title: "Error",
                description: "Failed to export decks.",
                variant: "destructive",
            });
        } finally {
            setExporting(false);
        }
    };

    return (
        <div className="h-[calc(100vh-4rem)] w-full flex flex-col gap-6 p-6 pb-0">
            <PageHeader
                title="Download Anki"
                description="Select decks to download as an .apkg file for Anki."
            />

            <div className="flex-1 flex flex-col gap-4 overflow-hidden">
                <div className="flex justify-between items-center bg-card p-4 rounded-lg border shadow-sm">
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="select-all"
                            checked={decks.length > 0 && selectedDecks.length === decks.length}
                            onChange={handleSelectAll}
                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer accent-primary"
                        />
                        <label htmlFor="select-all" className="text-sm font-medium leading-none cursor-pointer select-none">
                            Select All
                        </label>
                        <span className="text-muted-foreground text-sm ml-2">
                            ({selectedDecks.length} selected)
                        </span>
                    </div>
                    <Button onClick={handleExport} disabled={selectedDecks.length === 0 || exporting}>
                        {exporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                        Download Anki Package
                    </Button>
                </div>

                <div className="flex-1 overflow-auto rounded-lg border bg-card text-card-foreground shadow-sm">
                    {loading ? (
                        <div className="flex justify-center items-center h-full">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : decks.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                            <p>No decks found in this workspace.</p>
                        </div>
                    ) : (
                        <div className="divide-y text-sm">
                            {decks.map(deck => (
                                <div key={deck.id} className="flex items-center p-4 hover:bg-muted/50 transition-colors">
                                    <input
                                        type="checkbox"
                                        id={`deck-${deck.id}`}
                                        checked={selectedDecks.includes(deck.id)}
                                        onChange={() => handleToggleDeck(deck.id)}
                                        className="mr-4 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer accent-primary"
                                    />
                                    <div className="flex-1 cursor-pointer select-none" onClick={() => handleToggleDeck(deck.id)}>
                                        <h4 className="font-medium text-base">{deck.name}</h4>
                                        {deck.cardCount !== undefined && (
                                            <p className="text-muted-foreground">{deck.cardCount} cards</p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
