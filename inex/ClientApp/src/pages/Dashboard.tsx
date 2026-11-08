import * as React from "react";
import ClassicDashboard from "./Dashboard/ClassicDashboard";
import VisualDashboard from "./Dashboard/VisualDashboard";
import { useDashboardData } from "./Dashboard/useDashboardData";
import { useDashboardVariant } from "./Dashboard/dashboard-variant";
import { useAppSelector } from "../store/hooks";
import FamilyDashboard from "./Dashboard/FamilyDashboard";

export { DASHBOARD_EXPENSE_COLORS, DASHBOARD_INCOME_COLORS } from "./Dashboard/ClassicDashboard";

const PersonalDashboard = () => {
    const userId = useAppSelector((state) => state.auth.user?.id);
    const [variant] = useDashboardVariant(userId);
    const data = useDashboardData({ autoExpandSingleParent: variant === "visual", requireExplicitFavourites: variant === "visual", monthSelection: variant === "visual" });
    return variant === "visual" ? <VisualDashboard data={data} /> : <ClassicDashboard data={data} />;
};

const Dashboard = () => {
    const familySelected = useAppSelector((state) => state.linkedAccount.dashboardFamilySelected
        && state.linkedAccount.linkState?.state === "master"
        && state.linkedAccount.linkState.linkedAccounts.length > 0);
    return familySelected ? <FamilyDashboard /> : <PersonalDashboard />;
};

export default Dashboard;
