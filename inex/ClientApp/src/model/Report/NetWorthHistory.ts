export interface NetWorthHistoryPoint {
    month: string;
    monthEnd: string;
    netWorth: number;
    currency: string;
}

export interface NetWorthHistoryResponse {
    data: NetWorthHistoryPoint[];
}
