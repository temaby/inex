import * as React from 'react';

export type UserSignage = "color-only" | "signed" | "arrows";
export type Signage = UserSignage | "negative-only";

interface SignageContextValue {
    signage: UserSignage;
    setSignage: (signage: UserSignage) => void;
}

const storageKey = "inex_signage";
const validSignage = new Set<UserSignage>(["color-only", "signed", "arrows"]);

const readStoredSignage = (): UserSignage => {
    if (typeof window === "undefined") {
        return "color-only";
    }

    try {
        const stored = window.localStorage.getItem(storageKey);
        return validSignage.has(stored as UserSignage) ? (stored as UserSignage) : "color-only";
    } catch {
        return "color-only";
    }
};

export const SignageContext = React.createContext<SignageContextValue>({
    signage: "color-only",
    setSignage: () => undefined,
});

export const SignageProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
    const [signage, setSignageState] = React.useState<UserSignage>(readStoredSignage);

    const setSignage = React.useCallback((nextSignage: UserSignage) => {
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
