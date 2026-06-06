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
});
