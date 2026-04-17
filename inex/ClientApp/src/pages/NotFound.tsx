import * as React from "react";
import { useTranslation } from "react-i18next";
import { Result } from "antd";
import { Link } from "react-router-dom";

const NotFound = (props: any) => {
    const { t } = useTranslation();
    return (
        <Result
            status="404"
            title="404"
            subTitle={t("notFound.title")}
            extra={<Link to="/">{t("notFound.goHome")}</Link>}
        />
    );
};

export default NotFound;
