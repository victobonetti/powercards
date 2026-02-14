import { useState, useEffect } from "react";
import { useAuth } from "@/auth/AuthProvider";
import { updateProfile, updateAiSettings } from "@/api/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Moon, Sun, Check, Sparkles, Eye, EyeOff, Trash2, Languages } from "lucide-react";
import { palettes, applyTheme } from "@/lib/themes";
import { useTheme } from "@/components/theme-provider";
import { useLanguage } from "@/context/LanguageContext";
import { Switch } from "@/components/ui/switch"; // Assuming we have a Switch component, if not I'll check or use checkboxes
import { cn } from "@/lib/utils";

interface SettingsModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
    const { user, profile, updateProfileLocally } = useAuth();
    const { toast } = useToast();
    const { theme, setTheme } = useTheme();
    const { t, language, setLanguage } = useLanguage();

    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState("general");

    // General Settings
    const [selectedPalette, setSelectedPalette] = useState("tangerine");
    const [darkMode, setDarkMode] = useState(false);

    // AI Settings
    const [aiProvider, setAiProvider] = useState("");
    const [aiApiKey, setAiApiKey] = useState("");
    const [showApiKey, setShowApiKey] = useState(false);
    const [hasKey, setHasKey] = useState(false);

    useEffect(() => {
        if (open) {
            // Reset state from current app state
            const isSystemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
            const currentThemeIsDark = theme === "dark" || (theme === "system" && isSystemDark);
            setDarkMode(currentThemeIsDark);

            // For palette, we need to read from profile or API.
            // Since I don't want to refetch everything, I'll try to read from localStorage as fallback
            const savedPalette = localStorage.getItem("user-palette") || "tangerine";
            setSelectedPalette(savedPalette);

            // For AI, I definitely need the profile data.
            // I'll add a helper to fetch profile when modal opens
            if (user) {
                // We can use the profile from auth context if available
                // For now, we fetch fresh data to be sure
                fetchProfileData();
            }
        }
    }, [open, user, theme]);

    const fetchProfileData = async () => {
        setLoading(true);
        try {
            // I'll import getProfile
            const { getProfile } = await import("@/api/profile");
            const data = await getProfile();

            setSelectedPalette(data.colorPalette || "tangerine");
            setDarkMode(data.darkMode ?? (theme === "dark")); // Use backend preference if available
            setAiProvider(data.aiProvider || "");
            setHasKey(!!data.hasAiApiKey);

            // Sync theme if backend differs from local?
            // Maybe not force it here, but let user decide.
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }

    // Live Preview Effects
    useEffect(() => {
        if (open) {
            applyTheme(selectedPalette, darkMode);
            const root = window.document.documentElement;
            if (darkMode) {
                root.classList.add("dark");
                root.classList.remove("light");
            } else {
                root.classList.add("light");
                root.classList.remove("dark");
            }
        }
    }, [selectedPalette, darkMode, open]);

    // Revert on Close (if not saved)
    useEffect(() => {
        if (!open && profile) {
            // When closing, revert to the saved user profile settings
            const savedPalette = profile?.colorPalette || localStorage.getItem("user-palette") || "tangerine";
            const savedDarkMode = profile?.darkMode ?? (theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches));

            applyTheme(savedPalette, savedDarkMode);

            // Revert class
            const root = window.document.documentElement;
            if (savedDarkMode) {
                root.classList.add("dark");
                root.classList.remove("light");
            } else {
                root.classList.add("light");
                root.classList.remove("dark");
            }

            // Also reset local state to match saved state for next open
            setSelectedPalette(savedPalette);
            setDarkMode(savedDarkMode);
        }
    }, [open, profile, theme]); // dependent on profile updates

    const handleSaveGeneral = async () => {
        setLoading(true);
        try {
            // Save to Backend
            const updated = await updateProfile({
                colorPalette: selectedPalette,
                darkMode: darkMode
            });

            updateProfileLocally(updated);

            // Persist theme choice to context/localStorage
            setTheme(darkMode ? "dark" : "light");

            toast({ title: t.profile.success, description: "Settings saved" });
        } catch (error) {
            toast({ title: t.profile.error, description: "Failed to save settings", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const handleSaveAi = async () => {
        setLoading(true);
        try {
            const updated = await updateAiSettings(aiProvider, aiApiKey);
            updateProfileLocally(updated);
            setAiApiKey("");
            setHasKey(true);
            toast({ title: t.profile.success, description: t.aiSettings.saved });
        } catch (error) {
            toast({ title: t.profile.error, description: t.aiSettings.saveFailed, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveKey = async () => {
        setLoading(true);
        try {
            const updated = await updateAiSettings("", "");
            updateProfileLocally(updated);
            setAiProvider("");
            setAiApiKey("");
            setHasKey(false);
            toast({ title: t.profile.success, description: t.aiSettings.keyRemoved });
        } catch (error) {
            toast({ title: t.profile.error, description: t.aiSettings.saveFailed, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const providers = [
        { value: "openai", label: t.aiSettings.openai },
        { value: "gemini", label: t.aiSettings.gemini },
        { value: "deepseek", label: t.aiSettings.deepseek },
    ];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Settings</DialogTitle>
                    <DialogDescription>
                        Configure your preferences and AI settings.
                    </DialogDescription>
                </DialogHeader>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="general">General</TabsTrigger>
                        <TabsTrigger value="ai">AI Settings</TabsTrigger>
                    </TabsList>

                    <TabsContent value="general" className="space-y-6 py-4">
                        {/* Language */}
                        <div className="space-y-3">
                            <Label className="text-base flex items-center gap-2">
                                <Languages className="h-4 w-4" /> Language
                            </Label>
                            <div className="flex gap-2">
                                <Button
                                    variant={language === 'en' ? "default" : "outline"}
                                    onClick={() => setLanguage('en')}
                                    className="flex-1"
                                >
                                    English
                                </Button>
                                <Button
                                    variant={language === 'pt' ? "default" : "outline"}
                                    onClick={() => setLanguage('pt')}
                                    className="flex-1"
                                >
                                    Português
                                </Button>
                            </div>
                        </div>

                        <div className="h-[1px] bg-border" />

                        {/* Theme Mode */}
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label className="text-base flex items-center gap-2">
                                    {darkMode ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                                    Dark Mode
                                </Label>
                                <span className="text-sm text-muted-foreground">
                                    Switch between light and dark themes
                                </span>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setDarkMode(!darkMode)}
                                className={cn("w-16", darkMode && "bg-primary text-primary-foreground hover:bg-primary/90")}
                            >
                                {darkMode ? "On" : "Off"}
                            </Button>
                        </div>

                        <div className="h-[1px] bg-border" />

                        {/* Color Palette */}
                        <div className="space-y-3">
                            <Label className="text-base">{t.profile.colorPalette}</Label>
                            <div className="grid grid-cols-5 gap-2">
                                {palettes.map((palette) => (
                                    <button
                                        key={palette.value}
                                        onClick={() => setSelectedPalette(palette.value)}
                                        className={cn(
                                            "w-full aspect-square rounded-md flex items-center justify-center transition-all ring-offset-background",
                                            selectedPalette === palette.value
                                                ? "ring-2 ring-primary scale-95"
                                                : "hover:scale-105"
                                        )}
                                        style={{ backgroundColor: `hsl(${palette.light.primary})` }}
                                        title={palette.name}
                                    >
                                        {selectedPalette === palette.value && (
                                            <Check className="h-5 w-5 text-white drop-shadow-md" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex justify-end pt-4">
                            <Button onClick={handleSaveGeneral} disabled={loading}>
                                {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                                {t.common.save}
                            </Button>
                        </div>
                    </TabsContent>

                    <TabsContent value="ai" className="space-y-6 py-4">
                        <div className="flex items-center justify-between bg-muted/50 p-3 rounded-lg border">
                            <div className="flex items-center gap-2">
                                <Sparkles className="h-4 w-4 text-primary" />
                                <span className="text-sm font-medium">{t.aiSettings.title}</span>
                            </div>
                            {hasKey ? (
                                <span className="text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                                    <Check className="h-3 w-3" /> {t.aiSettings.configured}
                                </span>
                            ) : (
                                <span className="text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 px-2 py-0.5 rounded-full font-medium">
                                    {t.aiSettings.notConfigured}
                                </span>
                            )}
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label>{t.aiSettings.provider}</Label>
                                <select
                                    value={aiProvider}
                                    onChange={(e) => setAiProvider(e.target.value)}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                >
                                    <option value="">{t.aiSettings.providerPlaceholder}</option>
                                    {providers.map(p => (
                                        <option key={p.value} value={p.value}>{p.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <Label>{t.aiSettings.apiKey}</Label>
                                <div className="relative">
                                    <Input
                                        type={showApiKey ? "text" : "password"}
                                        value={aiApiKey}
                                        onChange={(e) => setAiApiKey(e.target.value)}
                                        placeholder={hasKey ? "••••••••••••••••" : t.aiSettings.apiKeyPlaceholder}
                                        className="pr-10"
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="absolute right-0 top-0 h-full px-3 text-muted-foreground"
                                        onClick={() => setShowApiKey(!showApiKey)}
                                    >
                                        {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </Button>
                                </div>
                            </div>

                            <div className="flex gap-2 pt-4">
                                <Button
                                    className="flex-1"
                                    onClick={handleSaveAi}
                                    disabled={loading || (!aiProvider && !aiApiKey)}
                                >
                                    {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                                    {t.aiSettings.saveKey}
                                </Button>

                                {hasKey && (
                                    <Button
                                        variant="outline"
                                        onClick={handleRemoveKey}
                                        disabled={loading}
                                        className="text-destructive border-destructive/50 hover:bg-destructive/10"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>

                <DialogFooter className="sm:justify-start">
                    {/* Optional footer content */}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
