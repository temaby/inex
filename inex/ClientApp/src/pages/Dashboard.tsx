import * as React from "react";
import ClassicDashboard from "./Dashboard/ClassicDashboard";
import VisualDashboard from "./Dashboard/VisualDashboard";
import { useDashboardData } from "./Dashboard/useDashboardData";
import { useDashboardVariant } from "./Dashboard/dashboard-variant";
import { useAppSelector } from "../store/hooks";

export { DASHBOARD_EXPENSE_COLORS, DASHBOARD_INCOME_COLORS } from "./Dashboard/ClassicDashboard";

const Dashboard = () => {
    const userId = useAppSelector((state) => state.auth.user?.id);
    const [variant] = useDashboardVariant(userId);
    const data = useDashboardData();
    return variant === "visual" ? <VisualDashboard data={data} /> : <ClassicDashboard data={data} />;
};

export default Dashboard;
