import { Layers, Upload, Moon, Sun, Pin, Tag, HelpCircle, Sparkles, Loader2, Bell } from "lucide-react";
import { useState } from "react";
import { Button } from "./ui/button";
import { useTheme } from "./theme-provider";
import { cn } from "@/lib/utils";
import logo from "@/assets/logo.png";
import logo_collapsed from "@/assets/logo_collapsed.png"
import { WorkspaceSelector } from "./WorkspaceSelector";
import { HelpModal } from "./HelpModal";
import { useFlashcardFactory } from "@/context/FlashcardFactoryContext";

interface SidebarProps {
    currentView: "upload" | "decks" | "tags" | "factory";
    onNavigate: (view: "upload" | "decks" | "tags" | "factory") => void;
    className?: string;
}


interface SidebarButtonProps {
    icon: React.ElementType;
    label: string;
    isActive: boolean;
    isExpanded: boolean;
    onClick: () => void;
    className?: string;
    labelClassName?: string;
}

function SidebarButton({ icon: Icon, label, isActive, isExpanded, onClick, className, labelClassName }: SidebarButtonProps) {
    return (
        <Button
            variant={isActive ? "secondary" : "ghost"}
            className={cn(
                "w-full justify-start transition-all duration-200 font-serif",
                isActive ? "bg-primary/10 text-primary hover:bg-primary/20 dark:bg-primary/20 dark:text-primary" : "hover:bg-muted/50",
                !isExpanded && "justify-center px-2",
                className
            )}
            onClick={onClick}
            title={!isExpanded ? label : undefined}
        >
            <Icon className={cn("h-4 w-4 shrink-0", isExpanded && "mr-3")} />
            {isExpanded && <span className={cn("font-medium", labelClassName)}>{label}</span>}
        </Button>
    )
}

