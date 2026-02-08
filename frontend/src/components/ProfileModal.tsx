import { useState, useRef } from "react";
import { useAuth } from "@/auth/AuthProvider";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Camera, Loader2, Save } from "lucide-react";
import { updateProfile, uploadAvatar, ProfileData } from "@/api/profile";

interface ProfileModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    profile: ProfileData | null;
    onProfileUpdate: (profile: ProfileData) => void;
}

export function ProfileModal({ open, onOpenChange, profile, onProfileUpdate }: ProfileModalProps) {
    const { user } = useAuth();
    const [displayName, setDisplayName] = useState(profile?.displayName || "");
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Update displayName when profile changes
    useState(() => {
        if (profile?.displayName) {
            setDisplayName(profile.displayName);
        }
    });

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            // Preview
            const reader = new FileReader();
            reader.onload = () => {
                setAvatarPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            let updatedProfile = profile;

            // Upload avatar if selected
            if (selectedFile) {
                setIsUploading(true);
                updatedProfile = await uploadAvatar(selectedFile);
                setIsUploading(false);
            }

            // Update display name if changed
            if (displayName !== profile?.displayName) {
                updatedProfile = await updateProfile({ displayName });
            }

            if (updatedProfile) {
                onProfileUpdate(updatedProfile);
            }

            setSelectedFile(null);
            setAvatarPreview(null);
            onOpenChange(false);
        } catch (error) {
            console.error("Failed to save profile:", error);
        } finally {
            setIsSaving(false);
        }
    };

    const currentAvatar = avatarPreview || profile?.avatarUrl;
    const initials = (displayName || user?.name || user?.preferred_username || "U")
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Profile Settings</DialogTitle>
                    <DialogDescription>
                        Update your profile picture and display name.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col items-center gap-6 py-4">
                    {/* Avatar Upload */}
                    <div className="relative group">
                        <div className="h-24 w-24 rounded-full overflow-hidden bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-primary-foreground text-2xl font-bold shadow-lg ring-4 ring-primary/30">
                            {currentAvatar ? (
                                <img
                                    src={currentAvatar}
                                    alt="Profile"
                                    className="h-full w-full object-cover"
                                />
                            ) : (
                                <span>{initials}</span>
                            )}
                        </div>
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        >
                            <Camera className="h-8 w-8 text-white" />
                        </button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleFileSelect}
                            className="hidden"
                        />
                    </div>

                    {/* Display Name */}
                    <div className="w-full space-y-2">
                        <Label htmlFor="displayName">Display Name</Label>
                        <Input
                            id="displayName"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            placeholder="Enter your display name"
                        />
                    </div>

                    {/* Read-only info */}
                    <div className="w-full space-y-2">
                        <Label className="text-muted-foreground">Username</Label>
                        <div className="text-sm px-3 py-2 bg-muted rounded-md">
                            {user?.preferred_username || "—"}
                        </div>
                    </div>

                    {user?.email && (
                        <div className="w-full space-y-2">
                            <Label className="text-muted-foreground">Email</Label>
                            <div className="text-sm px-3 py-2 bg-muted rounded-md">
                                {user.email}
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                {isUploading ? "Uploading..." : "Saving..."}
                            </>
                        ) : (
                            <>
                                <Save className="mr-2 h-4 w-4" />
                                Save
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
