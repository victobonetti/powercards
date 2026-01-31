import { Layers, Upload, Moon, Sun, Pin, Tag } from "lucide-react";
import { useState } from "react";
import { Button } from "./ui/button";
import { useTheme } from "./theme-provider";
import { cn } from "@/lib/utils";

interface SidebarProps {
    currentView: "upload" | "decks" | "tags";
    onNavigate: (view: "upload" | "decks" | "tags") => void;
    className?: string;
}

export function Sidebar({ currentView, onNavigate, className }: SidebarProps) {
    const { theme, setTheme } = useTheme();
    const [isCollapsed, setIsCollapsed] = useState(true);
    const [isPinned, setIsPinned] = useState(false);

    // Derived state: effectively expanded if pinned or not collapsed (hovered)
    const isExpanded = isPinned || !isCollapsed;

    return (
        <div
            className={cn(
                "pb-12 border-r min-h-screen bg-card transition-all duration-300 ease-in-out z-50 flex flex-col",
                isExpanded ? "w-64" : "w-16",
                className
            )}
            onMouseEnter={() => !isPinned && setIsCollapsed(false)}
            onMouseLeave={() => !isPinned && setIsCollapsed(true)}
        >
            <div className="space-y-4 py-4 flex-1">
                <div className={cn("px-4 py-2 flex items-center", isExpanded ? "justify-between" : "justify-center")}>
                    {isExpanded && (
                        <h2 className="text-lg font-semibold tracking-tight text-primary truncate">
                            PowerCards
                        </h2>
                    )}
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsPinned(!isPinned)}
                        className={cn("h-8 w-8", !isExpanded && "hidden")}
                        title={isPinned ? "Unpin sidebar" : "Pin sidebar"}
                    >
                        {isPinned ? <Pin className="h-4 w-4 rotate-45" /> : <Pin className="h-4 w-4" />}
                    </Button>
                </div>

                <div className="space-y-1 px-2">
                    <Button
                        variant={currentView === "upload" ? "secondary" : "ghost"}
                        className={cn("w-full justify-start", !isExpanded && "justify-center px-2")}
                        onClick={() => onNavigate("upload")}
                        title={!isExpanded ? "Upload Anki" : undefined}
                    >
                        <Upload className={cn("h-4 w-4", isExpanded && "mr-2")} />
                        {isExpanded && <span>Upload Anki</span>}
                    </Button>
                    <Button
                        variant={currentView === "decks" ? "secondary" : "ghost"}
                        className={cn("w-full justify-start", !isExpanded && "justify-center px-2")}
                        onClick={() => onNavigate("decks")}
                        title={!isExpanded ? "My Decks" : undefined}
                    >
                        <Layers className={cn("h-4 w-4", isExpanded && "mr-2")} />
                        {isExpanded && <span>My Decks</span>}
                    </Button>
                    <Button
                        variant={currentView === "tags" ? "secondary" : "ghost"}
                        className={cn("w-full justify-start", !isExpanded && "justify-center px-2")}
                        onClick={() => onNavigate("tags")}
                        title={!isExpanded ? "Tags" : undefined}
                    >
                        <Tag className={cn("h-4 w-4", isExpanded && "mr-2")} />
                        {isExpanded && <span>Tags</span>}
                    </Button>
                </div>
            </div>

            <div className={cn("p-4", !isExpanded && "flex justify-center")}>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                    className="rounded-full"
                    title="Toggle theme"
                >
                    <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                    <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                    <span className="sr-only">Toggle theme</span>
                </Button>
            </div>
        </div>
    );
}
