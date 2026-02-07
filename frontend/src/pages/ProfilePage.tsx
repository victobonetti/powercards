import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthProvider";
import { getProfile, updateProfile, uploadAvatar, uploadBanner, ProfileData } from "@/api/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Camera, Pencil, Save, X, Loader2 } from "lucide-react";
import { markdownToHtml } from "@/lib/markdown";

export default function ProfilePage() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { toast } = useToast();

    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    // Edit form state
    const [displayName, setDisplayName] = useState("");
    const [description, setDescription] = useState("");

    const avatarInputRef = useRef<HTMLInputElement>(null);
    const bannerInputRef = useRef<HTMLInputElement>(null);

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
            const updated = await updateProfile({ displayName, description });
            setProfile(updated);
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
        setIsEditing(false);
    };

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            toast({ title: "Uploading...", description: "Please wait" });
            const updated = await uploadAvatar(file);
            setProfile(updated);
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
        <div className="h-full flex flex-col overflow-hidden">
            {/* Banner Section - isolated stacking context */}
            <div className="relative h-48 md:h-64 bg-gradient-to-br from-orange-400 via-orange-500 to-orange-600 flex-shrink-0">
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
                    className="absolute top-4 left-4 bg-black/30 hover:bg-black/50 text-white"
                    onClick={() => navigate(-1)}
                >
                    <ArrowLeft className="h-5 w-5" />
                </Button>

                {/* Banner upload button */}
                <Button
                    variant="ghost"
                    size="sm"
                    className="absolute bottom-4 right-4 bg-black/30 hover:bg-black/50 text-white"
                    onClick={() => bannerInputRef.current?.click()}
                >
                    <Camera className="h-4 w-4 mr-2" />
                    Change Banner
                </Button>
                <input
                    ref={bannerInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleBannerUpload}
                />
            </div>

            {/* Avatar & Info Section */}
            <div className="flex-1 overflow-y-auto bg-background">
                <div className="max-w-3xl mx-auto px-6 -mt-16 relative">
                    {/* Avatar */}
                    <div className="relative inline-block mb-4">
                        <div className="h-32 w-32 rounded-full border-4 border-background overflow-hidden bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-3xl font-bold shadow-lg">
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
                            className="absolute bottom-0 right-0 h-8 w-8 rounded-full shadow-md"
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

                    {/* Profile Card */}
                    <Card className="mb-6">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>Profile Information</CardTitle>
                            {!isEditing ? (
                                <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
                                    <Pencil className="h-4 w-4 mr-2" />
                                    Edit
                                </Button>
                            ) : (
                                <div className="flex gap-2">
                                    <Button variant="ghost" size="sm" onClick={handleCancel} disabled={saving}>
                                        <X className="h-4 w-4 mr-1" />
                                        Cancel
                                    </Button>
                                    <Button size="sm" onClick={handleSave} disabled={saving}>
                                        {saving ? (
                                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                        ) : (
                                            <Save className="h-4 w-4 mr-1" />
                                        )}
                                        Save
                                    </Button>
                                </div>
                            )}
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Display Name */}
                            <div className="space-y-2">
                                <Label htmlFor="displayName">Display Name</Label>
                                {isEditing ? (
                                    <Input
                                        id="displayName"
                                        value={displayName}
                                        onChange={(e) => setDisplayName(e.target.value)}
                                        placeholder="Enter your display name"
                                    />
                                ) : (
                                    <p className="text-lg font-medium">{currentDisplayName}</p>
                                )}
                            </div>

                            {/* Email (read-only) */}
                            <div className="space-y-2">
                                <Label>Email</Label>
                                <p className="text-muted-foreground">{user?.email || "Not available"}</p>
                            </div>

                            {/* Description/Bio */}
                            <div className="space-y-2">
                                <Label htmlFor="description">About Me</Label>
                                {isEditing ? (
                                    <div className="space-y-2">
                                        <Textarea
                                            id="description"
                                            value={description}
                                            onChange={(e) => setDescription(e.target.value)}
                                            placeholder="Write something about yourself... (Markdown supported)"
                                            rows={6}
                                            className="resize-none"
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            Supports Markdown: **bold**, _italic_, # headers, - lists, etc.
                                        </p>
                                    </div>
                                ) : profile?.description ? (
                                    <div
                                        className="prose prose-sm dark:prose-invert max-w-none p-4 bg-muted/30 rounded-md"
                                        dangerouslySetInnerHTML={{ __html: markdownToHtml(profile.description) }}
                                    />
                                ) : (
                                    <p className="text-muted-foreground italic">No description yet. Click Edit to add one.</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
