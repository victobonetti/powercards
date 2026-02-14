import React, { createContext, useContext, useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { translations, Language, Translations } from '../i18n/translations';

interface LanguageContextType {
    language: Language;
    t: Translations;
    setLanguage: (lang: Language) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
    const [language, setLanguageState] = useState<Language>('en');
    const navigate = useNavigate();
    const location = useLocation();

    // Helper to extract lang from path
    const getLangFromPath = (pathname: string): Language | null => {
        const parts = pathname.split('/');
        if (parts[1] === 'en') return 'en';
        if (parts[1] === 'pt') return 'pt';
        return null;
    };

    useEffect(() => {
        const langFromPath = getLangFromPath(location.pathname);
        if (langFromPath && langFromPath !== language) {
            setLanguageState(langFromPath);
        } else if (!langFromPath && location.pathname !== '/') {
            // If we are on a route without lang prefix (except root), strictly we might want to redirect
            // But for now, let's just default to 'en' or current
        }
    }, [location.pathname]);

    const setLanguage = (lang: Language) => {
        setLanguageState(lang);

        // Rewrite URL
        const currentPath = location.pathname;
        const parts = currentPath.split('/');

        // If current path already has a language prefix, replace it
        if (parts[1] === 'en' || parts[1] === 'pt') {
            parts[1] = lang;
            navigate(parts.join('/') + location.search + location.hash);
        } else {
            // If no prefix (e.g. root or direct access), prepend
            // Note: This case handles root '/' primarily
            if (currentPath === '/') {
                navigate(`/${lang}`);
            } else {
                navigate(`/${lang}${currentPath}`);
            }
        }
    };

    return (
        <LanguageContext.Provider value={{ language, t: translations[language], setLanguage }}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
}
