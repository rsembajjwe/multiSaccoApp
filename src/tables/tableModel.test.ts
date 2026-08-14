import { describe, expect, it } from "vitest";
import { buildRecordTableModel, filterRecordRows, tableStateKeyFor } from "./tableModel";

describe("table model", () => {
  const rows = [
    { id: "1", member: "Amina Nakutende", branch: "Central", amount: 5000 },
    { id: "2", member: "Brian Kato", branch: "North", amount: 12000 },
    { id: "3", member: "Carol Namusoke", branch: "Central", amount: 8000 },
  ];

  it("filters rows using a stable JSON-backed search", () => {
    expect(filterRecordRows(rows, "north")).toEqual([rows[1]]);
    expect(filterRecordRows(rows, "5000")).toEqual([rows[0]]);
    expect(filterRecordRows(rows, " ")).toEqual(rows);
  });

  it("normalizes table titles into reusable state keys", () => {
    expect(tableStateKeyFor("Member payment lifecycle")).toBe("member-payment-lifecycle");
    expect(tableStateKeyFor("  ")).toBe("table");
  });

  it("combines global and table search with stable pagination", () => {
    const model = buildRecordTableModel({
      allRows: rows,
      backendPage: null,
      globalSearch: "central",
      serverTable: null,
      tableState: { page: 1, pageSize: 1, search: "carol" },
    });

    expect(model.filteredRows).toEqual([rows[2]]);
    expect(model.pagedRows).toEqual([rows[2]]);
    expect(model.totalPages).toBe(1);
    expect(model.hasGlobalSearch).toBe(true);
    expect(model.hasTableSearch).toBe(true);
  });

  it("exposes server pagination state when a backend page is loaded", () => {
    const model = buildRecordTableModel({
      allRows: rows.slice(0, 2),
      backendPage: { number: 1, totalElements: 12, totalPages: 6 },
      globalSearch: "",
      serverTable: { key: "members" },
      tableState: { page: 1, pageSize: 10, search: "" },
    });

    expect(model.backendLoaded).toBe(true);
    expect(model.canLoadPreviousServerPage).toBe(true);
    expect(model.canLoadNextServerPage).toBe(true);
    expect(model.backendTotal).toBe(12);
  });
});
