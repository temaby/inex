import dayjs from "dayjs";
import { describe, expect, it } from "vitest";

import {
  buildTransactionFilterSearch,
  parseTransactionFilterParam,
} from "./transaction-filter-url";

const emptyFilter = {
  accountIds: [],
  categoryIds: [],
  tags: [],
  refs: [],
  range: [],
  type: "all" as const,
  search: "",
};

describe("transaction filter URL helpers", () => {
  it("parses date-only ranges as inclusive calendar days", () => {
    const filter = parseTransactionFilterParam("start:2026-06-01;end:2026-06-30;");

    expect(filter?.range).toEqual([
      dayjs("2026-06-01T00:00:00").unix(),
      dayjs("2026-06-30T23:59:59").unix(),
    ]);
  });

  it("round-trips ranges without losing final-day coverage", () => {
    const search = buildTransactionFilterSearch({
      ...emptyFilter,
      range: [
        dayjs("2026-06-01T00:00:00").unix(),
        dayjs("2026-06-30T23:59:59").unix(),
      ],
    });

    const params = new URLSearchParams(search);
    const filter = parseTransactionFilterParam(params.get("filter"));

    expect(filter?.range).toEqual([
      dayjs("2026-06-01T00:00:00").unix(),
      dayjs("2026-06-30T23:59:59").unix(),
    ]);
  });

  it("ignores malformed date ranges instead of creating invalid timestamps", () => {
    expect(parseTransactionFilterParam("start:not-a-date;end:2026-06-30;")).toBeNull();
    expect(parseTransactionFilterParam("start:2026-07-01;end:2026-06-30;")).toBeNull();

    expect(parseTransactionFilterParam("accountIds:7;start:not-a-date;end:2026-06-30;")).toMatchObject({
      accountIds: [7],
      range: [],
    });
  });

  it("rejects impossible calendar dates instead of normalizing them", () => {
    expect(parseTransactionFilterParam("start:2026-02-31;end:2026-03-31;")).toBeNull();
    expect(parseTransactionFilterParam("start:2026-02-01;end:2026-02-31;")).toBeNull();
  });

  it("retains valid criteria while independently dropping malformed URL values", () => {
    expect(parseTransactionFilterParam("accountIds:7,nope;type:expense;search:%25E0%25A4%25A;start:no;end:2026-06-30;tags:food,;unknown:value;"))
      .toEqual(expect.objectContaining({ accountIds: [7], tags: ["food"], type: "expense", search: "%E0%A4%A", range: [] }));
  });

  it("normalizes and round-trips Type and trimmed Search with the server filters", () => {
    const search = buildTransactionFilterSearch({ ...emptyFilter, accountIds: [2, 1, 2], type: "income", search: "  salary  " });
    expect(search).toContain("accountIds%3A1%2C2%3B");
    expect(search).toContain("type%3Aincome%3B");
    expect(search).toContain("search%3Asalary%3B");
  });
});
