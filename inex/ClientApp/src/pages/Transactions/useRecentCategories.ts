import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";

import type { CategoryDetails } from "../../model/Category/CategoryDetails";
import type { TransactionResponse } from "../../model/Transaction/TransactionResponse";
import { TransactionType } from "../../model/Transaction/TransactionType";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import type { AppDispatch } from "../../store";
import { transactionsApi } from "../../store/transactions/transactions-api";
import { eligibleRecentCategories, rankRecentCategories } from "./recent-categories";

const HISTORY_LIMIT = 500;
// A drawer can remount before RTK has finished aborting its old request. Share
// completion guards per store, without retaining any transaction data.
const pendingHistoryRequests = new WeakMap<AppDispatch, Promise<void>>();

export const useRecentCategories = (categories: CategoryDetails[], mode: TransactionType): CategoryDetails[] => {
    const dispatch = useAppDispatch();
    const userId = useAppSelector(state => state.auth.user?.id) ?? 0;
    const [history, setHistory] = useState<{ userId: number; transactions: TransactionResponse[] }>();
    const today = useMemo(() => dayjs(), []);
    const hasEligibleCategories = eligibleRecentCategories(categories).length > 0;

    useEffect(() => {
        setHistory(undefined);
        if (!userId || !hasEligibleCategories) return;
        let active = true;
        let stopRequest: (() => void) | undefined;
        const load = async () => {
            // This also covers immediate close/reopen and different-user remounts.
            await pendingHistoryRequests.get(dispatch);
            if (!active) return;
            const request = dispatch(transactionsApi.endpoints.getTransactions.initiate({
                page: 1,
                pageSize: HISTORY_LIMIT,
                filter: {
                    accountIds: [], categoryIds: [], tags: [], refs: [], type: "all",
                    range: [today.startOf("day").subtract(29, "day").unix(), today.endOf("day").unix()],
                },
            // RTK 1.9 needs a subscription to initialize a new query's result.
            // Release it when this one-off request completes.
            }, { subscribe: true, forceRefetch: true }));
            stopRequest = () => { request.abort(); request.unsubscribe(); };
            const completion = request.unwrap().then(result => {
                // A partial sample can misidentify the most frequent category.
                if (active && Number.isInteger(result.metadata?.totalItems)
                    && result.metadata.totalItems === result.data.length && result.data.length <= HISTORY_LIMIT) {
                    setHistory({ userId, transactions: result.data });
                }
            }).catch(() => { /* The ordinary category selector remains available. */ })
                .finally(() => {
                    request.unsubscribe();
                    if (pendingHistoryRequests.get(dispatch) === completion) pendingHistoryRequests.delete(dispatch);
                });
            pendingHistoryRequests.set(dispatch, completion);
            await completion;
        };
        void load();
        return () => { active = false; stopRequest?.(); };
    }, [dispatch, hasEligibleCategories, today, userId]);

    return useMemo(() => history?.userId === userId
        ? rankRecentCategories(categories, history.transactions, mode, today)
        : [], [categories, history, mode, today, userId]);
};
