import * as React from "react";
import { X, Plus, ChevronsUpDown, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Command, CommandGroup, CommandItem, CommandList, CommandEmpty, CommandInput } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { stringToColor } from "@/lib/colorUtils";
import { tagApi } from "@/lib/api";
import { Tag } from "@/api/api";
import { cn } from "@/lib/utils";

interface TagInputProps {
    selected: string[];
    onChange: (tags: string[]) => void;
    placeholder?: string;
}

export function TagInput({ selected, onChange, placeholder = "Add tags..." }: TagInputProps) {
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

    const handleSelect = (tagName: string) => {
        if (selected.includes(tagName)) {
            handleUnselect(tagName);
        } else {
            onChange([...selected, tagName]);
        }
        setInputValue("");
        setOpen(false);
    };

    const handleCreateTag = async () => {
        const trimmed = inputValue.trim();
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
        setOpen(false);
    };

    const filteredTags = allTags.filter((tag) =>
        tag.name?.toLowerCase().includes(inputValue.toLowerCase())
    );

    return (
        <div className="flex flex-col gap-2">
            <div className="flex flex-wrap gap-1 mb-2">
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
            </div>

            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        className="w-full justify-between"
                    >
                        {placeholder}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                    <Command>
                        <CommandInput
                            placeholder="Search or create tag..."
                            value={inputValue}
                            onValueChange={setInputValue}
                        />
                        <CommandList>
                            <CommandEmpty className="py-2 px-4 text-sm">
                                {inputValue && (
                                    <div
                                        className="flex items-center gap-2 cursor-pointer hover:bg-accent hover:text-accent-foreground p-1 rounded-sm"
                                        onClick={handleCreateTag}
                                    >
                                        <Plus className="h-4 w-4" />
                                        <span>Create "{inputValue}"</span>
                                    </div>
                                )}
                                {!inputValue && "No tags found."}
                            </CommandEmpty>
                            <CommandGroup>
                                {allTags.map((tag) => (
                                    <CommandItem
                                        key={tag.id}
                                        value={tag.name}
                                        onSelect={(currentValue) => {
                                            // cmdk lowercases values, so we find the original name
                                            const originalTag = allTags.find(t => t.name?.toLowerCase() === currentValue.toLowerCase());
                                            if (originalTag?.name) {
                                                handleSelect(originalTag.name);
                                            }
                                        }}
                                    >
                                        <div
                                            className="mr-2 h-4 w-4 rounded-full"
                                            style={{ backgroundColor: stringToColor(tag.name || "") }}
                                        />
                                        {tag.name}
                                        <Check
                                            className={cn(
                                                "ml-auto h-4 w-4",
                                                selected.includes(tag.name || "") ? "opacity-100" : "opacity-0"
                                            )}
                                        />
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
        </div>
    );
}
