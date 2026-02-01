
import { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Code, Type } from "lucide-react";
import { cn } from "@/lib/utils";
import { htmlToMarkdown, markdownToHtml } from "@/lib/markdown";

interface HtmlInputProps {
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
    className?: string;
    id?: string;
}

export function HtmlInput({ value, onChange, disabled, className, id }: HtmlInputProps) {
    // Mode: 'markdown' (Default Edit), 'html' (Raw HTML Edit)
    // When disabled, we always show the rendered preview.
    const [mode, setMode] = useState<'markdown' | 'html'>('markdown');

    // Internal value to manage cursor state and formatting
    const [internalValue, setInternalValue] = useState("");

    // Track if we are currently editing to prevent external updates from messing with cursor
    const isEditingRef = useRef(false);

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

    // Render Preview (Read Only)
    if (disabled) {
        return (
            <div
                id={id ? `${id}-preview` : undefined}
                className={cn(
                    "min-h-[80px] w-full bg-muted/10 px-3 py-2 text-sm border rounded-md overflow-auto",
                    "prose prose-sm dark:prose-invert max-w-none",
                    className
                )}
                dangerouslySetInnerHTML={{ __html: value }}
            />
        );
    }

    return (
        <div className={cn("relative border rounded-md group", className)}>
            <div className="absolute top-1 right-1 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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

            <Textarea
                id={id}
                value={internalValue}
                onChange={(e) => handleChange(e.target.value)}
                onBlur={handleBlur}
                className={cn(
                    "min-h-[80px] border-0 focus-visible:ring-0 resize-y",
                    mode === 'html' ? "font-mono text-xs" : "text-sm"
                )}
                placeholder={mode === 'markdown' ? "Type here... Use **bold** for bold, __italic__ for italic." : "Enter HTML here..."}
            />
        </div>
    );
}
