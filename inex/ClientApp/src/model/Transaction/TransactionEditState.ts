import dayjs from "dayjs";
import type { Dayjs } from "dayjs";

import { defaultAccount, AccountDetails } from "../Account/AccountDetails";
import { defaultCategory, CategoryDetails } from "../Category/CategoryDetails";

export class TransactionEditState {
  account: AccountDetails = defaultAccount;
  category: CategoryDetails = defaultCategory;
  date: Dayjs = dayjs();
  amount: number = 0;
  comment: string = "";
  hasActiveChanges: boolean = false;
}
