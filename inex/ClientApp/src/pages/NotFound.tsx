import * as React from "react";
import { SearchX } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { EmptyState } from "../components/primitives";
import "./not-found.css";

const NotFound = () => {
    const { t } = useTranslation();

    return (
        <main className="not-found-page">
            <EmptyState
                iconNode={<SearchX size={26} aria-hidden="true" />}
                title="404"
                description={t("notFound.title")}
                actions={<Link className="not-found-page__link" to="/">{t("notFound.goHome")}</Link>}
            />
        </main>
    );
};

export default NotFound;
