import { useAuth } from "@/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function LoginPage() {
    const { login, loginWithGoogle, isAuthenticated, error, isLoading } = useAuth();
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

                        <div className="relative py-2">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t border-gray-200" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-[#FFF8F0] px-2 text-gray-500">Or continue with</span>
                            </div>
                        </div>

                        <Button
                            type="button"
                            variant="outline"
                            disabled={isLoading}
                            onClick={() => loginWithGoogle()}
                            className="h-11 w-full rounded-lg border-gray-200 bg-white hover:bg-gray-50 transition-all"
                            style={{ fontFamily: '"DM Sans", sans-serif', fontWeight: 500 }}
                        >
                            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                                <path
                                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                    fill="#4285F4"
                                />
                                <path
                                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                    fill="#34A853"
                                />
                                <path
                                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                                    fill="#FBBC05"
                                />
                                <path
                                    d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                    fill="#EA4335"
                                />
                            </svg>
                            Continue with Google
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
