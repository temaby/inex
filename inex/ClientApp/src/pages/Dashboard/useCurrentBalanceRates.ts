import { useEffect, useState } from "react";
import dayjs from "dayjs";
import { requestRatesForRange } from "../../store/rates/rates-action";
import type { ExchangeRateItem } from "../../store/rates/rates-slice";

// A historical report must never replace the rates used to value today's wallets.
export const useCurrentBalanceRates = (
    enabled: boolean,
    currentMonth: string,
    userId: number | undefined,
    linkedUserId: number | null,
    baseCurrency: string,
) => {
    const [attempt, setAttempt] = useState(0);
    const [result, setResult] = useState<{ key: string; items: ExchangeRateItem[]; loading: boolean }>();
    const key = `${userId}:${linkedUserId ?? "self"}:${baseCurrency}:${currentMonth}`;
    useEffect(() => {
        if (!enabled) return;
        let active = true;
        setResult({ key, items: [], loading: true });
        void requestRatesForRange(`${currentMonth}-01`, dayjs(`${currentMonth}-01`).endOf("month").format("YYYY-MM-DD"), linkedUserId)
            .then((items) => { if (active) setResult({ key, items, loading: false }); })
            .catch(() => { if (active) setResult({ key, items: [], loading: false }); });
        return () => { active = false; };
    }, [enabled, currentMonth, linkedUserId, key, attempt]);
    return {
        items: enabled && result?.key === key ? result.items : [],
        loading: enabled && (result?.key !== key || result.loading),
        retry: () => setAttempt((value) => value + 1),
    };
};
