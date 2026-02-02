import { Layers, Upload, Moon, Sun, Pin, Tag } from "lucide-react";
import { useState } from "react";
import { Button } from "./ui/button";
import { useTheme } from "./theme-provider";
import { cn } from "@/lib/utils";
import logo from "@/assets/logo.png";
import logo_collapsed from "@/assets/logo_collapsed.png"
import { WorkspaceSelector } from "./WorkspaceSelector";

interface SidebarProps {
    currentView: "upload" | "decks" | "tags";
    onNavigate: (view: "upload" | "decks" | "tags") => void;
    className?: string;
}


interface SidebarButtonProps {
    icon: React.ElementType;
    label: string;
    isActive: boolean;
    isExpanded: boolean;
    onClick: () => void;
}

function SidebarButton({ icon: Icon, label, isActive, isExpanded, onClick }: SidebarButtonProps) {
    return (
        <Button
            variant={isActive ? "secondary" : "ghost"}
            className={cn(
                "w-full justify-start transition-all duration-200 font-serif",
                isActive ? "bg-orange-100/50 text-orange-700 hover:bg-orange-100/80 dark:bg-orange-950/30 dark:text-orange-400" : "hover:bg-muted/50",
                !isExpanded && "justify-center px-2"
            )}
            onClick={onClick}
            title={!isExpanded ? label : undefined}
        >
            <Icon className={cn("h-4 w-4 shrink-0", isExpanded && "mr-3")} />
            {isExpanded && <span className="font-medium">{label}</span>}
        </Button>
    )
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
                "pb-12 border-r h-full bg-card transition-all duration-300 ease-in-out z-50 flex flex-col shadow-sm",
                isExpanded ? "w-64" : "w-20",
                className
            )}
            onMouseEnter={() => !isPinned && setIsCollapsed(false)}
            onMouseLeave={() => !isPinned && setIsCollapsed(true)}
        >
            <div className="space-y-4 py-6 flex-1">
                <div className={cn("px-4 py-2 flex items-start mb-4 select-none", isExpanded ? "justify-between" : "justify-center")}>
                    {isExpanded ? (
                        <div className="flex items-center gap-3 overflow-hidden">
                            <img src={logo} alt="PowerCards Logo" className="h-32 w-full object-contain" />
                        </div>
                    ) : (
                        <img src={logo_collapsed} alt="PowerCards Logo" className="h-16 w-16 object-contain" />
                    )}
                    {isExpanded && (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setIsPinned(!isPinned)}
                            className="h-8 w-8 text-muted-foreground hover:text-primary"
                            title={isPinned ? "Unpin sidebar" : "Pin sidebar"}
                        >
                            {isPinned ? <Pin className="h-4 w-4 rotate-45" /> : <Pin className="h-4 w-4" />}
                        </Button>
                    )}
                </div>

                <div className="space-y-1 px-2">
                    <SidebarButton
                        icon={Upload}
                        label="Upload Anki"
                        isActive={currentView === "upload"}
                        isExpanded={isExpanded}
                        onClick={() => onNavigate("upload")}
                    />
                    <SidebarButton
                        icon={Layers}
                        label="My Decks"
                        isActive={currentView === "decks"}
                        isExpanded={isExpanded}
                        onClick={() => onNavigate("decks")}
                    />
                    <SidebarButton
                        icon={Tag}
                        label="Tags"
                        isActive={currentView === "tags"}
                        isExpanded={isExpanded}
                        onClick={() => onNavigate("tags")}
                    />
                </div>
            </div>

            <div className={cn("p-4 border-t bg-muted/20 flex flex-col gap-4", !isExpanded && "items-center")}>
                {isExpanded ? (
                    <div className="w-full">
                        <WorkspaceSelector />
                    </div>
                ) : (
                    <Button variant="ghost" size="icon" title="Workspaces" disabled>
                        <span className="font-bold text-xs">WS</span>
                    </Button>
                )}

                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                    className="rounded-full self-center"
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
