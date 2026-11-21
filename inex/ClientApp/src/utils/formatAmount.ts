export const createFixedAmountFormatter = (
    locale: string | undefined,
    fractionDigits: number,
    signDisplay: Intl.NumberFormatOptions["signDisplay"] = "auto",
) => new Intl.NumberFormat(locale, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
    signDisplay,
});

export const getCurrencyFractionDigits = (currency: string | undefined): number =>
    currency && /^[a-z]{3}$/i.test(currency)
        ? new Intl.NumberFormat(undefined, { style: "currency", currency }).resolvedOptions().maximumFractionDigits ?? 2
        : 2;
