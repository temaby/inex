import moment from "moment";
import { Moment } from "moment";

import { TransactionType } from "./TransactionType";
import { defaultAccount, AccountDetails } from "../Account/AccountDetails";
import { defaultCategory, CategoryDetails } from "../Category/CategoryDetails";

export class TransactionSetState {
  mode: TransactionType = TransactionType.EXPENSE;
  fromAccount: AccountDetails = defaultAccount;
  toAccount: AccountDetails = defaultAccount;
  category: CategoryDetails = defaultCategory;
  date: Moment = moment();
  fromAmount: number = 0;
  toAmount: number = 0;
  comment: string = "";
  lastUpdate: Moment = moment();
}