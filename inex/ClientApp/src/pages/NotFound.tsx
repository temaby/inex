import * as React from "react";

import { Result } from "antd";
import { Link } from "react-router-dom";

const NotFound = (props: any) => {
  return <Result status="404" title="404" subTitle="Страница не существует" extra={<Link to="/">На главную</Link>} />;
};

export default NotFound;
