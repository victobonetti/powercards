import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/auth/AuthProvider";
import { setupMfa, verifyMfa, getMfaStatus } from "@/api/auth";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, ShieldCheck, Check, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

/**
 * MFA Setup Page — shown after login if MFA is not configured.
 * Displays a QR code for TOTP setup + code verification.
 */
export default function MfaSetupPage() {
    const { t } = useLanguage();
    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const { toast } = useToast();

    const [loading, setLoading] = useState(true);
    const [mfaEnabled, setMfaEnabled] = useState(false);
    const [secret, setSecret] = useState("");
    const [otpauthUri, setOtpauthUri] = useState("");
    const [code, setCode] = useState("");
    const [verifying, setVerifying] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);

    // Check MFA status & generate secret on mount
    useEffect(() => {
        if (!isAuthenticated) return;

        const init = async () => {
            try {
                const status = await getMfaStatus();
                if (status.enabled) {
                    setMfaEnabled(true);
                    setLoading(false);
                    return;
                }
                // Generate TOTP secret
                const setup = await setupMfa();
                setSecret(setup.secret);
                setOtpauthUri(setup.otpauthUri);
            } catch (err) {
                console.error("MFA setup error", err);
            } finally {
                setLoading(false);
            }
        };
        init();
    }, [isAuthenticated]);

    const handleVerify = useCallback(async () => {
        if (code.length !== 6) {
            setError(t.auth.mfaEnterCode);
            return;
        }
        setVerifying(true);
        setError("");
        try {
            const result = await verifyMfa(secret, code);
            if (result.success) {
                setSuccess(true);
                toast({
                    title: t.auth.mfaSetupSuccess,
                    description: t.auth.mfaTitle,
                });
                setTimeout(() => navigate("/"), 2000);
            } else {
                setError("Invalid code. Please try again.");
            }
        } catch {
            setError("Verification failed. Please try again.");
        } finally {
            setVerifying(false);
        }
    }, [code, secret, navigate, toast, t]);

    const handleSkip = useCallback(() => {
        sessionStorage.setItem("mfa_skipped", "true");
        navigate("/");
    }, [navigate]);

    // QR code URL using Google Charts API (simple, no dependency)
    const qrCodeUrl = otpauthUri
        ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpauthUri)}`
        : "";

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#FFF8F0]">
                <Loader2 className="h-8 w-8 animate-spin text-[#FF6B35]" />
            </div>
        );
    }

    if (mfaEnabled) {
        // Already set up — redirect home
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#FFF8F0]">
                <div className="text-center space-y-4">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                        <ShieldCheck className="h-8 w-8 text-emerald-600" />
                    </div>
                    <h2 style={{ fontFamily: '"DM Serif Display", serif' }} className="text-2xl text-[#1a1a1a]">
                        {t.auth.mfaEnabled}
                    </h2>
                    <Button
                        onClick={() => navigate("/")}
                        className="bg-[#FF6B35] text-white hover:bg-[#e55a2b] font-semibold rounded-lg"
                        style={{ fontFamily: '"DM Sans", sans-serif' }}
                    >
                        {t.common.next}
                    </Button>
                </div>
            </div>
        );
    }

    if (success) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#FFF8F0]">
                <div className="text-center space-y-4 animate-in fade-in">
                    <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
                        <Check className="h-10 w-10 text-emerald-600" strokeWidth={3} />
                    </div>
                    <h2 style={{ fontFamily: '"DM Serif Display", serif' }} className="text-3xl text-[#1a1a1a]">
                        {t.auth.mfaSetupSuccess}
                    </h2>
                    <p style={{ fontFamily: '"DM Sans", sans-serif' }} className="text-gray-600">
                        {t.auth.mfaDescription}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen w-full bg-[#FFF8F0]">
            {/* Left Side - Brand visual */}
            <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-[#A8B5A0] p-12 text-[#FFF8F0] lg:flex">
                <div className="relative z-10">
                    <h1 style={{ fontFamily: '"DM Serif Display", serif' }} className="text-5xl leading-tight">
                        {t.auth.mfaSetupTitle}
                    </h1>
                    <p style={{ fontFamily: '"DM Sans", sans-serif' }} className="mt-4 text-lg opacity-90">
                        {t.auth.mfaDescription}
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

            {/* Right Side - MFA Setup */}
            <div className="flex w-full flex-col justify-center px-8 bg-[#FFF8F0] lg:w-1/2 lg:px-12">
                <div className="mx-auto w-full max-w-[440px]">
                    {/* Header */}
                    <div className="mb-6 text-center lg:text-left">
                        <div className="flex items-center gap-3 mb-2 justify-center lg:justify-start">
                            <ShieldCheck className="h-8 w-8 text-[#FF6B35]" />
                            <h2 style={{ fontFamily: '"DM Serif Display", serif' }} className="text-3xl text-[#1a1a1a]">
                                {t.auth.mfaSetupTitle}
                            </h2>
                        </div>
                        <p style={{ fontFamily: '"DM Sans", sans-serif' }} className="text-gray-600">
                            {t.auth.mfaSetupDescription}
                        </p>
                    </div>

                    {/* Info alert */}
                    <div className="flex items-start gap-3 rounded-lg bg-amber-50 border border-amber-200 p-3 mb-6">
                        <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
                        <p className="text-sm text-amber-800" style={{ fontFamily: '"DM Sans", sans-serif' }}>
                            {t.auth.mfaRequired}
                        </p>
                    </div>

                    {/* QR Code */}
                    <div className="flex flex-col items-center space-y-5">
                        <div className="rounded-xl bg-white p-4 shadow-lg shadow-gray-200/60 border border-gray-100">
                            {qrCodeUrl ? (
                                <img
                                    src={qrCodeUrl}
                                    alt="TOTP QR Code"
                                    className="h-[200px] w-[200px]"
                                />
                            ) : (
                                <div className="h-[200px] w-[200px] flex items-center justify-center">
                                    <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                                </div>
                            )}
                        </div>

                        <p style={{ fontFamily: '"DM Sans", sans-serif' }} className="text-sm text-gray-500 text-center font-medium">
                            {t.auth.mfaScanQr}
                        </p>

                        {/* Secret key (for manual entry) */}
                        <div className="w-full rounded-lg bg-gray-50 border border-gray-200 p-3 text-center">
                            <p className="text-xs text-gray-400 mb-1 font-medium" style={{ fontFamily: '"DM Sans", sans-serif' }}>
                                Manual entry key
                            </p>
                            <code className="text-sm font-mono text-gray-700 tracking-wider select-all break-all">
                                {secret}
                            </code>
                        </div>

                        {/* Code input */}
                        <div className="w-full space-y-2">
                            <p style={{ fontFamily: '"DM Sans", sans-serif' }} className="text-sm text-gray-700 font-medium text-center">
                                {t.auth.mfaEnterCode}
                            </p>
                            <Input
                                type="text"
                                inputMode="numeric"
                                maxLength={6}
                                placeholder={t.auth.mfaCodePlaceholder}
                                value={code}
                                onChange={(e) => {
                                    const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                                    setCode(val);
                                    setError("");
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") handleVerify();
                                }}
                                className="h-14 text-center text-2xl font-mono tracking-[0.5em] rounded-lg border-gray-200 bg-white/50 transition-all focus:border-[#FF6B35] focus:ring-[#FF6B35] text-gray-900"
                                style={{ fontFamily: '"DM Mono", monospace' }}
                                autoFocus
                            />
                            {error && (
                                <p className="text-xs text-red-500 text-center" style={{ fontFamily: '"DM Sans", sans-serif' }}>
                                    {error}
                                </p>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 w-full pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleSkip}
                                className="h-11 flex-1 rounded-lg border-gray-200 bg-white hover:bg-gray-50 transition-all font-medium text-gray-600"
                                style={{ fontFamily: '"DM Sans", sans-serif' }}
                            >
                                {t.auth.mfaSkip}
                            </Button>
                            <Button
                                type="button"
                                disabled={code.length !== 6 || verifying}
                                onClick={handleVerify}
                                className="h-11 flex-[2] rounded-lg bg-[#FF6B35] text-white hover:bg-[#e55a2b] shadow-lg shadow-orange-500/20 transition-all hover:shadow-orange-500/30 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none font-bold"
                                style={{ fontFamily: '"DM Sans", sans-serif' }}
                            >
                                {verifying ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        {t.common.loading}
                                    </>
                                ) : (
                                    <>
                                        <ShieldCheck className="mr-2 h-4 w-4" />
                                        {t.auth.mfaVerify}
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
