import { useAuth } from "@/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function LoginPage() {
    const { login, isAuthenticated, error, isLoading } = useAuth();
    const navigate = useNavigate();

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [localError, setLocalError] = useState("");

    useEffect(() => {
        if (isAuthenticated) {
            navigate("/");
        }
    }, [isAuthenticated, navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLocalError("");
        if (!username || !password) {
            setLocalError("Please enter both username and password");
            return;
        }
        await login(username, password);
    };

    return (
        <div className="flex min-h-screen w-full bg-[#FFF8F0]">
            {/* Left Side - Brand Story & Visuals */}
            <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-[#A8B5A0] p-12 text-[#FFF8F0] lg:flex">
                <div className="relative z-10">
                    <h1 style={{ fontFamily: '"DM Serif Display", serif' }} className="text-5xl leading-tight">
                        Master your knowledge <br /> with PowerCards.
                    </h1>
                    <p style={{ fontFamily: '"DM Sans", sans-serif' }} className="mt-4 text-lg opacity-90">
                        An elegant, powerful way to create and review flashcards. Elevate your learning experience.
                    </p>
                </div>

                {/* Animated Orbs */}
                <div className="absolute top-0 left-0 h-full w-full overflow-hidden">
                    <div className="absolute top-[-10%] left-[-10%] h-[500px] w-[500px] rounded-full bg-[#FF6B35] opacity-20 blur-[100px] animate-slow-rotate" />
                    <div className="absolute bottom-[-10%] right-[-10%] h-[600px] w-[600px] rounded-full bg-[#FFF8F0] opacity-10 blur-[120px] animate-slow-rotate [animation-duration:30s]" />
                </div>

                <div className="relative z-10">
                    <p style={{ fontFamily: '"DM Sans", sans-serif' }} className="text-sm opacity-75">
                        © 2026 PowerCards
                    </p>
                </div>
            </div>

            {/* Right Side - Login Form */}
            <div className="flex w-full flex-col justify-center px-8 bg-[#FFF8F0] lg:w-1/2 lg:px-12">
                <div className="mx-auto w-full max-w-[400px]">
                    <div className="mb-8 text-center lg:text-left">
                        <h2 style={{ fontFamily: '"DM Serif Display", serif' }} className="text-4xl text-[#1a1a1a]">
                            Welcome back
                        </h2>
                        <p style={{ fontFamily: '"DM Sans", sans-serif' }} className="mt-2 text-gray-600">
                            Please enter your details to sign in.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="username" style={{ fontFamily: '"DM Sans", sans-serif' }} className="text-gray-700">
                                Username
                            </Label>
                            <Input
                                id="username"
                                type="text"
                                placeholder="Enter your username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                disabled={isLoading}
                                className="h-11 rounded-lg border-gray-200 bg-white/50 backdrop-blur-sm transition-all focus:border-[#FF6B35] focus:ring-[#FF6B35]"
                                style={{ fontFamily: '"DM Sans", sans-serif' }}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password" style={{ fontFamily: '"DM Sans", sans-serif' }} className="text-gray-700">
                                Password
                            </Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="Enter your password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={isLoading}
                                className="h-11 rounded-lg border-gray-200 bg-white/50 backdrop-blur-sm transition-all focus:border-[#FF6B35] focus:ring-[#FF6B35]"
                                style={{ fontFamily: '"DM Sans", sans-serif' }}
                            />
                        </div>

                        {(error || localError) && (
                            <div className="rounded-md bg-red-50 p-3 text-sm text-red-500">
                                {localError || error}
                            </div>
                        )}

                        <Button
                            type="submit"
                            disabled={isLoading}
                            className="h-11 w-full rounded-lg bg-[#FF6B35] text-white hover:bg-[#e55a2b] shadow-lg shadow-orange-500/20 transition-all hover:shadow-orange-500/30"
                            style={{ fontFamily: '"DM Sans", sans-serif', fontWeight: 500 }}
                        >
                            {isLoading ? "Logging in..." : "Sign in"}
                        </Button>

                        <div className="text-center text-sm text-gray-500">
                            Don't have an account?{" "}
                            <button
                                type="button"
                                onClick={() => navigate("/register")}
                                className="font-semibold text-[#FF6B35] hover:underline"
                            >
                                Register now
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
