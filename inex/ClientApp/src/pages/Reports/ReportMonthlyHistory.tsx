import React, { useEffect, useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { fetchHistory } from "../../store/report/report-actions";
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LabelList,
  ReferenceLine,
} from "recharts";
import { DatePicker, Space, Typography, Card, Row, Col, Statistic } from "antd";
import { ArrowUpOutlined, ArrowDownOutlined, BankOutlined } from '@ant-design/icons';
import moment from "moment";

const { Title } = Typography;

const ReportMonthlyHistory = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const history = useSelector((state: any) => state.report.history);
  const [year, setYear] = useState(moment().year());

  useEffect(() => {
    dispatch(fetchHistory(year));
  }, [dispatch, year]);

  const handleYearChange = (date: any, dateString: string) => {
    if (date) {
      setYear(date.year());
    }
  };

  const totals = useMemo(() => {
    return history.reduce(
      (acc: any, curr: any) => ({
        income: acc.income + curr.income,
        expense: acc.expense + curr.expense,
        savings: acc.savings + curr.savings,
      }),
      { income: 0, expense: 0, savings: 0 }
    );
  }, [history]);

  const currencyFormatter = (value: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const tooltipFormatter = (value: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  const compactFormatter = (value: number) => {
    if (Math.abs(value) >= 1000) {
      return (value / 1000).toFixed(1) + 'k';
    }
    return value.toFixed(0);
  };

  const CustomizedLabel = (props: any) => {
    const { x, y, value } = props;
    const fill = value >= 0 ? '#3f8600' : '#cf1322';
    return (
      <text x={x} y={y} dy={-10} fill={fill} fontSize={14} textAnchor="middle" fontWeight="bold">
        {compactFormatter(value)}
      </text>
    );
  };

  const handleBarClick = (data: any) => {
    if (data && data.month) {
      const monthStr = data.month.toString().padStart(2, '0');
      navigate(`/reports/category?interval=${year}-${monthStr}`);
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <Space direction="vertical" size="large" style={{ width: "100%" }}>
        <Space>
            <Title level={4}>Интервал</Title>
            <DatePicker picker="year" onChange={handleYearChange} defaultValue={moment()} allowClear={false} />
        </Space>

        <Row gutter={16}>
          <Col span={8}>
            <Card>
              <Statistic
                title="Общий доход"
                value={totals.income}
                precision={2}
                valueStyle={{ color: '#3f8600' }}
                prefix={<ArrowUpOutlined />}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card>
              <Statistic
                title="Общий расход"
                value={Math.abs(totals.expense)}
                precision={2}
                valueStyle={{ color: '#cf1322' }}
                prefix={<ArrowDownOutlined />}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card>
              <Statistic
                title="Накопления"
                value={totals.savings}
                precision={2}
                valueStyle={{ color: totals.savings >= 0 ? '#3f8600' : '#cf1322' }}
                prefix={<BankOutlined />}
              />
            </Card>
          </Col>
        </Row>

        <div style={{ height: 500, width: "100%" }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={history}
              margin={{
                top: 30,
                right: 20,
                bottom: 30,
                left: 20,
              }}
            >
              <CartesianGrid stroke="#f5f5f5" />
              <ReferenceLine y={0} stroke="#bfbfbf" />
              <XAxis dataKey="monthName" />
              <YAxis 
                tickFormatter={currencyFormatter} 
                domain={[(dataMin: number) => dataMin * 1.2, (dataMax: number) => dataMax * 1.2]}
              />
              <Tooltip formatter={tooltipFormatter} />
              <Legend />
              <Bar dataKey="income" barSize={20} fill="#82ca9d" name="Доход" onClick={handleBarClick} cursor="pointer">
                <LabelList 
                  dataKey="income" 
                  position="top" 
                  formatter={compactFormatter} 
                  fill="#3f8600" 
                  style={{ fontWeight: 'bold', fontSize: 14 }} 
                />
              </Bar>
              <Bar dataKey="expense" barSize={20} fill="#ff7300" name="Расход" onClick={handleBarClick} cursor="pointer">
                <LabelList 
                  dataKey="expense" 
                  position="top" 
                  formatter={compactFormatter} 
                  fill="#cf1322" 
                  style={{ fontWeight: 'bold', fontSize: 14 }} 
                />
              </Bar>
              <Line type="monotone" dataKey="savings" stroke="#413ea0" name="Накопления">
                <LabelList 
                  dataKey="savings" 
                  content={<CustomizedLabel />} 
                />
              </Line>
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Space>
    </div>
  );
};

export default ReportMonthlyHistory;
