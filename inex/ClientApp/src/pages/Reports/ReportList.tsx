import * as React from "react";
import { Table } from "antd";
import { RightOutlined } from "@ant-design/icons";

import { useNavigate } from "react-router-dom";

const reports = [
    {
        id: "category",
        name: "Отчёт по категориям",
    },
    {
        id: "budget",
        name: "Контроль бюджета",
    },
    {
        id: "history",
        name: "Движение средств",
    }
];

const ReportList = (props: any) => {
    const navigate = useNavigate();

    const reportColumns = [
        {
            title: "Название",
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
