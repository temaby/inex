import * as React from "react";
import { Alert, Pagination, Select, Spin, Tag } from "antd";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import { skipToken } from "@reduxjs/toolkit/query";
import { InExButton, Num } from "../../components/primitives";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import type { AccountResponse } from "../../store/accounts/accounts-api";
import { refreshObservedInternalTransferPostings, useDecideInternalTransferMutation, useGetInternalTransferRequestsQuery, type InternalTransferRequestResponse } from "../../store/transactions/transactions-api";
import { parseAxiosError } from "../../utils/parseAxiosError";

function RequestCard({ request, accounts, userId }: { request: InternalTransferRequestResponse; accounts: AccountResponse[]; userId: number }) {
    const { t } = useTranslation();
    const [accountId, setAccountId] = React.useState<number>();
    const [error, setError] = React.useState<string>();
    const [decide, { isLoading }] = useDecideInternalTransferMutation();
    const incoming = request.linkedUserId === userId;
    const value = incoming ? -request.masterValue : request.masterValue;
    const eligible = accounts.filter(account => account.isEnabled && account.currency === request.currency);
    const selectedEligible = eligible.some(account => account.id === accountId);
    const decideRequest = async (decision: "accept" | "reject" | "cancel") => {
        setError(undefined);
        try { await decide({ id: request.id, decision, accountId: decision === "accept" ? accountId : undefined }).unwrap(); }
        catch (cause) { setError(parseAxiosError(cause, t("transferRequests.failure"), t)); }
    };
    return <article className="transfer-request-card">
        <div className="transfer-request-card__header">
            <strong>{t(incoming ? "transferRequests.incoming" : "transferRequests.sent")} #{request.id}</strong>
            <Tag>{t(`transferRequests.status.${request.status}`)}</Tag>
        </div>
        <p className="transfer-request-card__comment">{incoming ? request.masterUsername : request.linkedUsername}</p>
        <Num value={value} currency={request.currency} signage="signed" />
        <div>{dayjs(request.operationDate).format("DD.MM.YYYY")}</div>
        {request.comment && <p className="transfer-request-card__comment">{request.comment}</p>}
        <p>{t("transferRequests.originalTerms")}</p>
        {request.decidedAt && <p>{t("transferRequests.decidedAt", { date: dayjs(request.decidedAt).format("DD.MM.YYYY HH:mm") })}</p>}
        {request.status === "Pending" && <>
            <p>{t(incoming ? (value > 0 ? "transferRequests.creditConsent" : "transferRequests.debitConsent") : "transferRequests.pendingGuard")}</p>
            {incoming && !request.canAccept && <Alert type="warning" showIcon message={t("transferRequests.linkUnavailable")} />}
            {incoming && request.canAccept && <>
                <label htmlFor={`request-account-${request.id}`}>{t("transactions.account")}</label>
                <Select id={`request-account-${request.id}`} style={{ width: "100%" }} value={selectedEligible ? accountId : undefined}
                    placeholder={t("transactions.selectAccount")} onChange={setAccountId}
                    options={eligible.map(account => ({ label: account.name, value: account.id }))} />
                {eligible.length === 0 && <Alert type="info" showIcon message={t("transferRequests.noAccount", { currency: request.currency })} />}
            </>}
            <div className="transfer-request-card__actions">
                {incoming && <InExButton kind="primary" disabled={isLoading || !request.canAccept || !selectedEligible} onClick={() => void decideRequest("accept")}>
                    {t("transferRequests.accept")}
                </InExButton>}
                <InExButton kind="default" disabled={isLoading} onClick={() => void decideRequest(incoming ? "reject" : "cancel")}>
                    {t(incoming ? "transferRequests.reject" : "transferRequests.cancel")}
                </InExButton>
            </div>
        </>}
        {error && <Alert type="error" showIcon message={error} />}
    </article>;
}

export default function InternalTransferRequests({ accounts }: { accounts: AccountResponse[] }) {
    const { t } = useTranslation();
    const userId = useAppSelector(state => state.auth.user?.id);
    const dispatch = useAppDispatch();
    const [pagination, setPagination] = React.useState({ userId, page: 1 });
    const page = pagination.userId === userId ? pagination.page : 1;
    React.useEffect(() => setPagination({ userId, page: 1 }), [userId]);
    const observed = React.useRef<{ userId: number | undefined; page?: number; totalPending?: number; pendingIds: Set<number>; statuses: Map<number, string> }>({ userId, pendingIds: new Set(), statuses: new Map() });
    const { currentData: result, isLoading, isError, refetch } = useGetInternalTransferRequestsQuery(userId == null ? skipToken : { userId, page }, { pollingInterval: 30000, refetchOnMountOrArgChange: true, refetchOnFocus: true });
    React.useEffect(() => {
        if (observed.current.userId !== userId) observed.current = { userId, pendingIds: new Set(), statuses: new Map() };
        if (!result || userId == null || result.page !== page) return;
        // A resolved request can move off this page because Pending rows sort first.
        // Refresh financial caches even when an acceptance is visible only as disappearance/count decrease.
        const ids = new Set(result.data.map(request => request.id));
        const pendingDisappeared = observed.current.page === page && [...observed.current.pendingIds].some(id => !ids.has(id));
        let postingMayHaveChanged = pendingDisappeared || (observed.current.totalPending !== undefined && result.totalPending < observed.current.totalPending);
        for (const request of result.data) {
            if (request.status === "Accepted" && observed.current.statuses.get(request.id) === "Pending") postingMayHaveChanged = true;
            observed.current.statuses.set(request.id, request.status);
        }
        observed.current.page = page;
        observed.current.totalPending = result.totalPending;
        observed.current.pendingIds = new Set(result.data.filter(request => request.status === "Pending").map(request => request.id));
        if (postingMayHaveChanged) refreshObservedInternalTransferPostings(dispatch);
    }, [dispatch, page, result, userId]);
    const pending = result?.totalPending ?? 0;
    if (userId == null) return null;
    return <section className="transfer-requests" aria-label={t("transferRequests.title")}>
        <h2>{t("transferRequests.title")} {pending > 0 && <Tag>{t("transferRequests.pendingCount", { count: pending })}</Tag>}</h2>
        <p>{t("transferRequests.explanation")}</p>
        {isLoading && <Spin />}
        {isError && <Alert type="error" message={t("transferRequests.loadFailure")} action={<InExButton kind="default" onClick={() => void refetch()}>{t("transferRequests.retry")}</InExButton>} />}
        {result && result.data.length === 0 && <p>{t("transferRequests.empty")}</p>}
        <div className="transfer-requests__list">{result?.data.map(request => <RequestCard key={`${userId}:${request.id}`} request={request} accounts={accounts} userId={userId ?? 0} />)}</div>
        {result && result.totalItems > 10 && <Pagination current={page} pageSize={10} total={result.totalItems} showSizeChanger={false} onChange={nextPage => setPagination({ userId, page: nextPage })} />}
    </section>;
}
