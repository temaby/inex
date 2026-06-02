import * as React from "react";
import { useTranslation } from "react-i18next";
import BasicPage from "../layouts/BasicPage";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Button, Layout} from "antd";

const { Content } = Layout;

const Reports = (props: any) => {
    const { t } = useTranslation();
    const location = useLocation();
    const navigate = useNavigate();

    const reportTitles: Record<string, string> = {
        "/reports": t("reports.title"),
        "/reports/category": t("reports.categoryReport"),
        "/reports/budget": t("reports.budgetReport"),
        "/reports/history": t("reports.historyReport"),
        "/reports/heatmap": t("reports.heatmapReport"),
    };

    const title = reportTitles[location.pathname] || t("reports.title");

    const showReportsHandler = () => {
        navigate("/reports");
    };

    const showBackButton = location.pathname !== "/reports";

    return (
        <BasicPage title={title}
            extra={[showBackButton ?
                <Button key="reportsList" onClick={showReportsHandler} size="large" type="primary" style={{ margin: "4px 0px" }}>{t("common.back")}</Button> :
                <Button size="large" type="primary" style={{ margin: "4px 0px", visibility: "hidden" }} />
            ]}>
            <div style={{ minHeight: "76vh", background: "white" }}>
                <Content style={{ minHeight: 500, backgroundColor: "white" }}>
                    {<Outlet />}
                </Content>
            </div>
        </BasicPage>
    );
};

export default Reports;
