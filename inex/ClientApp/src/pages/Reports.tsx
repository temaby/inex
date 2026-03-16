import * as React from "react";
import BasicPage from "../layouts/BasicPage";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Button, Layout} from "antd";

const { Content } = Layout;

const reportTitles: Record<string, string> = {
    "/reports": "Отчёты",
    "/reports/category": "Отчёт по категориям",
    "/reports/budget": "Контроль бюджета",
    "/reports/history": "Движение средств",
};

const Reports = (props: any) => {
    const location = useLocation();
    const navigate = useNavigate();

    console.log("Reports component rendering, location:", location.pathname);

    const title =
        reportTitles[location.pathname] ||
        "Отчёты";

    const showReportsHandler = () => {
        navigate("/reports");
    };

    const showBackButton = location.pathname !== "/reports";

    return (
        <BasicPage title={title}
            extra={[showBackButton ?
                <Button key="reportsList" onClick={showReportsHandler} size="large" type="primary" style={{ margin: "4px 0px" }}>Назад</Button> :
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