export function Sidebar({ currentView, onNavigate, className }: SidebarProps) {
    const { theme, setTheme } = useTheme();
    const [isCollapsed, setIsCollapsed] = useState(true);
    const [isPinned, setIsPinned] = useState(false);
    const [showHelp, setShowHelp] = useState(false);
    const [helpStep, setHelpStep] = useState(0);

    const { isProcessing, notificationChatIds } = useFlashcardFactory();

    // Derived state: effectively expanded if pinned or not collapsed (hovered)
    const isExpanded = isPinned || !isCollapsed;

    // Spotlight logic:
    // When help search > 0 (feature tour), we lift the sidebar above the modal overlay (z-[100]).
    // Active item gets full opacity + ring. Inactive items get low opacity.
    // When help step == 0 (intro), we keep sidebar at z-50 (under overlay) to focus on modal.
    const isSpotlightMode = showHelp && helpStep > 0;

    const getItemClass = (targetStep: number | number[]) => {
        if (!isSpotlightMode) return "";

        const targets = Array.isArray(targetStep) ? targetStep : [targetStep];
        const isActive = targets.includes(helpStep);

        if (isActive) {
            return "ring-4 ring-primary ring-offset-2 z-50 relative bg-background rounded-md transition-all duration-300 shadow-lg opacity-100";
        }
        return "opacity-20 grayscale transition-all duration-300"; // Dim others
    };

    // Class for items that are never highlighted but valid content (like logo)
    const getDimClass = () => {
        if (!isSpotlightMode) return "";
        return "opacity-20 grayscale transition-all duration-300";
    };

    // Determine Flashcard Factory Icon and State
    let FactoryIcon = Sparkles;
    let factoryButtonClass = "";

    if (isProcessing) {
        FactoryIcon = Loader2; // Loading state
        // Add spin animation class to the icon in pure CSS or via utility if possible, 
        // but lucide Loader2 usually needs 'animate-spin' which we can pass via Icon className in SidebarButton?
        // SidebarButton sets className on Icon. We might need to handle it.
        // Actually SidebarButton does: `className={cn("h-4 w-4 shrink-0", isExpanded && "mr-3")}`
        // We can't easily add animate-spin unless we modify SidebarButton or wrap the Icon.
        // Let's modify SidebarButton slightly or wrap Icon.
    } else if (notificationChatIds.size > 0 && currentView !== "factory") {
        FactoryIcon = Bell; // Notification state
        factoryButtonClass = "text-blue-500 dark:text-blue-400"; // Highlight color
    }

    // Wrapper for Loader to animate + Notification Dot
    const AnimatedFactoryIcon = (props: any) => {
        const hasNotification = notificationChatIds.size > 0 && currentView !== "factory";
        return (
            <div className="relative flex items-center justify-center overflow-visible">
                <FactoryIcon {...props} className={cn(props.className, isProcessing && "animate-spin")} />
                {hasNotification && !isProcessing && (
                    <span className="absolute -top-1.5 -right-1 flex h-3 w-3 z-50">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 border-2 border-background"></span>
                    </span>
                )}
            </div>
        );
    }

    return (
        <div
            className={cn(
                "pb-12 border-r h-full bg-card transition-all duration-300 ease-in-out flex flex-col shadow-sm",
                isExpanded ? "w-64" : "w-20",
                isSpotlightMode ? "z-[100]" : "z-50", // Lift sidebar in spotlight mode
                className
            )}
            onMouseEnter={() => !isPinned && setIsCollapsed(false)}
            onMouseLeave={() => !isPinned && setIsCollapsed(true)}
        >
            <div className="space-y-4 py-6 flex-1">
                <div className={cn("px-4 py-2 flex items-start mb-4 select-none", isExpanded ? "justify-between" : "justify-center", getDimClass())}>
                    {isExpanded ? (
                        <div className="flex items-center gap-3 overflow-hidden relative group">
                            <img src={logo} alt="PowerCards Logo" className="h-32 w-full object-contain grayscale opacity-90 transition-opacity group-hover:opacity-100" />
                            <div
                                className="absolute inset-0 bg-primary mix-blend-color pointer-events-none"
                                style={{
                                    maskImage: `url(${logo})`,
                                    WebkitMaskImage: `url(${logo})`,
                                    maskSize: 'contain',
                                    WebkitMaskSize: 'contain',
                                    maskRepeat: 'no-repeat',
                                    WebkitMaskRepeat: 'no-repeat',
                                    maskPosition: 'center',
                                    WebkitMaskPosition: 'center'
                                }}
                            />
                        </div>
                    ) : (
                        <div className="relative group">
                            <img src={logo_collapsed} alt="PowerCards Logo" className="h-16 w-16 object-contain grayscale opacity-90 transition-opacity group-hover:opacity-100" />
                            <div
                                className="absolute inset-0 bg-primary mix-blend-color pointer-events-none"
                                style={{
                                    maskImage: `url(${logo_collapsed})`,
                                    WebkitMaskImage: `url(${logo_collapsed})`,
                                    maskSize: 'contain',
                                    WebkitMaskSize: 'contain',
                                    maskRepeat: 'no-repeat',
                                    WebkitMaskRepeat: 'no-repeat',
                                    maskPosition: 'center',
                                    WebkitMaskPosition: 'center'
                                }}
                            />
                        </div>
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
                    <div className={cn("transition-all duration-300", getItemClass(2))}>
                        <SidebarButton
                            icon={Upload}
                            label="Upload Anki"
                            isActive={currentView === "upload"}
                            isExpanded={isExpanded}
                            onClick={() => onNavigate("upload")}
                        />
                    </div>
                    <div className={cn("transition-all duration-300", getItemClass(3))}>
                        <SidebarButton
                            icon={Layers}
                            label="My Decks"
                            isActive={currentView === "decks"}
                            isExpanded={isExpanded}
                            onClick={() => onNavigate("decks")}
                        />
                    </div>
                    <div className={cn("transition-all duration-300", getItemClass(3))}>
                        <SidebarButton
                            icon={Tag}
                            label="Tags"
                            isActive={currentView === "tags"}
                            isExpanded={isExpanded}
                            onClick={() => onNavigate("tags")}
                        />
                    </div>
                    <div className={cn("transition-all duration-300", getItemClass(5))}>
                        <SidebarButton
                            icon={AnimatedFactoryIcon}
                            label={isProcessing ? "Thinking..." : (notificationChatIds.size > 0 && currentView !== "factory" ? "Response Ready" : "Flashcard Factory")}
                            labelClassName={notificationChatIds.size > 0 && currentView !== "factory" ? "font-bold" : ""}
                            isActive={currentView === "factory"}
                            isExpanded={isExpanded}
                            onClick={() => onNavigate("factory")}
                            className={factoryButtonClass}
                        />
                    </div>
                </div>
            </div>

            <div className={cn("p-2 w-full transition-all duration-300", getItemClass(1))}>
                {isExpanded ? (
                    <div className="w-full flex justify-center">
                        <WorkspaceSelector />
                    </div>
                ) : (
                    <Button className="w-full" variant="ghost" size="icon" title="Workspaces" disabled>
                        <span className="font-bold text-xs w-full self-center">WS</span>
                    </Button>
                )}
            </div>

            <div className={cn("p-4 border-t bg-muted/20 flex flex-col gap-4", !isExpanded && "items-center", getDimClass())}>

                <div className="flex items-center justify-center gap-2 w-full">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setShowHelp(true)}
                        className={cn(
                            "rounded-full transition-all",
                            showHelp ? "bg-primary text-primary-foreground shadow-md ring-2 ring-primary ring-offset-2" : "text-muted-foreground hover:text-primary"
                        )}
                        title="Help & Walkthrough"
                    >
                        <HelpCircle className="h-[1.2rem] w-[1.2rem]" />
                    </Button>

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
            <HelpModal open={showHelp} onOpenChange={setShowHelp} currentStep={helpStep} onStepChange={setHelpStep} />
        </div >
    );
}
