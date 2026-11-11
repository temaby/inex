export const createFixedAmountFormatter = (
    locale: string | undefined,
    fractionDigits: number,
    signDisplay: Intl.NumberFormatOptions["signDisplay"] = "auto",
) => new Intl.NumberFormat(locale, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
    signDisplay,
});
