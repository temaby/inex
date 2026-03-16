import moment from "moment";
import { Moment } from "moment";
import { RateDetails } from "./RateDetails";

export class DailyRateDetails {
  date: Moment = moment();
  rates: RateDetails[] = [];
}