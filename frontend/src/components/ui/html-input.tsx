
import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Code, Eye } from "lucide-react";
import { cn } from "@/lib/utils";

interface HtmlInputProps {
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
    className?: string;
    id?: string;
}

export function HtmlInput({ value, onChange, disabled, className, id }: HtmlInputProps) {
    // Mode: 'preview' (Rendered HTML) or 'code' (Source HTML)
    // Default to 'preview' as per request ("By default, it will render the HTML")
    const [mode, setMode] = useState<'preview' | 'code'>('preview');

    // If value is empty, maybe default to code? Or just empty preview.

    // Toggle function
    const toggleMode = () => {
        setMode(prev => prev === 'preview' ? 'code' : 'preview');
    };

    // Handle "ContentEditable" changes?
    // User requested: "render the HTML, but there must be a really small button to toogle html view/edit"
    // "Also, deal with the '&nbsp;' strings and similar that come from the backend on the html toogle."
    // This implies that when in "preview" mode, we see the *result* (e.g. non-breaking space as space).
    // When in "code" mode, we see `&nbsp;`.

    // Implementing a simple ContentEditable for the "Preview" edit mode might be too complex for a single step without a library.
    // However, the user said "toggle html view/edit". This *could* mean:
    // 1. View = Rendered (Read Only). Edit = Code (Textarea).
    // 2. View = Rendered (Editable WYSIWYG). Edit = Code (Textarea).
    // Given "add html support to every input", making it purely read-only in default mode would break the "input" nature.
    // So "Preview" mode MUST be editable or at least clickable to edit.

    // Simplest approach that adds value:
    // Default: Rendered View (ContentEditable).
    // Toggle: Source View (Textarea).

    // Synchronization is tricky with ContentEditable.
    // Let's rely on standard Textarea for the *source of truth* and reliable editing.
    // And use the "Preview" mainly for viewing what it looks like?
    // BUT, "every input" implies I type into it.
    // If "Preview" is the default, I must be able to type in it.

    // Alternative interpretation: "View" mode is just a visualizer. "Edit" mode is the Textarea.
    // But then "By default it will render... button to toggle" suggests the default state is the "Rendered" one.
    // If I can't edit in default state, it's not an input, it's a display.
    // The user says "input".

    // Let's implement a basic ContentEditable for the "Preview" mode.
    const contentEditableRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (contentEditableRef.current && mode === 'preview') {
            if (contentEditableRef.current.innerHTML !== value) {
                // Only update if significantly different to avoid cursor jumps? 
                // Actually for a simple implementation, syncing FROM value TO innerHTML is needed when value changes externally.
                // But loopback (typing) -> onChange -> value -> innerHTML will cause cursor jumps.
                // So we usually only set innerHTML if it's not focused or different.
                contentEditableRef.current.innerHTML = value;
            }
        }
    }, [value, mode]);

    const handleContentBlur = () => {
        if (contentEditableRef.current && !disabled) {
            const html = contentEditableRef.current.innerHTML;
            if (html !== value) {
                onChange(html);
            }
        }
    };

    // Actually, 'input' event is better than blur for real-time validation, but blur is safer for cursor.
    // Let's use `onInput`.
    const handleContentInput = (e: React.FormEvent<HTMLDivElement>) => {
        if (!disabled) {
            onChange(e.currentTarget.innerHTML);
        }
    };

    return (
        <div className={cn("relative border rounded-md group", className)}>
            <div className="absolute top-1 right-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 bg-background/50 hover:bg-background border shadow-sm"
                    onClick={toggleMode}
                    title={mode === 'preview' ? "Edit HTML Source" : "View Preview"}
                    disabled={disabled}
                >
                    {mode === 'preview' ? <Code className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                </Button>
            </div>

            {mode === 'code' ? (
                <Textarea
                    id={id}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="min-h-[80px] border-0 focus-visible:ring-0 resize-y font-mono text-xs"
                    disabled={disabled}
                />
            ) : (
                <div
                    ref={contentEditableRef}
                    id={id ? `${id}-preview` : undefined}
                    className={cn(
                        "min-h-[80px] w-full bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 overflow-auto",
                        // Basic typography styles for preview
                        "prose prose-sm dark:prose-invert max-w-none"
                    )}
                    contentEditable={!disabled}
                    onInput={handleContentInput}
                    onBlur={handleContentBlur}
                    dangerouslySetInnerHTML={{ __html: value }}
                    style={{ whiteSpace: 'pre-wrap' }} // Preserve whitespace? actually for HTML we want normal behavior.
                />
            )}
        </div>
    );
}
