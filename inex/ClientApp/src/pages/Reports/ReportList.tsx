import * as React from "react";
import { BarChart3, CalendarDays, Flame, PieChart, Target } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate, useOutletContext } from "react-router-dom";
import type { ReportsHubContext } from "../Reports";
import "./reports.css";

interface ReportCard {
    id: string;
    titleKey: string;
    descriptionKey: string;
    metricLabelKey: string;
    metricValueKey: string;
    sectionKey: string;
    icon: LucideIcon;
}

const cards: ReportCard[] = [
    {
        id: "category",
        titleKey: "reports.categoryReport",
        descriptionKey: "reports.hub.categoryDescription",
        metricLabelKey: "reports.hub.metricPeriod",
        metricValueKey: "reports.hub.metricSelectedMonth",
        sectionKey: "reports.hub.sectionSpending",
        icon: PieChart,
    },
    {
        id: "budget",
        titleKey: "reports.budgetReport",
        descriptionKey: "reports.hub.budgetDescription",
        metricLabelKey: "reports.hub.metricFocus",
        metricValueKey: "reports.hub.metricBudget",
        sectionKey: "reports.hub.sectionPlanning",
        icon: Target,
    },
    {
        id: "history",
        titleKey: "reports.historyReport",
        descriptionKey: "reports.hub.historyDescription",
        metricLabelKey: "reports.hub.metricRange",
        metricValueKey: "reports.hub.metricYear",
        sectionKey: "reports.hub.sectionTrends",
        icon: BarChart3,
    },
    {
        id: "heatmap",
        titleKey: "reports.heatmapReport",
        descriptionKey: "reports.hub.heatmapDescription",
        metricLabelKey: "reports.hub.metricRange",
        metricValueKey: "reports.hub.metricCurrentMonth",
        sectionKey: "reports.hub.sectionSpending",
        icon: Flame,
    },
];

const ReportList = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { period, periodLabel } = useOutletContext<ReportsHubContext>();
    const groupedCards = cards.reduce<Record<string, ReportCard[]>>((acc, card) => {
        const section = t(card.sectionKey);
        acc[section] = [...(acc[section] ?? []), card];
        return acc;
    }, {});

    return (
        <div className="reports-workspace">
            <p className="reports-intro">{t("reports.hub.description", { period: periodLabel })}</p>
            {Object.entries(groupedCards).map(([section, sectionCards]) => (
                <section className="reports-hub-section" key={section}>
                    <h2 className="reports-hub-section__title">{section}</h2>
                    <div className="reports-hub-grid">
                        {sectionCards.map((card) => {
                            const Icon = card.icon;
                            const metricValue = card.metricValueKey === "reports.hub.metricSelectedMonth"
                                ? periodLabel
                                : t(card.metricValueKey);
                            const interval = period.format("YYYY-MM");
                            const target = card.id === "history"
                                ? `/reports/history?year=${period.year()}`
                                : `/reports/${card.id}?interval=${interval}`;

                            return (
                                <button
                                    type="button"
                                    key={card.id}
                                    className="reports-hub-card"
                                    onClick={() => navigate(target)}
                                >
                                    <div className="reports-hub-card__top">
                                        <span className="reports-hub-card__icon" aria-hidden="true">
                                            <Icon size={20} />
                                        </span>
                                        <CalendarDays size={17} aria-hidden="true" />
                                    </div>
                                    <div>
                                        <h3>{t(card.titleKey)}</h3>
                                        <p>{t(card.descriptionKey)}</p>
                                    </div>
                                    <div className="reports-hub-card__metric">
                                        <span>{t(card.metricLabelKey)}</span>
                                        <strong>{metricValue}</strong>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </section>
            ))}
        </div>
    );
};

export default ReportList;
