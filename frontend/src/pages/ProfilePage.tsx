import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthProvider";
import { getProfile, updateProfile, uploadAvatar, uploadBanner, updateAiSettings, ProfileData } from "@/api/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Camera, Pencil, Save, X, Loader2, Check, KeyRound, Eye, EyeOff, Sparkles, Trash2 } from "lucide-react";
import { markdownToHtml } from "@/lib/markdown";
import { palettes, applyTheme } from "@/lib/themes";
import { useTheme } from "@/components/theme-provider";
import { useLanguage } from "@/context/LanguageContext";

export default function ProfilePage() {
    const navigate = useNavigate();
    const { user, refreshProfile, updateProfileLocally } = useAuth();
    const { toast } = useToast();
    const { theme } = useTheme();
    const { t } = useLanguage();

    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    // Edit form state
    const [displayName, setDisplayName] = useState("");
    const [description, setDescription] = useState("");
    const [selectedPalette, setSelectedPalette] = useState("tangerine");

    const avatarInputRef = useRef<HTMLInputElement>(null);
    const bannerInputRef = useRef<HTMLInputElement>(null);

    // AI Settings state
    const [aiProvider, setAiProvider] = useState("");
    const [aiApiKey, setAiApiKey] = useState("");
    const [showApiKey, setShowApiKey] = useState(false);
    const [savingAi, setSavingAi] = useState(false);

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        try {
            setLoading(true);
            const data = await getProfile();
            setProfile(data);
            setDisplayName(data.displayName || "");
            setDescription(data.description || "");
            setSelectedPalette(data.colorPalette || "tangerine");
            setAiProvider(data.aiProvider || "");
        } catch (error) {
            console.error("Failed to load profile:", error);
            toast({ title: "Error", description: "Failed to load profile", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            const updated = await updateProfile({ displayName, description, colorPalette: selectedPalette });
            setProfile(updated);
            await refreshProfile(); // Refresh global auth context to update theme app-wide
            setIsEditing(false);
            toast({ title: "Success", description: "Profile updated successfully" });
        } catch (error) {
            console.error("Failed to update profile:", error);
            toast({ title: "Error", description: "Failed to update profile", variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        setDisplayName(profile?.displayName || "");
        setDescription(profile?.description || "");

        // Revert theme
        const originalPalette = profile?.colorPalette || "tangerine";
        setSelectedPalette(originalPalette);
        const isDark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
        applyTheme(originalPalette, isDark);

        setIsEditing(false);
    };

    const handlePaletteChange = (paletteValue: string) => {
        setSelectedPalette(paletteValue);
        // Instant Preview
        const isDark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
        applyTheme(paletteValue, isDark);
    };

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            toast({ title: "Uploading...", description: "Please wait" });
            const updated = await uploadAvatar(file);
            setProfile(updated);
            await refreshProfile();
            toast({ title: "Success", description: "Avatar updated" });
        } catch (error) {
            console.error("Failed to upload avatar:", error);
            toast({ title: "Error", description: "Failed to upload avatar", variant: "destructive" });
        }
        e.target.value = "";
    };

    const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            toast({ title: "Uploading...", description: "Please wait" });
            const updated = await uploadBanner(file);
            setProfile(updated);
            await refreshProfile();
            toast({ title: "Success", description: "Banner updated" });
        } catch (error) {
            console.error("Failed to upload banner:", error);
            toast({ title: "Error", description: "Failed to upload banner", variant: "destructive" });
        }
        e.target.value = "";
    };

    const currentDisplayName = profile?.displayName || user?.name || user?.preferred_username || "User";
    const initials = currentDisplayName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="h-full overflow-y-auto">
            {/* Banner Section - Full Width */}
            <div className="relative h-48 md:h-64 bg-gradient-to-br from-primary/80 via-primary to-primary/60 flex-shrink-0 overflow-hidden group">
                {profile?.bannerUrl && (
                    <img
                        src={profile.bannerUrl}
                        alt="Profile banner"
                        className="absolute inset-0 w-full h-full object-cover"
                    />
                )}
                <div className="absolute inset-0 bg-black/20" />

                {/* Back button */}
                <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-4 left-4 bg-black/30 hover:bg-black/50 text-white rounded-full"
                    onClick={() => navigate(-1)}
                >
                    <ArrowLeft className="h-5 w-5" />
                </Button>

                {/* Banner upload button */}
                <Button
                    variant="ghost"
                    size="sm"
                    className="absolute bottom-4 right-4 bg-black/30 hover:bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    onClick={() => bannerInputRef.current?.click()}
                >
                    <Camera className="h-4 w-4 mr-2" />
                    {t.profile.changeBanner}
                </Button>
                <input
                    ref={bannerInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleBannerUpload}
                />
            </div>

            {/* Main Content - 2 Column Grid */}
            <div className="min-h-0">
                <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 -mt-20 relative z-10">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                        {/* Left Sidebar (Identity) */}
                        <div className="lg:col-span-4 space-y-6">
                            <Card className="overflow-visible shadow-lg">
                                <CardContent className="pt-0 relative">
                                    {/* Avatar - Pull up */}
                                    <div className="flex justify-center -mt-16 mb-6">
                                        <div className="relative group">
                                            <div className="h-32 w-32 rounded-full border-4 border-background overflow-hidden bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground text-3xl font-bold shadow-md">
                                                {profile?.avatarUrl ? (
                                                    <img
                                                        src={profile.avatarUrl}
                                                        alt={currentDisplayName}
                                                        className="h-full w-full object-cover"
                                                    />
                                                ) : (
                                                    <span>{initials}</span>
                                                )}
                                            </div>
                                            <Button
                                                variant="secondary"
                                                size="icon"
                                                className="absolute bottom-0 right-0 h-8 w-8 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                                                onClick={() => avatarInputRef.current?.click()}
                                            >
                                                <Camera className="h-4 w-4" />
                                            </Button>
                                            <input
                                                ref={avatarInputRef}
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={handleAvatarUpload}
                                            />
                                        </div>
                                    </div>

                                    {/* Identity Info */}
                                    <div className="text-center space-y-2 mb-6">
                                        {isEditing ? (
                                            <div className="space-y-2">
                                                <Label htmlFor="displayName" className="sr-only">Display Name</Label>
                                                <Input
                                                    id="displayName"
                                                    value={displayName}
                                                    onChange={(e) => setDisplayName(e.target.value)}
                                                    placeholder="Display Name"
                                                    className="text-center text-lg font-bold"
                                                />
                                            </div>
                                        ) : (
                                            <h1 className="text-2xl font-bold">{currentDisplayName}</h1>
                                        )}
                                        <p className="text-muted-foreground">{user?.email}</p>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex flex-col gap-2">
                                        {!isEditing ? (
                                            <Button variant="outline" className="w-full" onClick={() => setIsEditing(true)}>
                                                <Pencil className="h-4 w-4 mr-2" />
                                                {t.profile.editProfile}
                                            </Button>
                                        ) : (
                                            <div className="flex gap-2">
                                                <Button variant="outline" className="flex-1" onClick={handleCancel} disabled={saving}>
                                                    <X className="h-4 w-4 mr-1" />
                                                    {t.profile.cancel}
                                                </Button>
                                                <Button className="flex-1" onClick={handleSave} disabled={saving}>
                                                    {saving ? (
                                                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                                    ) : (
                                                        <Save className="h-4 w-4 mr-1" />
                                                    )}
                                                    {t.profile.save}
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Stats Placeholder */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">{t.profile.statistics}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center">
                                            <span className="text-muted-foreground">{t.profile.decksCreated}</span>
                                            <span className="font-bold">0</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-muted-foreground">{t.profile.notesAdded}</span>
                                            <span className="font-bold">0</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-muted-foreground">{t.profile.daysStreak}</span>
                                            <span className="font-bold text-primary">0 🔥</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Right Content */}
                        <div className="lg:col-span-8 space-y-6">

                            {/* Appearance Theme Picker - Only in Edit Mode */}
                            {isEditing && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle>{t.profile.appearance}</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-4">
                                            <Label>{t.profile.colorPalette}</Label>
                                            <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-3">
                                                {palettes.map((palette) => (
                                                    <button
                                                        key={palette.value}
                                                        onClick={() => handlePaletteChange(palette.value)}
                                                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${selectedPalette === palette.value
                                                            ? "ring-2 ring-offset-2 ring-primary scale-110"
                                                            : "hover:scale-105"
                                                            }`}
                                                        style={{
                                                            backgroundColor: `hsl(${palette.light.primary})`
                                                        }}
                                                        title={palette.name}
                                                    >
                                                        {selectedPalette === palette.value && (
                                                            <Check className="h-5 w-5 text-white drop-shadow-md" />
                                                        )}
                                                    </button>
                                                ))}
                                            </div>
                                            <p className="text-xs text-muted-foreground">
                                                {t.profile.themeDescription}
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {/* AI Settings - Always visible */}
                            <AISettingsCard
                                t={t}
                                profile={profile}
                                aiProvider={aiProvider}
                                setAiProvider={setAiProvider}
                                aiApiKey={aiApiKey}
                                setAiApiKey={setAiApiKey}
                                showApiKey={showApiKey}
                                setShowApiKey={setShowApiKey}
                                savingAi={savingAi}
                                setSavingAi={setSavingAi}
                                toast={toast}
                                setProfile={setProfile}
                                refreshProfile={refreshProfile}
                                updateProfileLocally={updateProfileLocally}
                            />

                            {/* About Me */}
                            <Card className="h-full">
                                <CardHeader>
                                    <CardTitle>{t.profile.aboutMe}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {isEditing ? (
                                        <div className="space-y-2">
                                            <Textarea
                                                id="description"
                                                value={description}
                                                onChange={(e) => setDescription(e.target.value)}
                                                placeholder={t.profile.aboutPlaceholder}
                                                rows={8}
                                                className="resize-none"
                                            />
                                            <p className="text-xs text-muted-foreground">
                                                {t.profile.markdownSupport}
                                            </p>
                                        </div>
                                    ) : profile?.description ? (
                                        <div
                                            className="prose prose-sm dark:prose-invert max-w-none"
                                            dangerouslySetInnerHTML={{ __html: markdownToHtml(profile.description) }}
                                        />
                                    ) : (
                                        <div className="text-center py-12 text-muted-foreground bg-muted/20 rounded-lg border border-dashed text-sm">
                                            <p>{t.profile.noBio}</p>
                                            {!isEditing && (
                                                <Button variant="link" onClick={() => setIsEditing(true)}>{t.profile.addBio}</Button>
                                            )}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}

interface AISettingsCardProps {
    t: any;
    profile: ProfileData | null;
    aiProvider: string;
    setAiProvider: (v: string) => void;
    aiApiKey: string;
    setAiApiKey: (v: string) => void;
    showApiKey: boolean;
    setShowApiKey: (v: boolean) => void;
    savingAi: boolean;
    setSavingAi: (v: boolean) => void;
    toast: any;
    setProfile: (p: ProfileData) => void;
    refreshProfile: () => Promise<void>;
    updateProfileLocally: (p: ProfileData) => void;
}

function AISettingsCard({
    t, profile, aiProvider, setAiProvider, aiApiKey, setAiApiKey,
    showApiKey, setShowApiKey, savingAi, setSavingAi, toast, setProfile, refreshProfile, updateProfileLocally
}: AISettingsCardProps) {

    const providers = [
        { value: "openai", label: t.aiSettings.openai },
        { value: "gemini", label: t.aiSettings.gemini },
        { value: "deepseek", label: t.aiSettings.deepseek },
    ];

    const handleSaveAiSettings = async () => {
        if (!aiProvider) {
            toast({ title: t.profile.error, description: "Please select a provider", variant: "destructive" });
            return;
        }
        if (!aiApiKey && !profile?.hasAiApiKey) {
            toast({ title: t.profile.error, description: "Please enter an API key", variant: "destructive" });
            return;
        }

        setSavingAi(true);
        try {
            const updated = await updateAiSettings(aiProvider, aiApiKey);
            setProfile(updated); // Update local profile state
            updateProfileLocally(updated); // Update global auth state immediately
            setAiApiKey("");
            toast({ title: t.profile.success, description: t.aiSettings.saved });
        } catch (error) {
            console.error("Failed to save AI settings:", error);
            toast({ title: t.profile.error, description: t.aiSettings.saveFailed, variant: "destructive" });
        } finally {
            setSavingAi(false);
        }
    };

    const handleRemoveKey = async () => {
        setSavingAi(true);
        try {
            const updated = await updateAiSettings("", "");
            setProfile(updated); // Update local profile state
            updateProfileLocally(updated); // Update global auth state immediately
            setAiProvider("");
            setAiApiKey("");
            toast({ title: t.profile.success, description: t.aiSettings.keyRemoved });
        } catch (error) {
            console.error("Failed to remove AI key:", error);
            toast({ title: t.profile.error, description: t.aiSettings.saveFailed, variant: "destructive" });
        } finally {
            setSavingAi(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-primary" />
                        <CardTitle>{t.aiSettings.title}</CardTitle>
                    </div>
                    {profile?.hasAiApiKey ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 dark:bg-green-900/30 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:text-green-400">
                            <KeyRound className="h-3 w-3" />
                            {t.aiSettings.configured}
                        </span>
                    ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 dark:bg-yellow-900/30 px-2.5 py-0.5 text-xs font-medium text-yellow-800 dark:text-yellow-400">
                            {t.aiSettings.notConfigured}
                        </span>
                    )}
                </div>
                <p className="text-sm text-muted-foreground mt-1">{t.aiSettings.description}</p>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {/* Provider Select */}
                    <div className="space-y-2">
                        <Label htmlFor="aiProvider">{t.aiSettings.provider}</Label>
                        <select
                            id="aiProvider"
                            value={aiProvider}
                            onChange={(e) => setAiProvider(e.target.value)}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        >
                            <option value="">{t.aiSettings.providerPlaceholder}</option>
                            {providers.map((p) => (
                                <option key={p.value} value={p.value}>{p.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* API Key Input */}
                    <div className="space-y-2">
                        <Label htmlFor="aiApiKey">{t.aiSettings.apiKey}</Label>
                        <div className="relative">
                            <Input
                                id="aiApiKey"
                                type={showApiKey ? "text" : "password"}
                                value={aiApiKey}
                                onChange={(e) => setAiApiKey(e.target.value)}
                                placeholder={profile?.hasAiApiKey ? "••••••••••••••••" : t.aiSettings.apiKeyPlaceholder}
                                className="pr-10"
                            />
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="absolute right-0 top-0 h-full px-3 text-muted-foreground hover:text-foreground"
                                onClick={() => setShowApiKey(!showApiKey)}
                            >
                                {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                        <Button
                            onClick={handleSaveAiSettings}
                            disabled={savingAi || (!aiProvider && !aiApiKey)}
                            className="flex-1"
                        >
                            {savingAi ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                                <Save className="h-4 w-4 mr-2" />
                            )}
                            {t.aiSettings.saveKey}
                        </Button>
                        {profile?.hasAiApiKey && (
                            <Button
                                variant="outline"
                                onClick={handleRemoveKey}
                                disabled={savingAi}
                                className="text-destructive hover:text-destructive"
                            >
                                <Trash2 className="h-4 w-4 mr-1" />
                                {t.aiSettings.removeKey}
                            </Button>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
