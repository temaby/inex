export interface AccountSummary {
    id: number;
    key: string;
    name: string;
    description: string | null;
    isEnabled: boolean;
    currencyId: number;
    currency: string;
    value: number;
    thisMonthNet: number;
}
