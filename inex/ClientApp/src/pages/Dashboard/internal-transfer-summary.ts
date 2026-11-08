import type { TransactionInternalTransferBucket } from "../../store/transactions/transactions-api";
import { getCashFlowConversionResult, type ExchangeRateLike } from "../Transactions/transaction-ledger-utils";

export const convertInternalTransferSummary = (
    buckets: TransactionInternalTransferBucket[], baseCurrency: string, rates: ExchangeRateLike[],
) => {
    const recordCount = buckets.reduce((count, bucket) => count + bucket.recordCount, 0);
    const converted = getCashFlowConversionResult({
        totalCount: recordCount,
        cashFlowBuckets: buckets.map((bucket) => ({
            date: bucket.date, currency: bucket.currency, recordCount: bucket.recordCount,
            income: bucket.amountReceived, expense: -bucket.amountSent,
        })),
    }, baseCurrency, rates);
    return {
        recordCount,
        amountReceived: converted.income,
        amountSent: Math.abs(converted.expense),
        netChange: converted.net,
        isComplete: converted.isComplete,
        warnings: converted.warnings,
    };
};
