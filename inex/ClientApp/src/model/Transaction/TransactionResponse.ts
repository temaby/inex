export interface TransactionResponse {
    id: number;
    accountId: number;
    categoryId: number;
    created: string;
    amount: number;
    comment: string | null;
    tags: string[];
    refs: string[];
    accountCurrency: string;
}
