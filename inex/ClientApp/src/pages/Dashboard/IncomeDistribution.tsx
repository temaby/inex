import * as React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Spin } from "antd";
import { ArrowUp, ChevronLeft, ChevronRight } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";

import { InExButton, Num } from "../../components/primitives";
import { rankDashboardCategorySlices, type DashboardCategorySlice } from "./dashboard-utils";
import type { DashboardData } from "./useDashboardData";

const INCOME_COLORS = ["#319b88", "#69b6c7", "#7099ca", "#8bbda1", "#b1c8ce"];

export const IncomeDistribution = ({ data, pending, error, unavailable }: {
    data: DashboardData;
    pending: boolean;
    error: boolean;
    unavailable: (currencies: string[]) => React.ReactNode;
}) => {
    const { t, i18n, incomeSlices, incomeParentName, incomeAutoExpanded, setIncomeParentId, selectCategory,
        categoryMode, categoryConversion, baseCurrency, categoriesQuery, selectedLinkedUserId, currentPeriodLabel } = data;
    const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
    const [focusedCategory, setFocusedCategory] = useState<string | null>(null);
    const [otherExpanded, setOtherExpanded] = useState(false);
    const heading = useRef<HTMLHeadingElement>(null);
    const legend = useRef<HTMLOListElement>(null);
    const lastParentKey = useRef<string | null>(null);
    const slices = useMemo(() => rankDashboardCategorySlices(
        incomeSlices.flatMap((slice) => slice.isOther ? slice.members ?? [] : [slice]),
        t("dashboard.categories.other"), 4,
    ), [incomeSlices, t]);
    const inspectedKey = hoveredCategory ?? focusedCategory;
    const highlightedSlice = slices.find((slice) => slice.key === inspectedKey
        || (otherExpanded && slice.members?.some((member) => member.key === inspectedKey)));
    const highlighted = highlightedSlice?.key;
    const inspectedIncome = slices.length > 1 ? highlightedSlice?.key === inspectedKey ? highlightedSlice
        : highlightedSlice?.members?.find((member) => member.key === inspectedKey) : undefined;
    const total = slices.reduce((sum, slice) => sum + slice.amount, 0);
    const locale = i18n.language;
    const percentage = (amount: number) => {
        const share = total > 0 ? amount / total : 0;
        const format = new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 1 });
        return share > 0 && share < 0.001
            ? t("dashboard.visual.smallShare", { percentage: format.format(0.001) })
            : format.format(share);
    };
    const money = (value: number) => new Intl.NumberFormat(locale, {
        style: "currency", currency: baseCurrency || "USD", maximumFractionDigits: 2,
    }).format(value);

    useEffect(() => {
        setHoveredCategory(null);
        setFocusedCategory(null);
        setOtherExpanded(false);
    }, [incomeSlices, incomeParentName, categoryMode, selectedLinkedUserId, currentPeriodLabel]);
    useEffect(() => {
        if (incomeParentName && !incomeAutoExpanded) heading.current?.focus();
    }, [incomeParentName, incomeAutoExpanded]);

    const returnToParents = () => {
        setIncomeParentId(null);
        window.requestAnimationFrame(() => {
            const buttons = legend.current?.querySelectorAll<HTMLButtonElement>("[data-income-key]");
            (Array.from(buttons ?? []).find((button) => button.dataset.incomeKey === lastParentKey.current)
                ?? (lastParentKey.current == null ? buttons?.[0] : undefined))?.focus();
        });
    };
    const select = (slice: DashboardCategorySlice, returnFocusKey = slice.key) => {
        if (slice.isOther) {
            setOtherExpanded((current) => !current);
            return;
        }
        if (!incomeParentName && categoryMode === "parent") lastParentKey.current = returnFocusKey;
        selectCategory("income", slice);
    };
    const canDrill = (slice: DashboardCategorySlice) => !incomeParentName && categoryMode === "parent"
        && categoriesQuery.currentData?.some((category) => category.parentId === slice.id);

    return (
        <section aria-labelledby="visual-income-title" className="visual-dashboard-card visual-dashboard-income" data-qa="visual-income"
            onKeyDown={(event) => {
                if (event.key === "Escape" && incomeParentName) {
                    event.preventDefault();
                    returnToParents();
                }
            }}>
            <div className="visual-dashboard-card__header">
                <div>
                    <h2 id="visual-income-title" ref={heading} tabIndex={-1}>{t("dashboard.visual.incomeTitle")}</h2>
                    {incomeParentName && !incomeAutoExpanded ? <p data-qa="visual-income-context">{incomeParentName}</p> : null}
                </div>
                {incomeParentName ? <InExButton aria-label={t("dashboard.visual.backToCategories")} icon={<ChevronLeft size={15} />} kind="ghost" onClick={returnToParents} size="sm">
                    {t("dashboard.visual.allCategories")}
                </InExButton> : null}
            </div>
            <Spin spinning={pending} tip={t("dashboard.categories.loading")}>
                {error ? <div className="visual-dashboard-state" role="alert">{t("dashboard.categories.error")}</div>
                    : pending ? <div className="visual-dashboard-state" />
                        : categoryConversion.incomeMissingRates.length > 0 ? unavailable(categoryConversion.incomeMissingRates)
                            : slices.length === 0 ? (
                                <div className="visual-dashboard-income__empty" role="status">
                                    <ArrowUp aria-hidden="true" size={22} /><p>{t("dashboard.visual.incomeEmpty")}</p>
                                </div>
                            ) : (
                                <div className={slices.length > 1 ? "visual-dashboard-income__layout" : "visual-dashboard-income__single"}>
                                    <div className={slices.length > 1 ? "visual-dashboard-donut visual-dashboard-income__donut" : "visual-dashboard-income__total"}>
                                        {slices.length > 1 ? <div className="visual-dashboard-donut__chart" aria-hidden="true" data-qa="visual-income-chart">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie data={slices} dataKey="amount" nameKey="label" innerRadius="76%" outerRadius="98%"
                                                        startAngle={90} endAngle={-270} isAnimationActive={false}
                                                        paddingAngle={0} stroke="none"
                                                        onClick={(_, index) => select(slices[index])}
                                                        onMouseEnter={(_, index) => setHoveredCategory(slices[index].key)}
                                                        onMouseLeave={() => setHoveredCategory(null)}>
                                                        {slices.map((slice, index) => <Cell key={slice.key} fill={INCOME_COLORS[index]}
                                                            fillOpacity={highlighted && highlighted !== slice.key ? 0.3 : 1}
                                                            style={{ cursor: "pointer", transition: "fill-opacity 160ms ease" }} />)}
                                                    </Pie>
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </div> : null}
                                        <div className={slices.length > 1 ? "visual-dashboard-donut__center visual-dashboard-income-center" : undefined} data-qa="visual-income-center">
                                            <span className={slices.length > 1 ? "visual-dashboard-income-center__label" : undefined}>{inspectedIncome?.label ?? t(incomeParentName && !incomeAutoExpanded ? "dashboard.visual.selectedTotal" : "dashboard.visual.incomeTotal")}</span>
                                            <Num dataQa="visual-income-total" currency={baseCurrency} currencySize="sm" kind="neutral" locale={locale} value={inspectedIncome?.amount ?? total} />
                                            {slices.length > 1 ? <span className="visual-dashboard-income-center__share" data-qa="visual-income-share" aria-hidden={!inspectedIncome}>
                                                {inspectedIncome ? t("dashboard.visual.incomeShare", { percentage: percentage(inspectedIncome.amount) }) : "\u00a0"}
                                            </span> : null}
                                        </div>
                                    </div>
                                    <ol aria-label={t("dashboard.categories.incomeSummary")} className="visual-dashboard-legend visual-dashboard-income__legend" ref={legend}>
                                        {slices.map((slice, index) => (
                                            <li key={slice.key}>
                                                <button type="button" data-income-key={slice.key}
                                                    aria-label={t("dashboard.visual.selectCategory", { category: slice.label, percentage: percentage(slice.amount), amount: money(slice.amount) })}
                                                    aria-expanded={slice.isOther ? otherExpanded : undefined}
                                                    className={highlighted === slice.key ? "is-highlighted" : undefined}
                                                    onFocus={() => setFocusedCategory(slice.key)} onBlur={() => setFocusedCategory(null)}
                                                    onMouseEnter={() => setHoveredCategory(slice.key)} onMouseLeave={() => setHoveredCategory(null)}
                                                    onClick={() => select(slice)}>
                                                    <span aria-hidden="true" className="visual-dashboard-swatch" style={{ background: INCOME_COLORS[index] }} />
                                                    <span className="visual-dashboard-legend__name">{slice.label}</span>
                                                    <strong className="visual-dashboard-legend__percentage">{percentage(slice.amount)}</strong>
                                                    <span className="visual-dashboard-legend__amount"><Num currency={baseCurrency} currencySize="sm" kind="neutral" locale={locale} value={slice.amount} /></span>
                                                    {slices.length === 1 && canDrill(slice) ? <span className="visual-dashboard-income__drill">{t("dashboard.visual.viewBreakdown")}<ChevronRight size={13} aria-hidden="true" /></span> : null}
                                                </button>
                                                {slice.isOther && otherExpanded && slice.members ? (
                                                    <ol className="visual-dashboard-legend__members">
                                                        {slice.members.map((member) => <li key={member.key}>
                                                            <button type="button" data-income-member-key={member.key}
                                                                aria-label={t("dashboard.visual.selectCategory", { category: member.label, percentage: percentage(member.amount), amount: money(member.amount) })}
                                                                onFocus={() => setFocusedCategory(member.key)} onBlur={() => setFocusedCategory(null)}
                                                                onMouseEnter={() => setHoveredCategory(member.key)} onMouseLeave={() => setHoveredCategory(null)}
                                                                onClick={() => select(member, "other")}>
                                                                <span>{member.label} · {percentage(member.amount)}</span>
                                                                <Num currency={baseCurrency} currencySize="sm" kind="neutral" locale={locale} value={member.amount} />
                                                            </button>
                                                        </li>)}
                                                    </ol>
                                                ) : null}
                                            </li>
                                        ))}
                                    </ol>
                                </div>
                            )}
            </Spin>
        </section>
    );
};
