import dayjs from "dayjs";
import type { Dayjs } from "dayjs";
import { RateDetails } from "./RateDetails";

export class DailyRateDetails {
  date: Dayjs = dayjs();
  rates: RateDetails[] = [];
}
