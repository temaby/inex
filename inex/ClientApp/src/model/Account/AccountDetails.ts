import { ItemDetails } from "../Base/ItemDetails";

export class AccountDetails extends ItemDetails {
  currency: string = "";
}

export const defaultAccount: AccountDetails = Object.assign(new AccountDetails(), {
  id: -1,
  key: "Выберите счёт",
  name: "Выберите счёт",
  description: "Выберите счёт",
  isEnabled: true,
  currency: "USD",
});
