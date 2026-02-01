import { Upload, FileUp, CheckCircle, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { useState } from "react";
import axios from "axios";
import { BASE_PATH } from "@/api/base";
import { cn } from "@/lib/utils";
import { ImportResponse } from "@/api/custom-types";

interface UploadAnkiProps {
    onUploadSuccess?: () => void;
}

export function UploadAnki({ onUploadSuccess }: UploadAnkiProps) {
    const [file, setFile] = useState<File | null>(null);
    const [progress, setProgress] = useState(0);
    const [isUploading, setIsUploading] = useState(false);
    const [status, setStatus] = useState<"idle" | "success" | "error" | "partial">("idle");
    const [uploadedSize, setUploadedSize] = useState("0 KB");
    const [errorMessage, setErrorMessage] = useState("");

    // Import result state
    const [importResult, setImportResult] = useState<ImportResponse | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setStatus("idle");
            setProgress(0);
            setImportResult(null);
            setErrorMessage("");
        }
    };

    const handleUpload = async (force: boolean = false) => {
        if (!file) return;

        setIsUploading(true);
        if (!force) {
            setStatus("idle");
            setProgress(0);
            setImportResult(null);
        }

        const formData = new FormData();
        formData.append("file", file);
        formData.append("force", force.toString());

        try {
            const response = await axios.post<ImportResponse>(`${BASE_PATH}/v1/anki/upload`, formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
                onUploadProgress: (progressEvent) => {
                    const total = progressEvent.total || file.size;
                    const current = progressEvent.loaded;
                    const percentCompleted = Math.round((current * 100) / total);
                    setProgress(percentCompleted);

                    const loadedKB = (current / 1024).toFixed(1);
                    setUploadedSize(`${loadedKB} KB`);
                },
            });

            const result = response.data;
            setImportResult(result);

            if (result.status === "SUCCESS") {
                setStatus("success");
                setProgress(100);
                if (onUploadSuccess) {
                    setTimeout(() => {
                        onUploadSuccess();
                    }, 1000);
                }
            } else {
                // PARTIAL or SKIPPED
                setStatus("partial");
                setProgress(100);
            }

        } catch (error: any) {
            console.error("Upload failed", error);
            if (error.response && error.response.status === 412) {
                setErrorMessage("File too large. Please upload a smaller file.");
                setStatus("error");
            } else {
                setErrorMessage("Upload failed. Please try again.");
                setStatus("error");
            }
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="space-y-6 max-w-2xl mx-auto mt-10">
            <div>
                <h3 className="text-2xl font-semibold tracking-tight">Upload Anki Collection</h3>
                <p className="text-muted-foreground">
                    Import your existing .apkg files to start studying.
                </p>
            </div>

            <Card className={cn(
                "border-dashed border-2",
                status === "success" && "border-green-500",
                status === "error" && "border-red-500",
                status === "partial" && "border-yellow-500"
            )}>
                <CardHeader>
                    <CardTitle>File Upload</CardTitle>
                    <CardDescription>Drag and drop your .apkg file here or click to browse.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center space-y-4 py-8">
                    {status === "success" ? (
                        <div className="flex flex-col items-center gap-2">
                            <div className="p-4 bg-green-100 dark:bg-green-900 rounded-full">
                                <CheckCircle className="h-10 w-10 text-green-600 dark:text-green-400" />
                            </div>
                            <div className="text-center">
                                <p className="font-medium text-green-600">Import Successful!</p>
                                <p className="text-sm text-muted-foreground">
                                    Imported: {importResult?.importedNotes} | Updated: {importResult?.updatedNotes}
                                </p>
                            </div>
                        </div>
                    ) : status === "partial" ? (
                        <div className="flex flex-col items-center gap-4 w-full">
                            <div className="p-4 bg-yellow-100 dark:bg-yellow-900 rounded-full">
                                <AlertCircle className="h-10 w-10 text-yellow-600 dark:text-yellow-400" />
                            </div>
                            <div className="text-center space-y-1">
                                <p className="font-medium text-yellow-600">Duplicates Found</p>
                                <p className="text-sm text-muted-foreground">
                                    Imported: {importResult?.importedNotes} <br />
                                    Skipped (Duplicates): {importResult?.skippedNotes} <br />
                                    Updated: {importResult?.updatedNotes}
                                </p>
                            </div>

                            <div className="flex gap-2 w-full max-w-sm">
                                <Button
                                    variant="outline"
                                    className="flex-1"
                                    onClick={() => onUploadSuccess && onUploadSuccess()}
                                >
                                    Done
                                </Button>
                                <Button
                                    className="flex-1"
                                    onClick={() => handleUpload(true)}
                                    disabled={isUploading}
                                >
                                    {isUploading ? (
                                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        <RefreshCw className="mr-2 h-4 w-4" />
                                    )}
                                    Overwrite All
                                </Button>
                            </div>
                        </div>
                    ) : status === "error" ? (
                        <div className="flex flex-col items-center gap-2">
                            <div className="p-4 bg-red-100 dark:bg-red-900 rounded-full">
                                <AlertCircle className="h-10 w-10 text-red-600 dark:text-red-400" />
                            </div>
                            <p className="text-sm font-medium text-red-600 dark:text-red-400">{errorMessage}</p>
                        </div>
                    ) : (
                        <div className="p-4 bg-muted rounded-full">
                            <Upload className="h-10 w-10 text-muted-foreground" />
                        </div>
                    )}

                    {status !== "partial" && (
                        <>
                            <div className="grid w-full max-w-sm items-center gap-1.5">
                                <Label htmlFor="anki-file">Anki Package (.apkg)</Label>
                                <Input
                                    id="anki-file"
                                    type="file"
                                    accept=".apkg"
                                    onChange={handleFileChange}
                                    disabled={isUploading || status === "success"}
                                />
                            </div>

                            {isUploading && (
                                <div className="w-full max-w-sm space-y-2">
                                    <div className="flex justify-between text-xs text-muted-foreground">
                                        <span>Uploading...</span>
                                        <span>{uploadedSize}</span>
                                    </div>
                                    <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-primary transition-all duration-300 ease-out"
                                            style={{ width: `${progress}%` }}
                                        />
                                    </div>
                                    <p className="text-right text-xs text-muted-foreground">{progress}%</p>
                                </div>
                            )}

                            {status === "idle" && (
                                <Button
                                    className="w-full max-w-sm"
                                    onClick={() => handleUpload(false)}
                                    disabled={!file || isUploading}
                                >
                                    {isUploading ? (
                                        <>
                                            <FileUp className="mr-2 h-4 w-4 animate-bounce" /> Uploading...
                                        </>
                                    ) : (
                                        "Upload"
                                    )}
                                </Button>
                            )}
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
