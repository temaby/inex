/**
 * Dayjs-based DatePicker for antd v4.
 *
 * antd v4 ships moment.js as its date library by default. This file uses
 * antd's generatePicker factory (backed by rc-picker) to produce a DatePicker
 * that accepts Dayjs objects instead of Moment objects.
 *
 * Usage: import DatePicker from "../../components/DatePicker";
 *        const { RangePicker } = DatePicker;
 *
 * The signature is identical to antd's DatePicker — only the value/onChange
 * types change from Moment to Dayjs.
 */
import dayjsGenerateConfig from "rc-picker/lib/generate/dayjs";
import generatePicker from "antd/es/date-picker/generatePicker";
import type { Dayjs } from "dayjs";

const DatePicker = generatePicker<Dayjs>(dayjsGenerateConfig);

export default DatePicker;
