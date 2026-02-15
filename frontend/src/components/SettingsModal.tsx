import { useState, useEffect } from "react";
import { useAuth } from "@/auth/AuthProvider";
import { updateProfile, updateAiSettings } from "@/api/profile";
import { getMfaStatus, setupMfa, verifyMfa, disableMfa } from "@/api/auth";
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
import { Loader2, Save, Moon, Sun, Check, Sparkles, Eye, EyeOff, Trash2, Languages, Shield, AlertTriangle } from "lucide-react";
import { palettes, applyTheme } from "@/lib/themes";
import { useTheme } from "@/components/theme-provider";
import { useLanguage } from "@/context/LanguageContext";

import { cn } from "@/lib/utils";

interface SettingsModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    defaultTab?: string;
}

export function SettingsModal({ open, onOpenChange, defaultTab = "general" }: SettingsModalProps) {
    const { user, profile, updateProfileLocally } = useAuth();
    const { toast } = useToast();
    const { theme, setTheme } = useTheme();
    const { t, language, setLanguage } = useLanguage();

    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState(defaultTab);

    // Update active tab when defaultTab changes or modal opens
    useEffect(() => {
        if (open) {
            setActiveTab(defaultTab);
        }
    }, [open, defaultTab]);

    // General Settings
    const [selectedPalette, setSelectedPalette] = useState("tangerine");
    const [darkMode, setDarkMode] = useState(false);

    // AI Settings
    const [aiProvider, setAiProvider] = useState("");
    const [aiApiKey, setAiApiKey] = useState("");
    const [showApiKey, setShowApiKey] = useState(false);
    const [hasKey, setHasKey] = useState(false);

    // MFA Settings
    const [mfaEnabled, setMfaEnabled] = useState(false);
    const [mfaLoading, setMfaLoading] = useState(false);
    const [mfaSetupMode, setMfaSetupMode] = useState(false);
    const [mfaSecret, setMfaSecret] = useState("");
    const [mfaOtpauthUri, setMfaOtpauthUri] = useState("");
    const [mfaCode, setMfaCode] = useState("");
    const [mfaVerifying, setMfaVerifying] = useState(false);
    const [mfaError, setMfaError] = useState("");

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
            // Test connection first
            if (aiProvider && aiApiKey) {
                const { testAIConnection } = await import("@/lib/api");
                const success = await testAIConnection(aiProvider, aiApiKey);
                if (!success) {
                    toast({ title: "Connection Failed", description: "Could not connect to AI provider with this key.", variant: "destructive" });
                    setLoading(false);
                    return;
                }
            }

            const updated = await updateAiSettings(aiProvider, aiApiKey);
            updateProfileLocally(updated);
            setAiApiKey("");
            setHasKey(true);
            toast({ title: t.profile.success, description: t.aiSettings.saved });
            onOpenChange(false);
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

    // MFA Handlers
    const fetchMfaStatus = async () => {
        setMfaLoading(true);
        try {
            const status = await getMfaStatus();
            setMfaEnabled(status.enabled);
        } catch (e) {
            console.error("Failed to fetch MFA status", e);
        } finally {
            setMfaLoading(false);
        }
    };

    useEffect(() => {
        if (open && activeTab === "security") {
            fetchMfaStatus();
        }
    }, [open, activeTab]);

    const handleEnableMfa = async () => {
        setMfaLoading(true);
        try {
            const setup = await setupMfa();
            setMfaSecret(setup.secret);
            setMfaOtpauthUri(setup.otpauthUri);
            setMfaSetupMode(true);
        } catch (err) {
            toast({ title: t.profile.error, description: "Failed to initiate MFA setup", variant: "destructive" });
        } finally {
            setMfaLoading(false);
        }
    };

    const handleVerifyMfa = async () => {
        if (mfaCode.length !== 6) return;
        setMfaVerifying(true);
        setMfaError("");
        try {
            const result = await verifyMfa(mfaSecret, mfaCode);
            if (result.success) {
                setMfaEnabled(true);
                setMfaSetupMode(false);
                setMfaCode("");
                toast({
                    title: t.auth.mfaSetupSuccess,
                    variant: "default"
                });
            } else {
                setMfaError("Invalid code. Please try again.");
            }
        } catch {
            setMfaError("Verification failed. Please try again.");
        } finally {
            setMfaVerifying(false);
        }
    };

    const handleDisableMfa = async () => {
        if (!confirm(t.auth.disableMfa + "?")) return;
        setMfaLoading(true);
        try {
            await disableMfa();
            setMfaEnabled(false);
            toast({ title: t.profile.success, description: t.auth.mfaDisabled });
        } catch (error) {
            toast({ title: t.profile.error, description: "Failed to disable MFA", variant: "destructive" });
        } finally {
            setMfaLoading(false);
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
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="general">General</TabsTrigger>
                        <TabsTrigger value="ai">AI Settings</TabsTrigger>
                        <TabsTrigger value="security">{t.profile.security}</TabsTrigger>
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

                    <TabsContent value="security" className="space-y-6 py-4">
                        <div className="flex items-center justify-between bg-muted/50 p-4 rounded-lg border">
                            <div className="flex items-center gap-3">
                                <div className={cn(
                                    "p-2 rounded-full",
                                    mfaEnabled ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"
                                )}>
                                    <Shield className="h-5 w-5" />
                                </div>
                                <div className="space-y-0.5">
                                    <span className="text-sm font-semibold block">{t.auth.mfaTitle}</span>
                                    <span className="text-xs text-muted-foreground">
                                        {mfaEnabled ? t.auth.mfaEnabled : t.auth.mfaDisabled}
                                    </span>
                                </div>
                            </div>
                            {!mfaSetupMode && (
                                <Button
                                    variant={mfaEnabled ? "outline" : "default"}
                                    size="sm"
                                    onClick={mfaEnabled ? handleDisableMfa : handleEnableMfa}
                                    disabled={mfaLoading}
                                >
                                    {mfaLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : (mfaEnabled ? t.auth.disableMfa : t.auth.enableMfa)}
                                </Button>
                            )}
                        </div>

                        {mfaSetupMode && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
                                <div className="flex items-start gap-3 rounded-lg bg-blue-50 border border-blue-200 p-3">
                                    <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
                                    <p className="text-sm text-blue-800" style={{ fontFamily: '"DM Sans", sans-serif' }}>
                                        {t.auth.mfaSetupDescription}
                                    </p>
                                </div>

                                <div className="flex flex-col items-center space-y-4">
                                    <div className="rounded-xl bg-white p-3 shadow-sm border border-gray-200">
                                        <img
                                            src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(mfaOtpauthUri)}`}
                                            alt="MFA QR Code"
                                            className="h-40 w-40"
                                        />
                                    </div>

                                    <div className="w-full space-y-2">
                                        <p className="text-xs text-center text-muted-foreground font-medium uppercase tracking-wider">
                                            {t.auth.mfaEnterCode}
                                        </p>
                                        <div className="flex gap-2">
                                            <Input
                                                type="text"
                                                inputMode="numeric"
                                                maxLength={6}
                                                placeholder="000000"
                                                value={mfaCode}
                                                onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                                                className="h-12 text-center text-xl font-mono tracking-widest focus:ring-primary"
                                                autoFocus
                                            />
                                            <Button
                                                onClick={handleVerifyMfa}
                                                disabled={mfaCode.length !== 6 || mfaVerifying}
                                                className="h-12 px-6"
                                            >
                                                {mfaVerifying ? <Loader2 className="h-4 w-4 animate-spin" /> : t.common.confirm}
                                            </Button>
                                        </div>
                                        {mfaError && <p className="text-xs text-red-500 text-center">{mfaError}</p>}
                                    </div>

                                    <div className="w-full text-center">
                                        <button
                                            onClick={() => setMfaSetupMode(false)}
                                            className="text-xs text-muted-foreground hover:text-primary transition-colors"
                                        >
                                            {t.common.cancel}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="rounded-lg border bg-amber-50/50 p-4 space-y-2">
                            <h4 className="text-sm font-semibold text-amber-900 border-b border-amber-200 pb-1 flex items-center gap-1.5">
                                <Shield className="h-4 w-4" /> Why use Two-Factor?
                            </h4>
                            <p className="text-xs text-amber-800 leading-relaxed">
                                {t.auth.mfaDescription}
                            </p>
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
