// Typed table model bridge for the classic Tereka Online SPA.
// Keep logic aligned with src/tables/tableModel.ts while runtime modules migrate to ES modules.

function filterRecordRows(rows, query) {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return rows || [];
  return (rows || []).filter((row) => JSON.stringify(row).toLowerCase().includes(q));
}

function tableStateKeyFor(title) {
  return String(title || "table").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "table";
}

function buildRecordTableModel(input) {
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
