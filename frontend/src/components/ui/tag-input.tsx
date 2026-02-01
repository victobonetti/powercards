import * as React from "react";
import { X, Plus, ChevronsUpDown, Check, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Command, CommandGroup, CommandItem, CommandList, CommandEmpty, CommandInput } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { stringToColor } from "@/lib/colorUtils";
import { tagApi } from "@/lib/api";
import { Tag } from "@/api/api";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/use-debounce";

interface TagInputProps {
    selected: string[];
    onChange: (tags: string[]) => void;
    placeholder?: string;
    disabled?: boolean;
}

export function TagInput({ selected, onChange, placeholder = "Add tags...", disabled = false }: TagInputProps) {
    const [open, setOpen] = React.useState(false);
    const [inputValue, setInputValue] = React.useState("");
    const [allTags, setAllTags] = React.useState<Tag[]>([]);
    const [loading, setLoading] = React.useState(false);

    // Debounce search input for lazy loading
    const debouncedSearch = useDebounce(inputValue, 300);

    const fetchTags = async (query: string) => {
        setLoading(true);
        try {
            // Using the new search param in API
            const response = await tagApi.v1TagsGet(query);
            setAllTags(response.data);
        } catch (error) {
            console.error("Failed to fetch tags", error);
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => {
        // Fetch initially or when debounced search changes
        fetchTags(debouncedSearch);
    }, [debouncedSearch]);


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

    const createTag = async (name: string) => {
        const trimmed = name.trim();
        if (!trimmed) return;

        if (!selected.includes(trimmed)) {
            onChange([...selected, trimmed]);

            // Check existence in fetched tags (approximate check)
            const exists = allTags.some(t => t.name === trimmed);
            if (!exists) {
                try {
                    await tagApi.v1TagsPost({ name: trimmed });
                    // Refresh current list to include new tag if matching search
                    fetchTags(debouncedSearch);
                } catch (err) {
                    console.error("Failed to create tag in backend", err);
                }
            }
        }
    };

    const handleCreateTag = async () => {
        await createTag(inputValue);
        setInputValue("");
        setOpen(false);
    };

    const onInputChange = (val: string) => {
        // Prevent spaces if user types them, treat as trigger to create tag
        /* Space should not create tags anymore per user request
        if (val.includes(" ")) {
            const parts = val.split(" ");
            // If there's content before space, try to create tag
            if (parts[0]) {
                createTag(parts[0]);
            }
            // Clear input or set to remaining part if any (but typically just clear)
            setInputValue("");
            setOpen(false); // Close popover on creation? or keep open? 
            // User requested "I want only one tag generated at time". 
            return;
        }
        */
        setInputValue(val);
        if (val.trim()) {
            setOpen(true);
        }
    };

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
                            {!disabled && (
                                <button
                                    aria-label="Delete tag"
                                    className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                    }}
                                    onClick={() => handleUnselect(tag)}
                                >
                                    <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                                </button>
                            )}
                        </Badge>
                    );
                })}
            </div>

            <Popover open={open && !disabled} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        className="w-full justify-between"
                        disabled={disabled}
                    >
                        {placeholder}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                    <Command shouldFilter={false}>
                        {/* Disable internal filtering since we use backend search */}
                        <CommandInput
                            placeholder="Search or create tag (Space to create)..."
                            value={inputValue}
                            onValueChange={onInputChange}
                            onKeyDown={(e) => {
                                if (e.key === ' ' || e.key === 'Spacebar') {
                                    e.preventDefault();
                                    handleCreateTag();
                                }
                            }}
                        />
                        <CommandList>
                            <CommandEmpty className="py-2 px-4 text-sm">
                                {loading ? (
                                    <div className="flex items-center justify-center gap-2">
                                        <Loader2 className="h-4 w-4 animate-spin" /> Loading...
                                    </div>
                                ) : inputValue ? (
                                    <div
                                        className="flex items-center gap-2 cursor-pointer hover:bg-accent hover:text-accent-foreground p-1 rounded-sm"
                                        onClick={handleCreateTag}
                                    >
                                        <Plus className="h-4 w-4" />
                                        <span>Create "{inputValue}"</span>
                                    </div>
                                ) : (
                                    "Start typing to search tags."
                                )}
                            </CommandEmpty>
                            <CommandGroup>
                                {allTags.map((tag) => (
                                    <CommandItem
                                        key={tag.id}
                                        value={tag.name}
                                        onSelect={(currentValue) => {
                                            // cmdk might lowercase, but we disabled filtering so value matches
                                            if (tag.name) {
                                                handleSelect(tag.name);
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
