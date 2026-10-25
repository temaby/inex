import { useCallback, useSyncExternalStore } from "react";

export type DashboardVariant = "classic" | "visual";

const CHANGE_EVENT = "inex-dashboard-variant-change";
const sessionFallback = new Map<string, DashboardVariant>();

export const getDashboardVariantStorageKey = (userId: number) => `inex.dashboard.variant.user-${userId}`;

const readVariant = (key: string | null): DashboardVariant => {
    if (!key) return "classic";
    if (sessionFallback.has(key)) return sessionFallback.get(key) ?? "classic";
    try {
        return window.localStorage.getItem(key) === "visual" ? "visual" : "classic";
    } catch {
        return "classic";
    }
};

export const useDashboardVariant = (userId?: number): [DashboardVariant, (value: DashboardVariant) => void] => {
    const key = userId == null ? null : getDashboardVariantStorageKey(userId);
    const subscribe = useCallback((notify: () => void) => {
        const onStorage = (event: StorageEvent) => {
            if (event.key === null || event.key === key) {
                if (key) sessionFallback.delete(key);
                notify();
            }
        };
        window.addEventListener("storage", onStorage);
        window.addEventListener(CHANGE_EVENT, notify);
        return () => {
            window.removeEventListener("storage", onStorage);
            window.removeEventListener(CHANGE_EVENT, notify);
        };
    }, [key]);
    const getSnapshot = useCallback(() => readVariant(key), [key]);
    const variant = useSyncExternalStore(subscribe, getSnapshot, () => "classic" as const);
    const setVariant = useCallback((value: DashboardVariant) => {
        if (!key) return;
        try {
            window.localStorage.setItem(key, value);
            sessionFallback.delete(key);
        } catch {
            // Keep the choice usable for this browser session when persistence is blocked.
            sessionFallback.set(key, value);
        }
        window.dispatchEvent(new Event(CHANGE_EVENT));
    }, [key]);
    return [variant, setVariant];
};
