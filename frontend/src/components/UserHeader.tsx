import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthProvider";
import { Button } from "./ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { User, LogOut } from "lucide-react";
import { getProfile, ProfileData } from "@/api/profile";
import { useLanguage } from "@/context/LanguageContext";
import { cn } from "@/lib/utils";

export function UserHeader() {
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const [profile, setProfile] = useState<ProfileData | null>(null);
    const { language, setLanguage, t } = useLanguage();

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        try {
            const data = await getProfile();
            setProfile(data);
        } catch (error) {
            console.error("Failed to load profile:", error);
        }
    };

    // Display name priority: Profile displayName > Keycloak name > username
    const displayName = profile?.displayName || user?.name || user?.preferred_username || "User";
    const initials = displayName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);

    const avatarUrl = profile?.avatarUrl;

    return (
        <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 mr-2">
                <Button
                    variant={language === 'en' ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setLanguage('en')}
                    className={cn("text-xs h-7 px-2", language === 'en' ? "font-bold" : "opacity-70")}
                    title="English"
                >
                    EN
                </Button>
                <div className="h-4 w-[1px] bg-border mx-1" />
                <Button
                    variant={language === 'pt' ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setLanguage('pt')}
                    className={cn("text-xs h-7 px-2", language === 'pt' ? "font-bold" : "opacity-70")}
                    title="Português"
                >
                    PT
                </Button>
            </div>

            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center gap-2 px-2 py-1 h-auto">
                        {/* Avatar */}
                        <div className="relative h-9 w-9 rounded-full overflow-hidden bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-primary-foreground text-sm font-semibold shadow-md ring-2 ring-primary/30">
                            {avatarUrl ? (
                                <img
                                    src={avatarUrl}
                                    alt={displayName}
                                    className="h-full w-full object-cover"
                                />
                            ) : (
                                <span>{initials}</span>
                            )}
                        </div>
                        {/* Name */}
                        <span className="text-sm font-medium hidden sm:inline-block max-w-[120px] truncate">
                            {displayName}
                        </span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel className="font-normal">
                        <div className="flex flex-col space-y-1">
                            <p className="text-sm font-medium leading-none">{displayName}</p>
                            {user?.email && (
                                <p className="text-xs leading-none text-muted-foreground">
                                    {user.email}
                                </p>
                            )}
                        </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate(`/${language}/profile`)}>
                        <User className="mr-2 h-4 w-4" />
                        <span>{t.navigation.profile}</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={logout} className="text-red-600 focus:text-red-600">
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>{t.navigation.logout}</span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}


