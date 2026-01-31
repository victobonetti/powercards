import * as React from "react";
import { X, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Command, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { Command as CommandPrimitive } from "cmdk";
import { stringToColor } from "@/lib/colorUtils";
import { tagApi } from "@/lib/api";
import { Tag } from "@/api/api";

interface TagInputProps {
    selected: string[];
    onChange: (tags: string[]) => void;
    placeholder?: string;
}

export function TagInput({ selected, onChange, placeholder = "Add tags..." }: TagInputProps) {
    const inputRef = React.useRef<HTMLInputElement>(null);
    const [open, setOpen] = React.useState(false);
    const [inputValue, setInputValue] = React.useState("");
    const [allTags, setAllTags] = React.useState<Tag[]>([]);

    const fetchTags = async () => {
        try {
            const response = await tagApi.v1TagsGet();
            setAllTags(response.data);
        } catch (error) {
            console.error("Failed to fetch tags", error);
        }
    };

    React.useEffect(() => {
        fetchTags();
    }, []);

    const handleUnselect = (tag: string) => {
        onChange(selected.filter((s) => s !== tag));
    };

    const handleKeyDown = React.useCallback(
        (e: React.KeyboardEvent<HTMLDivElement>) => {
            const input = inputRef.current;
            if (input) {
                if (e.key === "Delete" || e.key === "Backspace") {
                    if (input.value === "") {
                        onChange(selected.slice(0, -1));
                    }
                }
                if (e.key === "Escape") {
                    input.blur();
                }
                if (e.key === "Enter" && inputValue) {
                    handleCreateTag(inputValue);
                }
            }
        },
        [selected, onChange, inputValue]
    );

    const handleCreateTag = async (tagName: string) => {
        const trimmed = tagName.trim();
        if (!trimmed) return;

        if (!selected.includes(trimmed)) {
            // Optimistically add to UI
            onChange([...selected, trimmed]);

            // Ensure it exists in backend
            const exists = allTags.some(t => t.name === trimmed);
            if (!exists) {
                try {
                    await tagApi.v1TagsPost({ name: trimmed });
                    fetchTags();
                } catch (err) {
                    console.error("Failed to create tag in backend", err);
                }
            }
        }
        setInputValue("");
    };

    const selectables = allTags.filter((tag) => !selected.includes(tag.name || ""));

    return (
        <Command onKeyDown={handleKeyDown} className="overflow-visible bg-transparent">
            <div className="group border border-input px-3 py-2 text-sm ring-offset-background rounded-md focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                <div className="flex flex-wrap gap-1">
                    {selected.map((tag) => {
                        const color = stringToColor(tag);
                        return (
                            <Badge
                                key={tag}
                                variant="secondary"
                                style={{
                                    backgroundColor: `${color}20`,
                                    color: color,
                                    borderColor: `${color}40`,
                                }}
                            >
                                {tag}
                                <button
                                    className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            handleUnselect(tag);
                                        }
                                    }}
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                    }}
                                    onClick={() => handleUnselect(tag)}
                                >
                                    <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                                </button>
                            </Badge>
                        );
                    })}
                    <CommandPrimitive.Input
                        ref={inputRef}
                        value={inputValue}
                        onValueChange={setInputValue}
                        onBlur={() => setOpen(false)}
                        onFocus={() => setOpen(true)}
                        placeholder={placeholder}
                        className="ml-2 bg-transparent outline-none placeholder:text-muted-foreground flex-1"
                    />
                </div>
            </div>
            <div className="relative mt-2">
                {open && (inputValue.length > 0 || selectables.length > 0) && (
                    <div className="absolute w-full z-10 top-0 rounded-md border bg-popover text-popover-foreground shadow-md outline-none animate-in">
                        <CommandList>
                            {inputValue.length > 0 && !allTags.some(t => t.name === inputValue) && (
                                <CommandGroup>
                                    <CommandItem
                                        onSelect={() => handleCreateTag(inputValue)}
                                        className="cursor-pointer"
                                    >
                                        <Plus className="mr-2 h-4 w-4" />
                                        Create "{inputValue}"
                                    </CommandItem>
                                </CommandGroup>
                            )}
                            <CommandGroup className="h-full overflow-auto max-h-[200px]">
                                {selectables.map((tag) => (
                                    <CommandItem
                                        key={tag.id}
                                        onSelect={() => {
                                            setInputValue("");
                                            onChange([...selected, tag.name || ""]);
                                        }}
                                        className="cursor-pointer"
                                    >
                                        {tag.name}
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                    </div>
                )}
            </div>
        </Command>
    );
}
