import { useState, useEffect, useCallback } from "react";
import { useWorkspace } from "../context/WorkspaceContext";
import { useLanguage } from "../context/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import {
    Download,
    Upload,
    CheckCircle,
    AlertCircle,
    Loader2,
    Layers,
    ArrowRightLeft,
    ArrowRight,
    Library,
    Boxes,
    RefreshCw,
    ExternalLink,
    Search
} from "lucide-react";
import { axiosInstance, deckApi } from "@/lib/api";
import { ImportResponse } from "@/api/custom-types";
import { cn } from "@/lib/utils";
import { useNavigate, useParams } from "react-router-dom";

interface Deck {
    id: number;
    name: string;
    cardCount?: number;
}

export function AnkiBridge() {
    const { t } = useLanguage();
    const { lang } = useParams();
    const navigate = useNavigate();
    const { workspaces, currentWorkspaceId } = useWorkspace();
    const { toast } = useToast();

    // Library State
    const [decks, setDecks] = useState<Deck[]>([]);
    const [loadingDecks, setLoadingDecks] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    // Import State
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [importStatus, setImportStatus] = useState<"idle" | "preview" | "processing" | "success" | "partial" | "error">("idle");
    const [importResult, setImportResult] = useState<ImportResponse | null>(null);
    const [errorMessage, setErrorMessage] = useState("");

    // Export State
    const [isExportingAll, setIsExportingAll] = useState(false);
    const [exportingDeckId, setExportingDeckId] = useState<number | null>(null);

    const workspace = workspaces.find(w => String(w.id) === currentWorkspaceId);

    const fetchDecks = useCallback(async () => {
        if (!workspace) return;
        try {
            setLoadingDecks(true);
            const response = await deckApi.v1DecksGet(1, 100, "", "name");
            const paginatedData = response.data as any;
            setDecks(paginatedData.data || []);
        } catch (error) {
            console.error("Failed to fetch decks", error);
        } finally {
            setLoadingDecks(false);
        }
    }, [workspace]);

    useEffect(() => {
        fetchDecks();
    }, [fetchDecks]);

    const filteredDecks = decks.filter(d =>
        d.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // --- Import Handlers ---

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setImportStatus("preview");
            setErrorMessage("");
        }
    };

    const handleImport = async (force: boolean = false) => {
        if (!file) return;

        setImportStatus("processing");
        setIsUploading(true);

        const formData = new FormData();
        formData.append("file", file);
        formData.append("force", force.toString());

        try {
            const response = await axiosInstance.post<ImportResponse>(`/v1/anki/upload`, formData, {
                headers: { "Content-Type": "multipart/form-data" },
                onUploadProgress: (progressEvent) => {
                    const total = progressEvent.total || file.size;
                    const current = progressEvent.loaded;
                    setUploadProgress(Math.round((current * 100) / total));
                },
            });

            const result = response.data;
            setImportResult(result);

            if (result.status === "SUCCESS") {
                setImportStatus("success");
                fetchDecks(); // Refresh library
                toast({ title: t.auth.importSuccess });
            } else {
                setImportStatus("partial");
            }
        } catch (error: any) {
            console.error("Upload failed", error);
            setImportStatus("error");
            setErrorMessage(error.response?.status === 412 ? t.upload.errorTooLarge : t.upload.errorGeneric);
        } finally {
            setIsUploading(false);
        }
    };

    // --- Export Handlers ---

    const handleExport = async (deckIds: number[], isAll = false) => {
        if (deckIds.length === 0) return;

        if (isAll) setIsExportingAll(true);
        else setExportingDeckId(deckIds[0]);

        try {
            const response = await axiosInstance.post("/v1/anki/export", deckIds, {
                responseType: 'blob',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Workspace-Id': currentWorkspaceId
                }
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', isAll ? 'powercards_collection.apkg' : 'powercards_export.apkg');
            document.body.appendChild(link);
            link.click();
            link.remove();

            toast({ title: "Success", description: "Export downloaded successfully." });
        } catch (error) {
            console.error("Export failed", error);
            toast({ title: "Error", description: "Failed to export.", variant: "destructive" });
        } finally {
            setIsExportingAll(false);
            setExportingDeckId(null);
        }
    };

    return (
        <div className="h-[calc(100vh-4rem)] w-full flex flex-col h-full bg-background/50 backdrop-blur-sm">
            <PageHeader
                title={t.auth.ankiBridge}
                description="Bidirectional sync between PowerCards and Anki"
            />

            <div className="flex-1 min-h-0 container max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-8 overflow-hidden">

                {/* Left Panel: Library Context */}
                <div className="lg:col-span-7 flex flex-col gap-4 overflow-hidden h-full">
                    <div className="flex flex-col gap-4 shrink-0">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Library className="h-5 w-5 text-primary" />
                                <h3 className="text-lg font-semibold">{t.auth.yourLibrary}</h3>
                            </div>
                            <span className="text-xs font-medium bg-muted px-2 py-1 rounded-full text-muted-foreground uppercase tracking-wider">
                                {decks.length} Decks
                            </span>
                        </div>

                        <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder={t.auth.searchDecks}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-9 h-10"
                                />
                            </div>
                            <Button
                                variant="default"
                                size="sm"
                                className="h-10 px-4 bg-primary hover:bg-primary/90 shadow-sm transition-all"
                                onClick={() => handleExport(decks.map(d => d.id), true)}
                                disabled={isExportingAll || decks.length === 0}
                            >
                                {isExportingAll ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                                {t.auth.exportAll}
                            </Button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-auto bg-card rounded-xl border shadow-sm divide-y">
                        {loadingDecks ? (
                            <div className="flex items-center justify-center h-48">
                                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/30" />
                            </div>
                        ) : decks.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-64 text-center p-8 space-y-4">
                                <div className="p-4 bg-muted rounded-full">
                                    <Boxes className="h-12 w-12 text-muted-foreground/40" />
                                </div>
                                <div className="space-y-1">
                                    <p className="font-medium text-muted-foreground">Your library is empty</p>
                                    <p className="text-sm text-muted-foreground/60">
                                        {searchQuery ? "No decks match your search" : "Import from Anki to get started"}
                                    </p>
                                </div>
                            </div>
                        ) : (
                            filteredDecks.map(deck => (
                                <div key={deck.id} className="group flex items-center justify-between p-4 hover:bg-muted/30 transition-all">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 shrink-0 rounded-lg bg-primary/5 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                                            <Layers className="h-5 w-5" />
                                        </div>
                                        <div className="space-y-0.5 min-w-0">
                                            <h4 className="font-medium truncate">{deck.name}</h4>
                                            <p className="text-xs text-muted-foreground">{deck.cardCount || 0} cards</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 text-xs gap-1.5"
                                            onClick={() => navigate(`/${lang}/notes?deckId=${deck.id}`)}
                                        >
                                            <ExternalLink className="h-3.5 w-3.5" /> View
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-8 text-xs gap-1.5 hover:border-primary hover:text-primary"
                                            onClick={() => handleExport([deck.id])}
                                            disabled={exportingDeckId === deck.id}
                                        >
                                            {exportingDeckId === deck.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                                            Export
                                        </Button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Right Panel: Import Actions */}
                <div className="lg:col-span-5 flex flex-col gap-4 overflow-hidden">
                    <div className="flex items-center gap-2">
                        <ArrowRightLeft className="h-5 w-5 text-primary" />
                        <h3 className="text-lg font-semibold">{t.auth.importAnki}</h3>
                    </div>

                    <Card className={cn(
                        "relative transition-all duration-500 overflow-hidden border-2",
                        importStatus === "idle" && "border-dashed hover:border-primary/50",
                        importStatus === "processing" && "border-primary",
                        (importStatus === "success" || importStatus === "partial") && "border-emerald-500",
                        importStatus === "error" && "border-destructive"
                    )}>
                        <CardContent className="p-0">
                            {importStatus === "idle" && (
                                <label className="flex flex-col items-center justify-center p-12 cursor-pointer transition-colors hover:bg-muted/50">
                                    <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mb-6 animate-pulse">
                                        <Upload className="h-10 w-10 text-primary" />
                                    </div>
                                    <div className="text-center space-y-2">
                                        <p className="text-lg font-semibold tracking-tight">{t.auth.importAnki}</p>
                                        <p className="text-sm text-muted-foreground max-w-[240px] leading-relaxed">
                                            {t.auth.importDescription}
                                        </p>
                                    </div>
                                    <input type="file" className="hidden" accept=".apkg" onChange={handleFileChange} />
                                </label>
                            )}

                            {importStatus === "preview" && (
                                <div className="p-8 space-y-6">
                                    <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/50 border">
                                        <div className="h-12 w-12 rounded-lg bg-white flex items-center justify-center shadow-sm border">
                                            <Boxes className="h-6 w-6 text-primary" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold truncate">{file?.name}</p>
                                            <p className="text-xs text-muted-foreground uppercase tracking-widest">
                                                {(file?.size ? file.size / (1024 * 1024) : 0).toFixed(1)} MB • Validating
                                            </p>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="h-[1px] bg-border" />
                                        <Button
                                            className="w-full h-12 text-base font-semibold gap-2 shadow-lg hover:shadow-primary/20 transition-all"
                                            onClick={() => handleImport(false)}
                                        >
                                            Import Collection <ArrowRight className="h-5 w-5" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            className="w-full h-10 text-muted-foreground"
                                            onClick={() => { setFile(null); setImportStatus("idle"); }}
                                        >
                                            {t.common.cancel}
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {importStatus === "processing" && (
                                <div className="p-12 flex flex-col items-center text-center space-y-8">
                                    <div className="relative h-24 w-24">
                                        <div className="absolute inset-0 border-4 border-muted rounded-full" />
                                        <div
                                            className="absolute inset-0 border-4 border-primary rounded-full transition-all duration-300"
                                            style={{
                                                clipPath: `inset(0 0 0 0)`,
                                                transform: `rotate(${uploadProgress * 3.6}deg)`,
                                                borderRightColor: 'transparent',
                                                borderBottomColor: 'transparent'
                                            }}
                                        />
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <span className="text-xl font-bold">{uploadProgress}%</span>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-lg font-semibold">{t.upload.uploading}</p>
                                        <p className="text-sm text-muted-foreground leading-relaxed">
                                            Validating package and extracting cards. <br />
                                            Please don't close this window.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {importStatus === "success" && (
                                <div className="p-8 flex flex-col items-center text-center space-y-6 animate-in zoom-in-95 duration-300">
                                    <div className="h-20 w-20 rounded-full bg-emerald-100 flex items-center justify-center">
                                        <CheckCircle className="h-12 w-12 text-emerald-600" />
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-2xl font-bold text-emerald-600">{t.auth.importSuccess}</p>
                                        <p className="text-sm text-muted-foreground">
                                            {t.auth.importStats.replace("{n}", String(importResult?.importedNotes)).replace("{t}", String(importResult?.updatedNotes || 0))}
                                        </p>
                                    </div>
                                    <div className="w-full grid grid-cols-2 gap-3 pt-4">
                                        <Button onClick={() => navigate(`/${lang}/decks`)} variant="outline">
                                            {t.auth.viewDecks}
                                        </Button>
                                        <Button onClick={() => setImportStatus("idle")}>
                                            Import Another
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {importStatus === "partial" && (
                                <div className="p-8 flex flex-col items-center text-center space-y-6">
                                    <div className="h-20 w-20 rounded-full bg-amber-100 flex items-center justify-center">
                                        <AlertCircle className="h-12 w-12 text-amber-600" />
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-xl font-bold text-amber-600">{t.auth.conflictDetected.replace("{name}", file?.name || "")}</p>
                                        <p className="text-sm text-muted-foreground">
                                            Found {importResult?.skippedNotes} duplicate cards.
                                        </p>
                                    </div>
                                    <div className="w-full space-y-3 pt-4">
                                        <Button className="w-full h-12" onClick={() => handleImport(true)} disabled={isUploading}>
                                            {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                                            {t.auth.mergeDecks}
                                        </Button>
                                        <Button className="w-full h-12" variant="outline" onClick={() => setImportStatus("success")}>
                                            Skip Duplicates
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {importStatus === "error" && (
                                <div className="p-8 flex flex-col items-center text-center space-y-6">
                                    <div className="h-20 w-20 rounded-full bg-destructive/10 flex items-center justify-center">
                                        <AlertCircle className="h-12 w-12 text-destructive" />
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-xl font-bold text-destructive">Upload Failed</p>
                                        <p className="text-sm text-muted-foreground">{errorMessage}</p>
                                    </div>
                                    <Button className="w-full" onClick={() => setImportStatus("preview")}>
                                        Try Again
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Quick Tips */}
                    <div className="mt-auto p-4 rounded-xl bg-indigo-50/50 border border-indigo-100/50 space-y-3">
                        <h4 className="text-xs font-bold uppercase tracking-widest text-indigo-600 flex items-center gap-2">
                            <Boxes className="h-3.5 w-3.5" /> Anki Power User?
                        </h4>
                        <p className="text-xs text-indigo-700 leading-relaxed">
                            You can export your entire collection from Anki Desktop as a <b>.colpkg</b> and drop it here. PowerCards will maintain your deck structure and tags.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
