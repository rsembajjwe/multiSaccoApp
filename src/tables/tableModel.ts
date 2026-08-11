import type { TerekaPageEnvelope, TerekaRecord, TerekaTableState } from "../types/domain";

export interface TerekaServerTableConfig {
  key: string;
  sortMap?: Record<string, string>;
}

export interface TerekaTableModelInput<T extends TerekaRecord> {
  allRows: T[];
  backendPage: (TerekaPageEnvelope & { number?: number }) | null;
  filterRows: (rows: T[]) => T[];
  filterRowsByQuery: (rows: T[], query: string) => T[];
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
  const globalFiltered = input.filterRows(allRows);
  const searchText = input.tableState.search || "";
  const filteredRows = input.filterRowsByQuery(globalFiltered, searchText);
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
