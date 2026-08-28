import dayjs from "dayjs";
import type { Dayjs } from "dayjs";

import { TransactionType } from "./TransactionType";
import type { InternalTransferDirection } from "./InternalTransferDirection";
import { defaultAccount, AccountDetails } from "../Account/AccountDetails";
import { defaultCategory, CategoryDetails } from "../Category/CategoryDetails";

export class TransactionSetState {
  mode: TransactionType = TransactionType.EXPENSE;
  internalTransferDirection: InternalTransferDirection = "outgoing";
  fromAccount: AccountDetails = defaultAccount;
  toAccount: AccountDetails = defaultAccount;
  category: CategoryDetails = defaultCategory;
  date: Dayjs = dayjs();
  fromAmount: number = 0;
  toAmount: number = 0;
  comment: string = "";
  lastUpdate: Dayjs = dayjs();
}
