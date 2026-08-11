import type { TerekaPageEnvelope, TerekaRecord, TerekaTableState } from "../types/domain";

export interface TerekaServerTableConfig {
  key: string;
  sortMap?: Record<string, string>;
}

export interface TerekaTableModelInput<T extends TerekaRecord> {
  allRows: T[];
  backendPage: (TerekaPageEnvelope & { number?: number }) | null;
  globalSearch: string;
  serverTable: TerekaServerTableConfig | null;
  tableState: TerekaTableState;
}

export interface TerekaTableModel<T extends TerekaRecord> {
  backendLoaded: boolean;
  backendPageNumber: number;
  backendTotal: number;
  backendTotalPages: number;
  canLoadNextServerPage: boolean;
  canLoadPreviousServerPage: boolean;
  currentPage: number;
  filteredRows: T[];
  hasGlobalSearch: boolean;
  hasTableSearch: boolean;
  pageSize: number;
  pagedRows: T[];
  searchText: string;
  searching: boolean;
  start: number;
  totalPages: number;
}

export function filterRecordRows<T extends TerekaRecord>(rows: T[] | null | undefined, query: string): T[] {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return rows || [];
  return (rows || []).filter((row) => JSON.stringify(row).toLowerCase().includes(q));
}

export function tableStateKeyFor(title: string | null | undefined): string {
  return String(title || "table").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "table";
}

export function buildRecordTableModel<T extends TerekaRecord>(
  input: TerekaTableModelInput<T>
): TerekaTableModel<T> {
  const allRows = input.allRows;
  const backendTotal = Number(input.backendPage?.totalElements || 0);
  const backendLoaded = backendTotal > allRows.length;
  const backendPageNumber = Number(input.backendPage?.number || 0);
  const backendTotalPages = Math.max(1, Number(input.backendPage?.totalPages || 1));
  const canLoadPreviousServerPage = Boolean(input.serverTable && input.backendPage && backendPageNumber > 0);
  const canLoadNextServerPage = Boolean(
    input.serverTable && input.backendPage && backendPageNumber + 1 < backendTotalPages
  );
  const globalFiltered = filterRecordRows(allRows, input.globalSearch);
  const searchText = input.tableState.search || "";
  const filteredRows = filterRecordRows(globalFiltered, searchText);
  const pageSize = Number(input.tableState.pageSize || 10);
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const currentPage = Math.min(Math.max(1, Number(input.tableState.page || 1)), totalPages);
  const start = filteredRows.length ? (currentPage - 1) * pageSize : 0;
  const pagedRows = filteredRows.slice(start, start + pageSize);
  const hasGlobalSearch = Boolean(input.globalSearch.trim());
  const hasTableSearch = Boolean(searchText.trim());
  const searching = hasGlobalSearch || hasTableSearch;

  return {
    backendLoaded,
    backendPageNumber,
    backendTotal,
    backendTotalPages,
    canLoadNextServerPage,
    canLoadPreviousServerPage,
    currentPage,
    filteredRows,
    hasGlobalSearch,
    hasTableSearch,
    pageSize,
    pagedRows,
    searchText,
    searching,
    start,
    totalPages,
  };
}
