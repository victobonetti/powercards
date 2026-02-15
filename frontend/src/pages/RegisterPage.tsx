import { useAuth } from "@/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { registerUser, RegistrationData, checkEmailAvailable, checkUsernameAvailable } from "@/api/auth";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/context/LanguageContext";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Check, ChevronLeft, ChevronRight, Eye, EyeOff, Loader2, X } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────
type Step = 1 | 2 | 3;
type Direction = "forward" | "backward";

interface FieldErrors {
    email?: string;
    password?: string;
    firstName?: string;
    lastName?: string;
    username?: string;
    terms?: string;
}

// ─── Password Strength ──────────────────────────────────────────────
type StrengthLevel = 0 | 1 | 2 | 3 | 4;

function getPasswordStrength(pw: string): StrengthLevel {
    if (!pw) return 0;
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
    if (/\d/.test(pw)) score++;
    if (/[^a-zA-Z0-9]/.test(pw)) score++;
    return score as StrengthLevel;
}

const strengthColors: Record<StrengthLevel, string> = {
    0: "bg-gray-200",
    1: "bg-red-500",
    2: "bg-orange-400",
    3: "bg-yellow-400",
    4: "bg-emerald-500",
};

// ─── Helpers ─────────────────────────────────────────────────────────
function suggestUsername(email: string): string {
    const local = email.split("@")[0] || "";
    return local.replace(/[^a-zA-Z0-9_]/g, "").toLowerCase();
}

function isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ─── Component ───────────────────────────────────────────────────────
export default function RegisterPage() {
    const { login, loginWithGoogle, isAuthenticated, isLoading: authLoading } = useAuth();
    const navigate = useNavigate();
    const { toast } = useToast();
    const { t } = useLanguage();

    // Step state
    const [currentStep, setCurrentStep] = useState<Step>(1);
    const [direction, setDirection] = useState<Direction>("forward");
    const [isAnimating, setIsAnimating] = useState(false);

    // Form data
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [username, setUsername] = useState("");
    const [usernameTouched, setUsernameTouched] = useState(false);
    const [studyGoal, setStudyGoal] = useState("");
    const [newsletter, setNewsletter] = useState(false);
    const [termsAccepted, setTermsAccepted] = useState(false);

    // Validation
    const [errors, setErrors] = useState<FieldErrors>({});
    const [emailTouched, setEmailTouched] = useState(false);

    // Availability checks
    const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null);
    const [emailChecking, setEmailChecking] = useState(false);
    const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
    const [usernameChecking, setUsernameChecking] = useState(false);

    // Submission
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Refs for auto-focus
    const emailRef = useRef<HTMLInputElement>(null);
    const firstNameRef = useRef<HTMLInputElement>(null);
    const studyGoalRef = useRef<HTMLTextAreaElement>(null);

    // Debounce timer refs
    const emailCheckTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
    const usernameCheckTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

    // Redirect if already authenticated
    useEffect(() => {
        if (isAuthenticated) navigate("/");
    }, [isAuthenticated, navigate]);

    // Auto-suggest username from email
    useEffect(() => {
        if (email && !usernameTouched) {
            setUsername(suggestUsername(email));
        }
    }, [email, usernameTouched]);

    // ── Debounced email availability check ───────────────────────────
    const checkEmail = useCallback((emailValue: string) => {
        if (emailCheckTimerRef.current) clearTimeout(emailCheckTimerRef.current);
        if (!emailValue || !isValidEmail(emailValue)) {
            setEmailAvailable(null);
            setEmailChecking(false);
            return;
        }
        setEmailChecking(true);
        emailCheckTimerRef.current = setTimeout(async () => {
            try {
                const available = await checkEmailAvailable(emailValue);
                setEmailAvailable(available);
                if (!available) {
                    setErrors((p) => ({ ...p, email: t.auth.emailTaken }));
                } else {
                    setErrors((p) => ({ ...p, email: undefined }));
                }
            } catch {
                setEmailAvailable(null);
            } finally {
                setEmailChecking(false);
            }
        }, 600);
    }, [t]);

    // ── Debounced username availability check ────────────────────────
    const checkUsername = useCallback((usernameValue: string) => {
        if (usernameCheckTimerRef.current) clearTimeout(usernameCheckTimerRef.current);
        if (!usernameValue || usernameValue.length < 3 || !/^[a-zA-Z0-9_]+$/.test(usernameValue)) {
            setUsernameAvailable(null);
            setUsernameChecking(false);
            return;
        }
        setUsernameChecking(true);
        usernameCheckTimerRef.current = setTimeout(async () => {
            try {
                const available = await checkUsernameAvailable(usernameValue);
                setUsernameAvailable(available);
                if (!available) {
                    setErrors((p) => ({ ...p, username: t.auth.usernameTaken }));
                } else {
                    setErrors((p) => ({ ...p, username: undefined }));
                }
            } catch {
                setUsernameAvailable(null);
            } finally {
                setUsernameChecking(false);
            }
        }, 500);
    }, [t]);

    // Password strength
    const strengthLevel = useMemo(() => getPasswordStrength(password), [password]);
    const strengthInfo = useMemo(() => {
        if (!password) return { label: "", hint: t.auth.passwordPlaceholder };
        const maps = {
            1: { label: t.auth.weak, hint: t.auth.weakHint },
            2: { label: t.auth.fair, hint: t.auth.fairHint },
            3: { label: t.auth.good, hint: t.auth.goodHint },
            4: { label: t.auth.strong, hint: t.auth.strongHint },
        };
        return strengthLevel === 0 ? { label: "", hint: t.auth.weakHint } : maps[strengthLevel as keyof typeof maps];
    }, [password, strengthLevel, t]);

    // ── Validation ───────────────────────────────────────────────────
    const validateStep1 = useCallback((): boolean => {
        const e: FieldErrors = {};
        if (!email) e.email = t.auth.emailLabel;
        else if (!isValidEmail(email)) e.email = t.auth.usernameHelp;
        else if (emailAvailable === false) e.email = t.auth.emailTaken;
        if (!password) e.password = t.auth.passwordLabel;
        else if (password.length < 8) e.password = t.auth.weakHint;
        setErrors(e);
        return Object.keys(e).length === 0;
    }, [email, password, emailAvailable, t]);

    const validateStep2 = useCallback((): boolean => {
        const e: FieldErrors = {};
        if (!firstName.trim()) e.firstName = t.auth.firstNameLabel;
        if (!lastName.trim()) e.lastName = t.auth.lastNameLabel;
        if (!username.trim()) e.username = t.auth.usernameLabel;
        else if (usernameAvailable === false) e.username = t.auth.usernameTaken;
        setErrors(e);
        return Object.keys(e).length === 0;
    }, [firstName, lastName, username, usernameAvailable, t]);

    const validateStep3 = useCallback((): boolean => {
        const e: FieldErrors = {};
        if (!termsAccepted) e.terms = t.auth.termsAccept + " " + t.auth.termsOfService;
        setErrors(e);
        return Object.keys(e).length === 0;
    }, [termsAccepted, t]);

    // ── Step Navigation ──────────────────────────────────────────────
    const goNext = useCallback(() => {
        if (currentStep === 1 && !validateStep1()) return;
        if (currentStep === 2 && !validateStep2()) return;
        if (currentStep >= 3) return;

        setErrors({});
        setDirection("forward");
        setIsAnimating(true);
        setTimeout(() => {
            setCurrentStep((s) => (s + 1) as Step);
            setIsAnimating(false);
        }, 300);
    }, [currentStep, validateStep1, validateStep2]);

    const goBack = useCallback(() => {
        if (currentStep <= 1) return;
        setErrors({});
        setDirection("backward");
        setIsAnimating(true);
        setTimeout(() => {
            setCurrentStep((s) => (s - 1) as Step);
            setIsAnimating(false);
        }, 300);
    }, [currentStep]);

    // ── Submit with auto-login ───────────────────────────────────────
    const handleSubmit = useCallback(async () => {
        if (!validateStep3()) return;

        setIsSubmitting(true);
        setErrors({});

        const data: RegistrationData = {
            email,
            password,
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            username: username.trim(),
            studyGoal: studyGoal.trim() || undefined,
            newsletterOptIn: newsletter || undefined,
        };

        try {
            await registerUser(data);
            // Auto-login with the same credentials
            toast({
                title: t.auth.welcomeHeadline,
                description: t.auth.successSubtext,
            });
            await login(email, password);
            // AuthProvider will set isAuthenticated → useEffect redirects to /
        } catch (err: any) {
            console.error("Registration failed", err);
            const message = err.response?.data || "Registration failed. Please try again.";
            toast({
                title: t.profile.error,
                description: typeof message === "string" ? message : t.profile.error,
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    }, [email, password, firstName, lastName, username, studyGoal, newsletter, validateStep3, login, toast, t]);

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key === "Enter") {
                e.preventDefault();
                if (currentStep < 3) goNext();
                else handleSubmit();
            }
        },
        [currentStep, goNext, handleSubmit]
    );

    const step1Valid = email && isValidEmail(email) && password.length >= 8 && emailAvailable !== false;
    const step2Valid = firstName.trim() && lastName.trim() && username.trim().length >= 3 && /^[a-zA-Z0-9_]+$/.test(username) && usernameAvailable !== false;

    const stepAnimClass = isAnimating
        ? direction === "forward"
            ? "animate-slide-out-left"
            : "animate-slide-out-right"
        : direction === "forward"
            ? "animate-slide-in-right"
            : "animate-slide-in-left";

    return (
        <div className="flex min-h-screen w-full bg-[#FFF8F0]">
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

            <div className="flex w-full flex-col justify-center px-8 bg-[#FFF8F0] lg:w-1/2 lg:px-12">
                <div className="mx-auto w-full max-w-[440px]">
                    <div className="mb-6 text-center lg:text-left">
                        <h2 style={{ fontFamily: '"DM Serif Display", serif' }} className="text-4xl text-[#1a1a1a]">
                            {t.auth.registerTitle}
                        </h2>
                        <p style={{ fontFamily: '"DM Sans", sans-serif' }} className="mt-2 text-gray-600">
                            {t.auth.signInDescription}
                        </p>
                    </div>

                    {/* ── Progress Indicator ── */}
                    <div className="mb-8 flex items-center justify-center gap-0">
                        {[1, 2, 3].map((step) => (
                            <div key={step} className="flex items-center">
                                <div
                                    className={`flex h-9 w-9 items-center justify-center rounded-full border-2 transition-all duration-300 ${step < currentStep
                                        ? "border-[#FF6B35] bg-[#FF6B35] text-white"
                                        : step === currentStep
                                            ? "border-[#FF6B35] bg-[#FF6B35]/10 text-[#FF6B35] scale-110"
                                            : "border-gray-300 bg-white text-gray-400"
                                        }`}
                                    style={{ fontFamily: '"DM Sans", sans-serif', fontWeight: 600, fontSize: "0.85rem" }}
                                >
                                    {step < currentStep ? <Check className="h-4 w-4" strokeWidth={3} /> : step}
                                </div>
                                {step < 3 && (
                                    <div className="relative mx-1 h-0.5 w-12 bg-gray-200 overflow-hidden rounded-full">
                                        <div
                                            className={`absolute inset-y-0 left-0 bg-[#FF6B35] transition-all duration-500 ease-out rounded-full ${step < currentStep ? "w-full" : "w-0"
                                                }`}
                                        />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Step label */}
                    <p
                        style={{ fontFamily: '"DM Sans", sans-serif' }}
                        className="mb-6 text-center text-xs font-medium uppercase tracking-wider text-gray-400"
                    >
                        {t.auth.stepLabel
                            .replace("{step}", currentStep.toString())
                            .replace("{name}",
                                currentStep === 1 ? t.auth.authStep :
                                    currentStep === 2 ? t.auth.profileStep :
                                        t.auth.persoStep
                            )}
                    </p>

                    {/* ── Form Steps ── */}
                    <div className="relative overflow-hidden" onKeyDown={handleKeyDown}>
                        <div key={currentStep} className={stepAnimClass}>
                            {/* ── STEP 1: Auth Gateway ── */}
                            {currentStep === 1 && (
                                <div className="space-y-5">
                                    {/* Google OAuth */}
                                    <Button
                                        type="button"
                                        variant="outline"
                                        disabled={authLoading}
                                        onClick={() => loginWithGoogle()}
                                        className="h-12 w-full rounded-lg border-gray-200 bg-white hover:bg-gray-50 transition-all shadow-sm text-gray-900"
                                        style={{ fontFamily: '"DM Sans", sans-serif', fontWeight: 500 }}
                                    >
                                        <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                        </svg>
                                        {t.auth.continueWithGoogle}
                                    </Button>

                                    {/* Divider */}
                                    <div className="relative py-1">
                                        <div className="absolute inset-0 flex items-center">
                                            <span className="w-full border-t border-gray-200" />
                                        </div>
                                        <div className="relative flex justify-center text-xs uppercase">
                                            <span className="bg-[#FFF8F0] px-2 text-gray-400 font-medium tracking-wider" style={{ fontFamily: '"DM Sans", sans-serif' }}>
                                                {t.auth.orContinueWith}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Email with availability check */}
                                    <div className="space-y-1.5">
                                        <Label htmlFor="reg-email" style={{ fontFamily: '"DM Sans", sans-serif' }} className="text-gray-700 font-medium">
                                            {t.auth.emailLabel}
                                        </Label>
                                        <div className="relative">
                                            <Input
                                                ref={emailRef}
                                                id="reg-email"
                                                type="email"
                                                placeholder={t.auth.emailPlaceholder}
                                                value={email}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    setEmail(val);
                                                    setEmailAvailable(null);
                                                    if (errors.email) setErrors((p) => ({ ...p, email: undefined }));
                                                    checkEmail(val);
                                                }}
                                                onBlur={() => {
                                                    setEmailTouched(true);
                                                    if (email && !isValidEmail(email)) {
                                                        setErrors((p) => ({ ...p, email: t.auth.usernameHelp }));
                                                    }
                                                }}
                                                className={`h-11 rounded-lg border-gray-200 bg-white/50 backdrop-blur-sm transition-all focus:border-[#FF6B35] focus:ring-[#FF6B35] text-gray-900 pr-10 ${errors.email ? "border-red-400 focus:border-red-400 focus:ring-red-400" : emailTouched && email && isValidEmail(email) && emailAvailable === true ? "border-emerald-400" : ""
                                                    }`}
                                                style={{ fontFamily: '"DM Sans", sans-serif' }}
                                            />
                                            {/* Status indicator in input */}
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                {emailChecking && (
                                                    <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                                                )}
                                                {!emailChecking && emailAvailable === true && email && isValidEmail(email) && (
                                                    <Check className="h-4 w-4 text-emerald-500" strokeWidth={3} />
                                                )}
                                                {!emailChecking && emailAvailable === false && (
                                                    <X className="h-4 w-4 text-red-500" strokeWidth={3} />
                                                )}
                                            </div>
                                        </div>
                                        {/* Validation feedback */}
                                        {errors.email && (
                                            <p className="text-xs text-red-500" style={{ fontFamily: '"DM Sans", sans-serif' }}>
                                                {errors.email}
                                            </p>
                                        )}
                                        {emailChecking && (
                                            <p className="text-xs text-gray-400 font-medium" style={{ fontFamily: '"DM Sans", sans-serif' }}>
                                                {t.auth.checking}
                                            </p>
                                        )}
                                        {!emailChecking && emailTouched && email && isValidEmail(email) && emailAvailable === true && !errors.email && (
                                            <p className="flex items-center gap-1 text-xs text-emerald-600 font-medium" style={{ fontFamily: '"DM Sans", sans-serif' }}>
                                                <Check className="h-3 w-3" strokeWidth={3} /> {t.auth.looksGood}
                                            </p>
                                        )}
                                    </div>

                                    {/* Password */}
                                    <div className="space-y-1.5">
                                        <Label htmlFor="reg-password" style={{ fontFamily: '"DM Sans", sans-serif' }} className="text-gray-700 font-medium">
                                            {t.auth.passwordLabel}
                                        </Label>
                                        <div className="relative">
                                            <Input
                                                id="reg-password"
                                                type={showPassword ? "text" : "password"}
                                                placeholder={t.auth.passwordPlaceholder}
                                                value={password}
                                                onChange={(e) => {
                                                    setPassword(e.target.value);
                                                    if (errors.password) setErrors((p) => ({ ...p, password: undefined }));
                                                }}
                                                className={`h-11 rounded-lg border-gray-200 bg-white/50 pr-10 backdrop-blur-sm transition-all focus:border-[#FF6B35] focus:ring-[#FF6B35] text-gray-900 ${errors.password ? "border-red-400" : ""
                                                    }`}
                                                style={{ fontFamily: '"DM Sans", sans-serif' }}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                                tabIndex={-1}
                                            >
                                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                            </button>
                                        </div>
                                        {errors.password && (
                                            <p className="text-xs text-red-500" style={{ fontFamily: '"DM Sans", sans-serif' }}>
                                                {errors.password}
                                            </p>
                                        )}

                                        {/* Strength meter */}
                                        {password && (
                                            <div className="space-y-1.5 pt-1">
                                                <div className="flex gap-1">
                                                    {[1, 2, 3, 4].map((level) => (
                                                        <div
                                                            key={level}
                                                            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${level <= strengthLevel ? strengthColors[strengthLevel] : "bg-gray-200"
                                                                }`}
                                                        />
                                                    ))}
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span
                                                        className={`text-xs font-semibold ${strengthLevel <= 1
                                                            ? "text-red-500"
                                                            : strengthLevel === 2
                                                                ? "text-orange-500"
                                                                : strengthLevel === 3
                                                                    ? "text-yellow-600"
                                                                    : "text-emerald-600"
                                                            }`}
                                                        style={{ fontFamily: '"DM Sans", sans-serif' }}
                                                    >
                                                        {strengthInfo.label}
                                                    </span>
                                                    <span className="text-xs text-gray-400 font-medium" style={{ fontFamily: '"DM Sans", sans-serif' }}>
                                                        {strengthInfo.hint}
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Next button */}
                                    <Button
                                        type="button"
                                        disabled={!step1Valid}
                                        onClick={goNext}
                                        className="h-11 w-full rounded-lg bg-[#FF6B35] text-white hover:bg-[#e55a2b] shadow-lg shadow-orange-500/20 transition-all hover:shadow-orange-500/30 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none font-semibold"
                                        style={{ fontFamily: '"DM Sans", sans-serif' }}
                                    >
                                        {t.common.next}
                                        <ChevronRight className="ml-1 h-4 w-4" />
                                    </Button>
                                </div>
                            )}

                            {/* ── STEP 2: Identity & Profile ── */}
                            {currentStep === 2 && (
                                <div className="space-y-5">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <Label htmlFor="reg-firstName" style={{ fontFamily: '"DM Sans", sans-serif' }} className="text-gray-700 font-medium">
                                                {t.auth.firstNameLabel}
                                            </Label>
                                            <Input
                                                ref={firstNameRef}
                                                id="reg-firstName"
                                                placeholder={t.auth.firstNamePlaceholder}
                                                value={firstName}
                                                onChange={(e) => {
                                                    setFirstName(e.target.value);
                                                    if (errors.firstName) setErrors((p) => ({ ...p, firstName: undefined }));
                                                }}
                                                className={`h-11 rounded-lg border-gray-200 bg-white/50 backdrop-blur-sm transition-all focus:border-[#FF6B35] focus:ring-[#FF6B35] text-gray-900 ${errors.firstName ? "border-red-400" : ""
                                                    }`}
                                                style={{ fontFamily: '"DM Sans", sans-serif' }}
                                            />
                                            {errors.firstName && (
                                                <p className="text-xs text-red-500" style={{ fontFamily: '"DM Sans", sans-serif' }}>
                                                    {errors.firstName}
                                                </p>
                                            )}
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label htmlFor="reg-lastName" style={{ fontFamily: '"DM Sans", sans-serif' }} className="text-gray-700 font-medium">
                                                {t.auth.lastNameLabel}
                                            </Label>
                                            <Input
                                                id="reg-lastName"
                                                placeholder={t.auth.lastNamePlaceholder}
                                                value={lastName}
                                                onChange={(e) => {
                                                    setLastName(e.target.value);
                                                    if (errors.lastName) setErrors((p) => ({ ...p, lastName: undefined }));
                                                }}
                                                className={`h-11 rounded-lg border-gray-200 bg-white/50 backdrop-blur-sm transition-all focus:border-[#FF6B35] focus:ring-[#FF6B35] text-gray-900 ${errors.lastName ? "border-red-400" : ""
                                                    }`}
                                                style={{ fontFamily: '"DM Sans", sans-serif' }}
                                            />
                                            {errors.lastName && (
                                                <p className="text-xs text-red-500" style={{ fontFamily: '"DM Sans", sans-serif' }}>
                                                    {errors.lastName}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Username with availability check */}
                                    <div className="space-y-1.5">
                                        <Label htmlFor="reg-username" style={{ fontFamily: '"DM Sans", sans-serif' }} className="text-gray-700 font-medium">
                                            {t.auth.usernameLabel}
                                        </Label>
                                        <div className="relative">
                                            <Input
                                                id="reg-username"
                                                placeholder={t.auth.usernamePlaceholder}
                                                value={username}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    setUsername(val);
                                                    setUsernameTouched(true);
                                                    setUsernameAvailable(null);
                                                    if (errors.username) setErrors((p) => ({ ...p, username: undefined }));
                                                    checkUsername(val);
                                                }}
                                                className={`h-11 rounded-lg border-gray-200 bg-white/50 backdrop-blur-sm transition-all focus:border-[#FF6B35] focus:ring-[#FF6B35] text-gray-900 pr-10 ${errors.username ? "border-red-400" : usernameAvailable === true ? "border-emerald-400" : ""
                                                    }`}
                                                style={{ fontFamily: '"DM Sans", sans-serif' }}
                                            />
                                            {/* Status indicator */}
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                {usernameChecking && (
                                                    <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                                                )}
                                                {!usernameChecking && usernameAvailable === true && username.length >= 3 && (
                                                    <Check className="h-4 w-4 text-emerald-500" strokeWidth={3} />
                                                )}
                                                {!usernameChecking && usernameAvailable === false && (
                                                    <X className="h-4 w-4 text-red-500" strokeWidth={3} />
                                                )}
                                            </div>
                                        </div>
                                        {errors.username && (
                                            <p className="text-xs text-red-500" style={{ fontFamily: '"DM Sans", sans-serif' }}>
                                                {errors.username}
                                            </p>
                                        )}
                                        {usernameChecking && (
                                            <p className="text-xs text-gray-400 font-medium" style={{ fontFamily: '"DM Sans", sans-serif' }}>
                                                {t.auth.checking}
                                            </p>
                                        )}
                                        {!usernameChecking && !errors.username && usernameAvailable === true && username.length >= 3 && /^[a-zA-Z0-9_]+$/.test(username) && (
                                            <p className="flex items-center gap-1 text-xs text-emerald-600 font-medium" style={{ fontFamily: '"DM Sans", sans-serif' }}>
                                                <Check className="h-3 w-3" strokeWidth={3} /> {t.auth.usernameGood}
                                            </p>
                                        )}
                                        <p className="text-xs text-gray-400 font-medium" style={{ fontFamily: '"DM Sans", sans-serif' }}>
                                            {t.auth.usernameHelp}
                                        </p>
                                    </div>

                                    {/* Navigation */}
                                    <div className="flex gap-3 pt-1">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={goBack}
                                            className="h-11 flex-1 rounded-lg border-gray-200 bg-white hover:bg-gray-50 transition-all font-medium text-gray-900"
                                            style={{ fontFamily: '"DM Sans", sans-serif' }}
                                        >
                                            <ChevronLeft className="mr-1 h-4 w-4" />
                                            {t.common.back}
                                        </Button>
                                        <Button
                                            type="button"
                                            disabled={!step2Valid}
                                            onClick={goNext}
                                            className="h-11 flex-[2] rounded-lg bg-[#FF6B35] text-white hover:bg-[#e55a2b] shadow-lg shadow-orange-500/20 transition-all hover:shadow-orange-500/30 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none font-semibold"
                                            style={{ fontFamily: '"DM Sans", sans-serif' }}
                                        >
                                            {t.common.next}
                                            <ChevronRight className="ml-1 h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* ── STEP 3: Personalization & Consent ── */}
                            {currentStep === 3 && (
                                <div className="space-y-5">
                                    {/* Study Goal */}
                                    <div className="space-y-1.5">
                                        <Label htmlFor="reg-studyGoal" style={{ fontFamily: '"DM Sans", sans-serif' }} className="text-gray-700 font-medium">
                                            {t.auth.learnGoalLabel}{" "}
                                            <span className="text-gray-400 font-normal italic md:not-italic">(optional)</span>
                                        </Label>
                                        <textarea
                                            ref={studyGoalRef}
                                            id="reg-studyGoal"
                                            placeholder={t.auth.learnGoalPlaceholder}
                                            value={studyGoal}
                                            onChange={(e) => setStudyGoal(e.target.value)}
                                            rows={2}
                                            className="flex w-full rounded-lg border border-gray-200 bg-white/50 px-3 py-2 text-sm shadow-sm backdrop-blur-sm transition-all placeholder:text-gray-400 focus:border-[#FF6B35] focus:ring-1 focus:ring-[#FF6B35] focus:outline-none resize-none text-gray-900"
                                            style={{ fontFamily: '"DM Sans", sans-serif' }}
                                        />
                                    </div>

                                    {/* Newsletter */}
                                    <label
                                        className="flex items-start gap-3 cursor-pointer group"
                                        style={{ fontFamily: '"DM Sans", sans-serif' }}
                                    >
                                        <div className="relative mt-0.5">
                                            <input
                                                type="checkbox"
                                                checked={newsletter}
                                                onChange={(e) => setNewsletter(e.target.checked)}
                                                className="peer sr-only"
                                            />
                                            <div className="h-5 w-5 rounded border-2 border-gray-300 bg-white transition-all peer-checked:border-[#FF6B35] peer-checked:bg-[#FF6B35] peer-focus-visible:ring-2 peer-focus-visible:ring-[#FF6B35]/30">
                                                <Check className="h-full w-full p-0.5 text-white opacity-0 peer-checked:opacity-100 transition-opacity" />
                                            </div>
                                            {newsletter && (
                                                <Check className="absolute inset-0 h-5 w-5 p-0.5 text-white pointer-events-none" />
                                            )}
                                        </div>
                                        <span className="text-sm text-gray-600 leading-tight select-none">
                                            {t.auth.newsletter}
                                            <span className="block text-xs text-gray-400 mt-0.5">{t.auth.newsletterDetail}</span>
                                        </span>
                                    </label>

                                    {/* Terms */}
                                    <label
                                        className="flex items-start gap-3 cursor-pointer group"
                                        style={{ fontFamily: '"DM Sans", sans-serif' }}
                                    >
                                        <div className="relative mt-0.5">
                                            <input
                                                type="checkbox"
                                                checked={termsAccepted}
                                                onChange={(e) => {
                                                    setTermsAccepted(e.target.checked);
                                                    if (errors.terms) setErrors((p) => ({ ...p, terms: undefined }));
                                                }}
                                                className="peer sr-only"
                                            />
                                            <div className={`h-5 w-5 rounded border-2 bg-white transition-all peer-checked:border-[#FF6B35] peer-checked:bg-[#FF6B35] peer-focus-visible:ring-2 peer-focus-visible:ring-[#FF6B35]/30 ${errors.terms ? "border-red-400" : "border-gray-300"}`}>
                                            </div>
                                            {termsAccepted && (
                                                <Check className="absolute inset-0 h-5 w-5 p-0.5 text-white pointer-events-none" />
                                            )}
                                        </div>
                                        <span className="text-sm text-gray-600 leading-tight select-none">
                                            {t.auth.termsAccept}{" "}
                                            <a href="/terms" target="_blank" className="text-[#FF6B35] hover:underline font-semibold">
                                                {t.auth.termsOfService}
                                            </a>{" "}
                                            {t.auth.and}{" "}
                                            <a href="/privacy" target="_blank" className="text-[#FF6B35] hover:underline font-semibold">
                                                {t.auth.privacyPolicy}
                                            </a>
                                            <span className="text-red-500 ml-0.5">*</span>
                                        </span>
                                    </label>
                                    {errors.terms && (
                                        <p className="text-xs text-red-500 -mt-3" style={{ fontFamily: '"DM Sans", sans-serif' }}>
                                            {errors.terms}
                                        </p>
                                    )}

                                    {/* Navigation */}
                                    <div className="flex gap-3 pt-1">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={goBack}
                                            className="h-11 flex-1 rounded-lg border-gray-200 bg-white hover:bg-gray-50 transition-all font-medium text-gray-900"
                                            style={{ fontFamily: '"DM Sans", sans-serif' }}
                                        >
                                            <ChevronLeft className="mr-1 h-4 w-4" />
                                            {t.common.back}
                                        </Button>
                                        <Button
                                            type="button"
                                            disabled={!termsAccepted || isSubmitting}
                                            onClick={handleSubmit}
                                            className="h-11 flex-[2] rounded-lg bg-[#FF6B35] text-white hover:bg-[#e55a2b] shadow-lg shadow-orange-500/20 transition-all hover:shadow-orange-500/30 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none font-bold"
                                            style={{ fontFamily: '"DM Sans", sans-serif' }}
                                        >
                                            {isSubmitting ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    {t.common.loading}
                                                </>
                                            ) : (
                                                t.auth.createAccount
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Footer link */}
                    <div className="mt-8 text-center text-sm text-gray-500" style={{ fontFamily: '"DM Sans", sans-serif' }}>
                        {t.auth.alreadyHaveAccount}{" "}
                        <Link
                            to="/login"
                            className="font-semibold text-[#FF6B35] hover:underline"
                        >
                            {t.auth.signInButton}
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
