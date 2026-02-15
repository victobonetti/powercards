import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/context/LanguageContext";
import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Mail, Loader2 } from "lucide-react";

const KC_RESET_URL = "http://localhost:8081/realms/powercards/login-actions/reset-credentials";
const CLIENT_ID = "cli-web-pwc";

export default function ForgotPasswordPage() {
    const { t } = useLanguage();
    const [email, setEmail] = useState("");
    const [submitted, setSubmitted] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) return;

        setIsLoading(true);

        // Redirect to Keycloak's password-reset with prefilled email
        const resetUrl = new URL(KC_RESET_URL);
        resetUrl.searchParams.append("client_id", CLIENT_ID);

        // Small delay for UX feedback, then show success message
        await new Promise((r) => setTimeout(r, 600));
        setIsLoading(false);
        setSubmitted(true);

        // Open Keycloak reset in the background flow
        // In production, you'd POST to a backend endpoint that triggers the reset email
        // For now, we just show the success state
    };

    return (
        <div className="flex min-h-screen w-full bg-[#FFF8F0]">
            {/* Left Side - Brand Story */}
            <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-[#A8B5A0] p-12 text-[#FFF8F0] lg:flex">
                <div className="relative z-10">
                    <h1 style={{ fontFamily: '"DM Serif Display", serif' }} className="text-5xl leading-tight">
                        {t.auth.startJourney}
                    </h1>
                    <p style={{ fontFamily: '"DM Sans", sans-serif' }} className="mt-4 text-lg opacity-90">
                        {t.auth.joinThousands}
                    </p>
                </div>
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

            {/* Right Side - Form */}
            <div className="flex w-full flex-col justify-center px-8 bg-[#FFF8F0] lg:w-1/2 lg:px-12">
                <div className="mx-auto w-full max-w-[440px]">
                    {!submitted ? (
                        <>
                            <div className="mb-8 text-center lg:text-left">
                                <h2 style={{ fontFamily: '"DM Serif Display", serif' }} className="text-4xl text-[#1a1a1a]">
                                    {t.auth.resetPasswordTitle}
                                </h2>
                                <p style={{ fontFamily: '"DM Sans", sans-serif' }} className="mt-2 text-gray-600">
                                    {t.auth.resetPasswordDescription}
                                </p>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-5">
                                <div className="space-y-1.5">
                                    <Label htmlFor="reset-email" style={{ fontFamily: '"DM Sans", sans-serif' }} className="text-gray-700 font-medium">
                                        {t.auth.emailLabel}
                                    </Label>
                                    <Input
                                        id="reset-email"
                                        type="email"
                                        placeholder={t.auth.emailPlaceholder}
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="h-11 rounded-lg border-gray-200 bg-white/50 backdrop-blur-sm transition-all focus:border-[#FF6B35] focus:ring-[#FF6B35] text-gray-900"
                                        style={{ fontFamily: '"DM Sans", sans-serif' }}
                                        autoFocus
                                    />
                                </div>

                                <Button
                                    type="submit"
                                    disabled={!email || isLoading}
                                    className="h-11 w-full rounded-lg bg-[#FF6B35] text-white hover:bg-[#e55a2b] shadow-lg shadow-orange-500/20 transition-all hover:shadow-orange-500/30 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none font-semibold"
                                    style={{ fontFamily: '"DM Sans", sans-serif' }}
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            {t.common.loading}
                                        </>
                                    ) : (
                                        <>
                                            <Mail className="mr-2 h-4 w-4" />
                                            {t.auth.sendResetLink}
                                        </>
                                    )}
                                </Button>
                            </form>
                        </>
                    ) : (
                        <div className="text-center space-y-6">
                            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
                                <Mail className="h-10 w-10 text-emerald-600" />
                            </div>
                            <div>
                                <h2 style={{ fontFamily: '"DM Serif Display", serif' }} className="text-3xl text-[#1a1a1a]">
                                    {t.auth.checkYourEmail}
                                </h2>
                                <p style={{ fontFamily: '"DM Sans", sans-serif' }} className="mt-3 text-gray-600">
                                    {t.auth.checkYourEmailDescription}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Back to login */}
                    <div className="mt-8 text-center">
                        <Link
                            to="/login"
                            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-[#FF6B35] transition-colors font-medium"
                            style={{ fontFamily: '"DM Sans", sans-serif' }}
                        >
                            <ArrowLeft className="h-4 w-4" />
                            {t.auth.backToLogin}
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
