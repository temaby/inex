import moment from "moment";
import { Moment } from "moment";

import { defaultAccount, AccountDetails } from "../Account/AccountDetails";
import { defaultCategory, CategoryDetails } from "../Category/CategoryDetails";

export class TransactionEditState {
  account: AccountDetails = defaultAccount;
  category: CategoryDetails = defaultCategory;
  date: Moment = moment();
  amount: number = 0;
  comment: string = "";
  hasActiveChanges: boolean = false;
}
