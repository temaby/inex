import linkedAccountSlice, { linkedAccountActions, type LinkedAccountLinkState } from "./linked-account-slice";
import { clearAuth } from "../auth/auth-slice";

const links: LinkedAccountLinkState = {
  state: "master", masterAccount: null,
  linkedAccounts: [{ id: 2, username: "Anna", email: null, baseCurrency: "PLN" }],
};
const ready = () => linkedAccountSlice.reducer(
  linkedAccountSlice.reducer(undefined, linkedAccountActions.beginLoading(1)),
  linkedAccountActions.setLinkState({ userId: 1, linkState: links }),
);

describe("family dashboard selection", () => {
  it("requires an active master scope and clears individual selection on entry", () => {
    expect(linkedAccountSlice.reducer(undefined, linkedAccountActions.selectFamily()).dashboardFamilySelected).toBe(false);
    const individual = linkedAccountSlice.reducer(ready(), linkedAccountActions.selectLinkedUser(2));
    const family = linkedAccountSlice.reducer(individual, linkedAccountActions.selectFamily());
    expect(family.dashboardFamilySelected).toBe(true);
    expect(family.selectedLinkedUserId).toBeNull();
    expect(linkedAccountSlice.reducer(family, linkedAccountActions.selectLinkedUser(2)).dashboardFamilySelected).toBe(false);
  });

  it("clears family on revocation, session change, logout and unavailable access", () => {
    const family = linkedAccountSlice.reducer(ready(), linkedAccountActions.selectFamily());
    expect(linkedAccountSlice.reducer(family, linkedAccountActions.setLinkState({ userId: 1, linkState: { ...links, linkedAccounts: [] } })).dashboardFamilySelected).toBe(false);
    expect(linkedAccountSlice.reducer(family, linkedAccountActions.beginLoading(3)).dashboardFamilySelected).toBe(false);
    expect(linkedAccountSlice.reducer(family, clearAuth()).dashboardFamilySelected).toBe(false);
    const unavailable = linkedAccountSlice.reducer(family, linkedAccountActions.familyScopeUnavailable());
    expect(unavailable.dashboardFamilySelected).toBe(false);
    expect(unavailable.selectedLinkedUserId).toBeNull();
    expect(unavailable.unavailable).toBe(true);
  });
});
