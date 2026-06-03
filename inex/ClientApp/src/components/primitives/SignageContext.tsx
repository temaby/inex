import * as React from 'react';

export type Signage = "color-only" | "signed" | "arrows";

interface SignageContextValue {
    signage: Signage;
    setSignage: (signage: Signage) => void;
}

const storageKey = "inex_signage";
const validSignage = new Set<Signage>(["color-only", "signed", "arrows"]);

const readStoredSignage = (): Signage => {
    if (typeof window === "undefined") {
        return "color-only";
    }

    try {
        const stored = window.localStorage.getItem(storageKey);
        return validSignage.has(stored as Signage) ? (stored as Signage) : "color-only";
    } catch {
        return "color-only";
    }
};

export const SignageContext = React.createContext<SignageContextValue>({
    signage: "color-only",
    setSignage: () => undefined,
});

export const SignageProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
    const [signage, setSignageState] = React.useState<Signage>(readStoredSignage);

    const setSignage = React.useCallback((nextSignage: Signage) => {
        try {
            window.localStorage.setItem(storageKey, nextSignage);
        } catch {
            // Local storage may be unavailable in private windows; keep the in-memory preference.
        }

        setSignageState(nextSignage);
    }, []);

    return (
        <SignageContext.Provider value={{ signage, setSignage }}>
            {children}
        </SignageContext.Provider>
    );
};

export const useSignage = () => React.useContext(SignageContext);
