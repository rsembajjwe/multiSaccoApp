// Shared table rendering helpers for Tereka Online.
// Loaded before app.js as a classic browser script.

function recordTable(title, rows, columns) {
  const tableKey = tableStateKey(title);
  const tableState = state.tableState[tableKey] || { search: "", page: 1, pageSize: 10 };
  const allRows = rows || [];
  const serverTable = highVolumeTableConfig(tableKey);
  const backendPage = pageEnvelope(allRows) || (serverTable ? state.pageMeta[serverTable.key] : null);
  const backendTotal = Number(backendPage?.totalElements || 0);
  const model = buildRecordTableModel({
    allRows,
    backendPage,
    filterRows,
    filterRowsByQuery,
    globalSearch: state.search,
    serverTable,
    tableState,
  });
  const backendLoaded = model.backendLoaded;
  const backendPageNumber = model.backendPageNumber;
  const backendTotalPages = model.backendTotalPages;
  const canLoadPreviousServerPage = model.canLoadPreviousServerPage;
  const canLoadNextServerPage = model.canLoadNextServerPage;
  const tableSearch = model.searchText;
  const filtered = model.filteredRows;
  const pageSize = model.pageSize;
  const totalPages = model.totalPages;
  const currentPage = model.currentPage;
  if (currentPage !== tableState.page) state.tableState[tableKey] = { ...tableState, page: currentPage };
  const start = model.start;
  const pagedRows = model.pagedRows;
  const searching = model.searching;
  const headerCells = columns.map((column) => tableHeaderCell(tableKey, serverTable, tableState, column)).join("");
  const countLabel = searching
    ? `${filtered.length} ${t("of")} ${allRows.length} ${t("shown")}`
    : backendLoaded
      ? `${allRows.length} ${t("of")} ${backendTotal} records loaded`
      : `${filtered.length} ${t("records")}`;
  const rangeLabel = filtered.length
    ? `${t("showingRange")} ${start + 1}-${Math.min(start + pageSize, filtered.length)} ${t("of")} ${filtered.length}${backendLoaded && !searching ? " loaded" : ""}`
    : t("noRowsToShow");
  return `
    <section class="panel">
      <div class="panel-heading">
        <h2>${title}</h2>
        <div class="table-count">
          <span>${countLabel}</span>
          ${searching ? `<button class="table-action" type="button" data-action="clear-search">${t("clearSearch")}</button>` : ""}
        </div>
      </div>
      <div class="table-tools">
        <label>
          <span>${t("searchThisTable")}</span>
          <input value="${escapeHtml(tableSearch)}" data-table-search="${escapeHtml(tableKey)}" placeholder="Search ${escapeHtml(title.toLowerCase())}">
        </label>
        <label>
          <span>${t("rowsPerPage")}</span>
          <select data-table-page-size="${escapeHtml(tableKey)}">
            ${[10, 25, 50, 100].map((size) => `<option value="${size}" ${pageSize === size ? "selected" : ""}>${size}</option>`).join("")}
          </select>
        </label>
      </div>
      ${filtered.length ? `
        <div class="table-wrap">
          <table>
            <thead><tr>${headerCells}<th>${t("actions")}</th></tr></thead>
            <tbody>${pagedRows.map((row) => `<tr>${columns.map((column) => `<td>${formatValue(row, column)}</td>`).join("")}<td>${rowAction(row)}</td></tr>`).join("")}</tbody>
          </table>
        </div>
        <div class="pagination">
          <span>${rangeLabel}</span>
          <div>
            <button class="table-action" type="button" data-table-page="${escapeHtml(tableKey)}" data-page="${currentPage - 1}" ${currentPage <= 1 ? "disabled" : ""}>${t("previous")}</button>
            <strong>${t("page")} ${currentPage} ${t("of")} ${totalPages}</strong>
            <button class="table-action" type="button" data-table-page="${escapeHtml(tableKey)}" data-page="${currentPage + 1}" ${currentPage >= totalPages ? "disabled" : ""}>${t("next")}</button>
          </div>
        </div>
        ${backendPage && serverTable ? `
          <div class="pagination server-pagination">
            <span>Server page ${backendPageNumber + 1} of ${backendTotalPages}</span>
            <div>
              <button class="table-action" type="button" data-server-table-page="${escapeHtml(tableKey)}" data-page="${backendPageNumber - 1}" ${canLoadPreviousServerPage ? "" : "disabled"}>Previous server page</button>
              <button class="table-action" type="button" data-server-table-page="${escapeHtml(tableKey)}" data-page="${backendPageNumber + 1}" ${canLoadNextServerPage ? "" : "disabled"}>Next server page</button>
            </div>
          </div>
        ` : ""}
      ` : emptyState(t("noRecordsFound"), t("noRecordsFoundCopy"))}
    </section>
  `;
}

function tableHeaderCell(tableKey, serverTable, tableState, column) {
  const label = labelize(column);
  const sortColumn = serverSortColumn(serverTable, column);
  if (!sortColumn) return `<th>${label}</th>`;
  const active = tableState.sort === sortColumn;
  const direction = active && tableState.direction === "asc" ? "asc" : "desc";
  const marker = active ? (direction === "asc" ? " asc" : " desc") : "";
  return `<th><button class="table-sort" type="button" data-server-table-sort="${escapeHtml(tableKey)}" data-sort="${escapeHtml(sortColumn)}" data-direction="${direction === "asc" ? "desc" : "asc"}">${escapeHtml(label)}${marker}</button></th>`;
}
