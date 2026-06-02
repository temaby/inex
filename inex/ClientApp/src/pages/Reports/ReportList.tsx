import * as React from "react";
import { useTranslation } from "react-i18next";
import { Table } from "antd";
import { RightOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";

const ReportList = (props: any) => {
    const { t } = useTranslation();
    const navigate = useNavigate();

    const reports = [
        { id: "category", name: t("reports.categoryReport") },
        { id: "budget", name: t("reports.budgetReport") },
        { id: "history", name: t("reports.historyReport") },
        { id: "heatmap", name: t("reports.heatmapReport") },
    ];

    const reportColumns = [
        {
            title: t("reports.name"),
            dataIndex: "name",
            key: "name",
        },
        {
            key: "arrow",
            render: () => (
                <RightOutlined style={{ fontSize: 16, color: "#1890ff", float: "right" }} />
            ),
            width: 40,
        }
    ];

    return (
        <div>
            <Table
                columns={reportColumns}
                dataSource={reports}
                rowKey="id"
                pagination={false}
                onRow={record => ({
                    onClick: () => navigate(`/reports/${record.id}`)
                })}
            />
        </div>
    );
};

export default ReportList;
