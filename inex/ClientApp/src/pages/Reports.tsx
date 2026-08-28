import * as React from "react";
import { useMemo, useState } from "react";
import { DatePicker, message, Modal, Select } from "antd";
import dayjs from "dayjs";
import type { Dayjs } from "dayjs";
import { Download, Printer, Settings2, Share2, ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import BasicPage from "../layouts/BasicPage";
import { InExButton } from "../components/primitives";
import { useGetAccountsQuery } from "../store/accounts/accounts-api";
import apiClient from "../utils/apiClient";
import "./Reports/reports.css";

export interface ReportsHubContext {
    period: Dayjs;
    periodLabel: string;
}

const dateFormat = "YYYY-MM";

const Reports = () => {
    const { t, i18n } = useTranslation();
    const location = useLocation();
    const navigate = useNavigate();
    const [hubPeriod, setHubPeriod] = useState(dayjs());
    const [isMonthlyPdfExporting, setIsMonthlyPdfExporting] = useState(false);
    const [isMonthlyPdfConfigurationOpen, setIsMonthlyPdfConfigurationOpen] = useState(false);
    const [selectedAccountIds, setSelectedAccountIds] = useState<number[]>([]);
    const activeAccountsQuery = useGetAccountsQuery("active");
    const activeAccounts = activeAccountsQuery.data ?? [];
    const normalizedPath = location.pathname.replace(/\/+$/, "") || "/";

    const reportTitles: Record<string, string> = {
        "/reports": t("reports.title"),
        "/reports/category": t("reports.categoryReport"),
        "/reports/budget": t("reports.budgetReport"),
        "/reports/history": t("reports.historyReport"),
        "/reports/heatmap": t("reports.heatmapReport"),
    };

    const title = reportTitles[normalizedPath] || t("reports.title");
    const isHub = normalizedPath === "/reports";
    const periodLabel = useMemo(
        () => hubPeriod.toDate().toLocaleDateString(i18n.language, { month: "long", year: "numeric" }),
        [hubPeriod, i18n.language],
    );

    const handleShare = async () => {
        const shareUrl = window.location.href;
        try {
            if (navigator.share) {
                await navigator.share({ title, url: shareUrl });
                return;
            }

            await navigator.clipboard?.writeText(shareUrl);
        } catch {
            // Native share can reject on user cancel; keep route chrome stable.
        }
    };

    const handleExport = () => {
        const reportText = document.querySelector(".reports-route")?.textContent?.trim() ?? "";
        const content = `${title}\n${window.location.href}\n${new Date().toISOString()}\n\n${reportText}`;
        const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "inex-report-export.txt";
        link.click();
        URL.revokeObjectURL(url);
    };

    const handleMonthlyPdfExport = async (accountIds?: number[]) => {
        setIsMonthlyPdfExporting(true);
        try {
            const response = await apiClient.get("/reports/monthly-pdf", {
                params: {
                    year: hubPeriod.year(),
                    month: hubPeriod.month() + 1,
                    ...(accountIds ? { accountIds } : {}),
                },
                paramsSerializer: { indexes: null },
                responseType: "blob",
            });
            const url = URL.createObjectURL(response.data);
            const link = document.createElement("a");
            link.href = url;
            link.download = `inex-monthly-financial-report-${hubPeriod.format("YYYY-MM")}.pdf`;
            link.click();
            URL.revokeObjectURL(url);
            return true;
        } catch {
            message.error(t("reports.monthlyPdfExportError"));
            return false;
        } finally {
            setIsMonthlyPdfExporting(false);
        }
    };

    const openMonthlyPdfConfiguration = () => {
        if (activeAccountsQuery.isError) {
            message.error(t("reports.monthlyPdfAccountsLoadError"));
            return;
        }

        setSelectedAccountIds(activeAccounts.map((account) => account.id));
        setIsMonthlyPdfConfigurationOpen(true);
    };

    const handleConfiguredMonthlyPdfExport = async () => {
        if (await handleMonthlyPdfExport(selectedAccountIds)) {
            setIsMonthlyPdfConfigurationOpen(false);
        }
    };

    const extra = isHub ? (
        <div className="reports-hub-controls">
            <DatePicker
                picker="month"
                value={hubPeriod}
                format={dateFormat}
                allowClear={false}
                inputReadOnly
                disabledDate={(date) => date.endOf("month").isAfter(dayjs(), "month")}
                onChange={(date) => {
                    if (date) setHubPeriod(date);
                }}
                aria-label={t("reports.periodControl")}
            />
            <InExButton
                kind="default"
                icon={<Settings2 size={16} aria-hidden="true" />}
                disabled={activeAccountsQuery.isLoading}
                onClick={openMonthlyPdfConfiguration}
            >
                {t("reports.configure")}
            </InExButton>
            <InExButton
                kind="primary"
                icon={<Download size={16} aria-hidden="true" />}
                disabled={isMonthlyPdfExporting}
                onClick={() => void handleMonthlyPdfExport()}
            >
                {t("reports.monthlyPdfExport")}
            </InExButton>
        </div>
    ) : (
        <div className="reports-drill-actions">
            <InExButton
                kind="ghost"
                icon={<ArrowLeft size={16} aria-hidden="true" />}
                onClick={() => navigate("/reports")}
            >
                {t("reports.allReports")}
            </InExButton>
            <InExButton kind="default" icon={<Share2 size={16} aria-hidden="true" />} onClick={handleShare}>
                {t("reports.share")}
            </InExButton>
            <InExButton kind="default" icon={<Download size={16} aria-hidden="true" />} onClick={handleExport}>
                {t("reports.export")}
            </InExButton>
            <InExButton kind="default" icon={<Printer size={16} aria-hidden="true" />} onClick={() => window.print()}>
                {t("reports.print")}
            </InExButton>
        </div>
    );

    return (
        <>
            <BasicPage frame="analytics" title={title} subtitle={isHub ? t("reports.subtitleHub") : t("reports.subtitleDrilldown")} extra={extra}>
                <div className="reports-route">
                    <Outlet context={{ period: hubPeriod, periodLabel } satisfies ReportsHubContext} />
                </div>
            </BasicPage>
            <Modal
                title={t("reports.monthlyPdfConfigureTitle")}
                open={isMonthlyPdfConfigurationOpen}
                okText={t("reports.monthlyPdfConfigureExport")}
                cancelText={t("common.cancel")}
                confirmLoading={isMonthlyPdfExporting}
                okButtonProps={{ disabled: selectedAccountIds.length === 0 || activeAccounts.length === 0 }}
                onCancel={() => setIsMonthlyPdfConfigurationOpen(false)}
                onOk={() => void handleConfiguredMonthlyPdfExport()}
            >
                <p>{t("reports.monthlyPdfConfigureDescription")}</p>
                {activeAccounts.length === 0 ? (
                    <p>{t("reports.monthlyPdfNoActiveAccounts")}</p>
                ) : (
                    <>
                        <label htmlFor="monthly-pdf-accounts">{t("reports.monthlyPdfAccountsLabel")}</label>
                        <Select
                            id="monthly-pdf-accounts"
                            mode="multiple"
                            value={selectedAccountIds}
                            options={activeAccounts.map((account) => ({
                                value: account.id,
                                label: `${account.name} (${account.currency})`,
                            }))}
                            style={{ width: "100%", marginTop: 8 }}
                            onChange={setSelectedAccountIds}
                        />
                    </>
                )}
            </Modal>
        </>
    );
};

export default Reports;
