
import { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Code, Type, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { htmlToMarkdown, markdownToHtml } from "@/lib/markdown";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";

interface HtmlInputProps {
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
    className?: string;
    id?: string;
    autoFocus?: boolean;
    onKeyDown?: React.KeyboardEventHandler<HTMLTextAreaElement>;
}

export function HtmlInput({ value, onChange, disabled, className, id, autoFocus, onKeyDown }: HtmlInputProps) {
    // Mode: 'markdown' (Default Edit), 'html' (Raw HTML Edit)
    // When disabled, we always show the rendered preview.
    const [mode, setMode] = useState<'markdown' | 'html'>('markdown');

    // Internal value to manage cursor state and formatting
    const [internalValue, setInternalValue] = useState("");

    // Track if we are currently editing to prevent external updates from messing with cursor
    const isEditingRef = useRef(false);

    const [showPreview, setShowPreview] = useState(false);

    // Image Modal State
    const [imageModalOpen, setImageModalOpen] = useState(false);
    const [imageModalSrc, setImageModalSrc] = useState<string | null>(null);

    // Initial Sync and External Updates
    useEffect(() => {
        if (!isEditingRef.current) {
            if (mode === 'markdown') {
                const md = htmlToMarkdown(value || "");
                if (md !== internalValue) {
                    setInternalValue(md);
                }
            } else {
                if (value !== internalValue) {
                    setInternalValue(value || "");
                }
            }
        }
    }, [value, mode]);

    // When switching modes, re-sync from prop value to ensure fresh conversion
    useEffect(() => {
        setInternalValue(mode === 'markdown' ? htmlToMarkdown(value || "") : (value || ""));
        isEditingRef.current = false;
    }, [mode]);

    const handleChange = (newValue: string) => {
        isEditingRef.current = true;
        setInternalValue(newValue);

        if (mode === 'markdown') {
            onChange(markdownToHtml(newValue));
        } else {
            onChange(newValue);
        }
    };

    const handleBlur = () => {
        isEditingRef.current = false;
    };

    const handlePreviewClick = (e: React.MouseEvent<HTMLDivElement>) => {
        const target = e.target as HTMLElement;
        if (target.tagName === 'IMG') {
            e.preventDefault();
            const img = target as HTMLImageElement;
            setImageModalSrc(img.src);
            setImageModalOpen(true);
        }
    };

    // Render Preview (Read Only)
    if (disabled) {
        return (
            <>
                <div
                    id={id ? `${id}-preview` : undefined}
                    className={cn(
                        "min-h-[80px] w-full bg-muted/10 px-3 py-2 text-sm border rounded-md overflow-auto",
                        "prose prose-sm dark:prose-invert max-w-none",
                        className
                    )}
                    dangerouslySetInnerHTML={{ __html: value }}
                    onClick={handlePreviewClick}
                />

                <Dialog open={imageModalOpen} onOpenChange={setImageModalOpen}>
                    <DialogContent className="max-w-4xl p-0 overflow-hidden bg-transparent border-none shadow-none flex justify-center items-center">
                        {imageModalSrc && (
                            <img
                                src={imageModalSrc}
                                alt="Expanded view"
                                className="max-w-full max-h-[90vh] object-contain rounded-md"
                            />
                        )}
                    </DialogContent>
                </Dialog>
            </>
        );
    }

    return (
        <div className={cn("relative border rounded-md group", className)}>
            <div className="absolute top-1 right-1 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 p-0.5 rounded-sm backdrop-blur-[2px]">
                {mode === 'markdown' && (
                    <>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className={cn(
                                "h-6 w-6 border shadow-sm",
                                showPreview ? "bg-primary text-primary-foreground hover:bg-primary/90" : "bg-background/50 hover:bg-background"
                            )}
                            onClick={() => setShowPreview(!showPreview)}
                            title={showPreview ? "Hide Preview" : "Show Split View"}
                        >
                            <span className="sr-only">Toggle Preview</span>
                            {/* Simple icon for columns/split view */}
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" /><path d="M12 3v18" /></svg>
                        </Button>

                        <Dialog>
                            <DialogTrigger asChild>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 bg-background/50 hover:bg-background border shadow-sm"
                                    title="Markdown Help"
                                >
                                    <HelpCircle className="h-3 w-3" />
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-md">
                                <DialogHeader>
                                    <DialogTitle>Markdown Guide</DialogTitle>
                                    <DialogDescription>
                                        You can use standard Markdown to format your text.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-2 text-sm">
                                    <div className="grid grid-cols-2 gap-2 border-b pb-2 font-medium text-muted-foreground">
                                        <div>Markdown</div>
                                        <div>Result</div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 items-center">
                                        <code className="bg-muted px-1 rounded"># Header 1</code>
                                        <h1 className="text-xl font-bold">Header 1</h1>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 items-center">
                                        <code className="bg-muted px-1 rounded">## Header 2</code>
                                        <h2 className="text-lg font-bold">Header 2</h2>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 items-center">
                                        <code className="bg-muted px-1 rounded">### Header 3</code>
                                        <h3 className="text-base font-bold">Header 3</h3>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 items-center">
                                        <code className="bg-muted px-1 rounded">**Bold**</code>
                                        <strong>Bold</strong>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 items-center">
                                        <code className="bg-muted px-1 rounded">_Italic_</code>
                                        <em>Italic</em>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 items-center">
                                        <code className="bg-muted px-1 rounded">- List item</code>
                                        <ul className="list-disc list-inside"><li>List item</li></ul>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 items-center">
                                        <code className="bg-muted px-1 rounded">1. Item</code>
                                        <ol className="list-decimal list-inside"><li>Item</li></ol>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 items-center">
                                        <code className="bg-muted px-1 rounded">&gt; Quote</code>
                                        <blockquote className="border-l-2 pl-2 italic">Quote</blockquote>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 items-center">
                                        <code className="bg-muted px-1 rounded">`Code`</code>
                                        <code className="bg-muted px-1 rounded">Code</code>
                                    </div>
                                    <div className="col-span-2 pt-2 border-t mt-2 text-xs text-muted-foreground">
                                        <strong>Note:</strong> You can switch to "Raw HTML" mode using the <Code className="inline h-3 w-3" /> icon for advanced editing.
                                    </div>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </>
                )}

                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 bg-background/50 hover:bg-background border shadow-sm"
                    onClick={() => setMode(prev => prev === 'markdown' ? 'html' : 'markdown')}
                    title={mode === 'markdown' ? "Switch to HTML (Advanced)" : "Switch to Markdown (Simple)"}
                >
                    {mode === 'markdown' ? <Code className="h-3 w-3" /> : <Type className="h-3 w-3" />}
                </Button>
            </div>

            <div className={cn("grid", showPreview && mode === 'markdown' ? "grid-cols-2 divide-x" : "grid-cols-1")}>
                <Textarea
                    id={id}
                    value={internalValue}
                    onChange={(e) => handleChange(e.target.value)}
                    onBlur={handleBlur}
                    className={cn(
                        "min-h-[80px] border-0 focus-visible:ring-0 resize-y rounded-none bg-transparent shadow-none",
                        mode === 'html' ? "font-mono text-xs" : "text-sm",
                        // If preview is ON, prevent user from resizing Textarea manually because it breaks grid layout usually.
                        // Or we can let them resize and it affects height of container. Layout shift might happen.
                        // Let's keep resize-y active, it should be fine.
                    )}
                    autoFocus={autoFocus}
                    onKeyDown={onKeyDown}
                    placeholder={mode === 'markdown' ? "Type here... (Markdown supported)" : "Enter HTML here..."}
                />

                {showPreview && mode === 'markdown' && (
                    <div
                        className="p-3 text-sm prose prose-sm dark:prose-invert max-w-none overflow-auto max-h-[500px]"
                        dangerouslySetInnerHTML={{ __html: markdownToHtml(internalValue) }}
                    />
                )}
            </div>
        </div>
    );
}
