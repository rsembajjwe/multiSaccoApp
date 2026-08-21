// Application shell, navigation, quick search and session UI for Tereka Online.
// Loaded before app.js; functions intentionally remain global for classic script compatibility.

function app() {
  return document.getElementById("app");
}

function setHtml(markup) {
  const focusState = captureFocusState();
  applyRegionalDocumentSettings();
  app().innerHTML = markup;
  bindEvents();
  restoreFocusState(focusState);
}

function captureFocusState() {
  const element = document.activeElement;
  if (!element || !["INPUT", "TEXTAREA", "SELECT"].includes(element.tagName)) return null;
  const selector = element.id
    ? `#${CSS.escape(element.id)}`
    : element.dataset.tableSearch
      ? `[data-table-search="${CSS.escape(element.dataset.tableSearch)}"]`
      : element.dataset.chatSearch
        ? `[data-chat-search="${CSS.escape(element.dataset.chatSearch)}"]`
      : element.dataset.notificationFilter
        ? `[data-notification-filter="${CSS.escape(element.dataset.notificationFilter)}"]`
      : element.dataset.searchInput !== undefined
        ? "[data-search-input]"
        : null;
  if (!selector) return null;
  return {
    selector,
    start: typeof element.selectionStart === "number" ? element.selectionStart : null,
    end: typeof element.selectionEnd === "number" ? element.selectionEnd : null
  };
}

function restoreFocusState(focusState) {
  if (!focusState) return;
  const element = document.querySelector(focusState.selector);
  if (!element) return;
  element.focus({ preventScroll: true });
  if (typeof element.setSelectionRange === "function" && focusState.start !== null && focusState.end !== null) {
    element.setSelectionRange(focusState.start, focusState.end);
  }
}

function hasPermission(permission) {
  if (!permission) return true;
  if (permission === "dashboard:view") return true;
  if (state.roleNames.join(" ").toLowerCase().includes("super admin")) return true;
  if (isPlatform() && roleKind() === "super") return true;
  return state.permissionIds.includes(permission);
}

function roleKind() {
  const roles = state.roleNames.join(" ").toLowerCase();
  if (state.auth === "member") return "member";
  if (state.user?.tenantId === "tenant_platform") {
    if (roles.includes("billing")) return "billing";
    if (roles.includes("compliance")) return "compliance";
    if (roles.includes("support")) return "support";
    if (roles.includes("operations")) return "operations";
    return "super";
  }
  if (roles.includes("chairperson")) return "chairperson";
  if (roles.includes("treasurer")) return "treasurer";
  if (roles.includes("secretary")) return "secretary";
  if (roles.includes("loan")) return "loans";
  if (roles.includes("accountant")) return "accountant";
  if (roles.includes("teller") || roles.includes("cashier")) return "teller";
  if (roles.includes("auditor")) return "auditor";
  return "admin";
}

function isPlatform() {
  return state.auth === "staff" && state.user?.tenantId === "tenant_platform";
}

function visibleModules() {
  if (state.auth === "member") return memberModules.map(localizeModule);
  const kind = roleKind();
  const source = isPlatform() ? platformModules : saccoModules;
  return source.filter((item) => item[4].includes(kind) && hasPermission(item[3])).map(localizeModule);
}

function localizeModule(item) {
  const [id, label, description, permission, roles] = item;
  const scope = state.auth === "member" ? "member" : isPlatform() ? "platform" : "sacco";
  const titleKeys = {
    platform: {
      dashboard: "navDashboard",
      "sacco-applications": "navSaccoRegistration",
      subscriptions: "navSubscriptions",
      "sacco-accounts": "navSaccoAccounts",
      transactions: "navTransactions",
      reports: "navReports",
      complaints: "navComplaints",
      notifications: "navNotifications",
      users: "navUsersRoles",
      audit: "navAuditLogs",
      settings: "navSystemSettings"
    },
    sacco: {
      dashboard: "navDashboard",
      members: "navMembers",
      transactions: "navTransactions",
      savings: "navSavings",
      shares: "navShares",
      welfare: "navWelfare",
      loans: "navLoans",
      guarantors: "navGuarantors",
      approvals: "navApprovals",
      accounting: "navAccounting",
      reconciliation: "navReconciliation",
      reports: "navReports",
      governance: "navGovernance",
      complaints: "navComplaints",
      users: "navUsersRoles",
      settings: "navSettings",
      audit: "navAuditLogs"
    },
    member: {
      home: "navHome",
      loans: "navLoans",
      payments: "navPayments",
      notifications: "navNotifications",
      complaints: "navComplaints",
      profile: "navProfile",
      security: "security"
    }
  };
  const descriptionKeys = {
    platform: {
      dashboard: "navDashboardPlatformDesc",
      "sacco-applications": "navSaccoRegistrationDesc",
      subscriptions: "navSubscriptionsDesc",
      "sacco-accounts": "navSaccoAccountsDesc",
      transactions: "navPlatformTransactionsDesc",
      reports: "navPlatformReportsDesc",
      complaints: "navPlatformComplaintsDesc",
      notifications: "navNotificationsDesc",
      users: "navPlatformUsersDesc",
      audit: "navPlatformAuditDesc",
      settings: "navPlatformSettingsDesc"
    },
    sacco: {
      dashboard: "navSaccoDashboardDesc",
      members: "navMembersDesc",
      transactions: "navSaccoTransactionsDesc",
      savings: "navSavingsDesc",
      shares: "navSharesDesc",
      welfare: "navWelfareDesc",
      loans: "navLoansDesc",
      guarantors: "navGuarantorsDesc",
      approvals: "navApprovalsDesc",
      accounting: "navAccountingDesc",
      reconciliation: "navReconciliationDesc",
      reports: "navSaccoReportsDesc",
      governance: "navGovernanceDesc",
      complaints: "navSaccoComplaintsDesc",
      users: "navSaccoUsersDesc",
      settings: "navSettingsDesc",
      audit: "navSaccoAuditDesc"
    },
    member: {
      home: "navHomeDesc",
      loans: "navMemberLoansDesc",
      payments: "navPaymentsDesc",
      notifications: "navMemberNotificationsDesc",
      complaints: "navMemberComplaintsDesc",
      profile: "navProfileDesc",
      security: "navSecurityDesc"
    }
  };
  return [
    id,
    titleKeys[scope]?.[id] ? t(titleKeys[scope][id]) : label,
    descriptionKeys[scope]?.[id] ? t(descriptionKeys[scope][id]) : description,
    permission,
    roles
  ];
}

function canAccessView(view) {
  return visibleModules().some((item) => item[0] === view);
}

function currentModule() {
  return visibleModules().find((item) => item[0] === state.currentView) || visibleModules()[0];
}

const NAV_ICON_PATHS = {
  dashboard: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>',
  members: '<circle cx="9" cy="8" r="3"/><path d="M3.5 20c0-3 2.5-5 5.5-5s5.5 2 5.5 5"/><path d="M16.5 15c2 .3 3.5 2 3.5 4.5"/>',
  users: '<circle cx="9" cy="8" r="3"/><path d="M3.5 20c0-3 2.5-5 5.5-5s5.5 2 5.5 5"/><path d="M16.5 15c2 .3 3.5 2 3.5 4.5"/>',
  transactions: '<path d="M4 8h13l-3-3"/><path d="M20 16H7l3 3"/>',
  savings: '<ellipse cx="12" cy="7" rx="7" ry="3"/><path d="M5 7v6c0 1.7 3.1 3 7 3s7-1.3 7-3V7"/>',
  shares: '<circle cx="12" cy="12" r="9"/><path d="M12 3v9l7 4"/>',
  welfare: '<path d="M12 20s-7-4.3-7-9a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 4.7-7 9-7 9z"/>',
  'funding-sources': '<path d="M3 10l9-5 9 5"/><path d="M5 10v8M12 10v8M19 10v8"/><path d="M3 20h18"/>',
  funds: '<path d="M3 10l9-5 9 5"/><path d="M5 10v8M12 10v8M19 10v8"/><path d="M3 20h18"/>',
  loans: '<path d="M7 3h8l3 3v15H7z"/><path d="M15 3v3h3"/><path d="M10 12h5M10 16h5"/>',
  guarantors: '<path d="M12 3l7 3v5c0 4-3 7-7 9-4-2-7-5-7-9V6z"/><path d="M9 12l2 2 4-4"/>',
  approvals: '<circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/>',
  accounting: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 11h8M8 15h5"/>',
  reconciliation: '<path d="M4 8a8 8 0 0 1 13-3M17 2v4h-4"/><path d="M20 16a8 8 0 0 1-13 3M7 22v-4h4"/>',
  reports: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  governance: '<path d="M4 21h16M6 21V10M18 21V10M4 10l8-5 8 5"/>',
  complaints: '<path d="M4 5h16v11H8l-4 4z"/>',
  notifications: '<path d="M18 9a6 6 0 1 0-12 0c0 5-2 6-2 6h16s-2-1-2-6"/><path d="M10.5 20a2 2 0 0 0 3 0"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2 2M16.4 16.4l2 2M18.4 5.6l-2 2M7.6 16.4l-2 2"/>',
  audit: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4h6v3H9z"/><path d="M8 13l2 2 4-4"/>',
  subscriptions: '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3 10h18"/>',
  'sacco-applications': '<path d="M7 3h8l4 4v14H7z"/><path d="M15 3v4h4"/><path d="M12 11v6M9 14h6"/>',
  'sacco-accounts': '<path d="M3 10l9-5 9 5"/><path d="M5 10v8M12 10v8M19 10v8"/><path d="M3 20h18"/>',
  home: '<path d="M4 11l8-7 8 7"/><path d="M6 10v10h12V10"/>',
  money: '<rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/>'
};

function navIcon(view) {
  const path = NAV_ICON_PATHS[view] || '<circle cx="12" cy="12" r="8"/>';
  return `<svg class="nav-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
}

function renderShell() {
  document.body.className = "";
  const module = currentModule();
  const modules = visibleModules();
  const portal = state.auth === "member" ? t("memberSelfServicePortal") : isPlatform() ? t("platformAdministrationPortal") : t("saccoAdministrationPortal");
  const notificationButton = topbarNotificationButton(modules);
  const quickResults = quickSearchResults();
  const sessionMenu = sessionSecurityMenu();
  const helpMenu = helpSupportMenu();
  const accountMenu = accountProfileMenu();
  setHtml(`
    <a class="skip-link" href="#main-content">Skip to main content</a>
    <div class="app-shell">
      <aside class="sidebar" id="sidebar">
        <div class="sidebar-top">
          <div class="logo-lockup compact">${logo()}<div><strong>Tereka Online</strong><span>${portal}</span></div></div>
          <button class="icon-button menu-button" type="button" data-action="toggle-sidebar" aria-label="Toggle sidebar"><span class="menu-bars" aria-hidden="true"></span></button>
        </div>
        <div class="context-card">
          <small>${state.auth === "member" ? "SACCO" : isPlatform() ? "Context" : "SACCO"}</small>
          <strong>${contextName()}</strong>
          <span>${roleLabel()}</span>
        </div>
        <nav class="nav-list" aria-label="${escapeHtml(portal)} navigation">
          ${modules.map((item) => `
            <button class="nav-link ${item[0] === module[0] ? "active" : ""}" type="button" data-view="${item[0]}" ${item[0] === module[0] ? `aria-current="page"` : ""}>
              ${navIcon(item[0])}
              <span class="nav-text"><span>${item[1]}</span><small>${item[2]}</small></span>
            </button>
          `).join("")}
        </nav>
        <button class="logout-button" type="button" data-action="logout">${t("logout")}</button>
      </aside>
      <main class="main" id="main-content" tabindex="-1">
        <header class="topbar">
          <button class="icon-button mobile-only menu-button" type="button" data-action="toggle-sidebar" aria-label="Open menu"><span class="menu-bars" aria-hidden="true"></span></button>
          <div class="breadcrumbs">${t("home")} / ${portal} / <strong>${module[1]}</strong></div>
          <div class="topbar-actions">
            <label class="topbar-locale">
              <span class="sr-only">Language</span>
              <select id="shellLocale" aria-label="Language">
                ${supportedLocales.map((locale) => `<option value="${escapeHtml(locale.code)}" ${state.locale === locale.code ? "selected" : ""}>${escapeHtml(locale.label)}</option>`).join("")}
              </select>
            </label>
            ${networkStatusChip()}
            <div class="quick-search">
              <label class="search-box"><span>${t("search")}</span><input id="globalSearch" value="${escapeHtml(state.search)}" placeholder="${t("searchPlaceholder")}" autocomplete="off" aria-autocomplete="list" aria-controls="quickSearchResults"></label>
              ${quickSearchPanel(quickResults)}
            </div>
            <div class="session-control">
              <button class="session-chip ${sessionStatusClass()}" type="button" data-action="toggle-session-menu" aria-label="Session menu, ${escapeHtml(sessionTimeLabel())}" aria-expanded="${state.sessionMenuOpen ? "true" : "false"}">${sessionTimeLabel()}</button>
              ${sessionMenu}
            </div>
            ${notificationButton}
            <div class="help-control">
              <button class="icon-button" type="button" title="Help" aria-label="Help menu" data-action="toggle-help-menu" aria-expanded="${state.helpMenuOpen ? "true" : "false"}">?</button>
              ${helpMenu}
            </div>
            <div class="account-control">
              <div class="account-identity">
                <strong>${escapeHtml(displayName())}</strong>
                <span>${escapeHtml(roleLabel())}</span>
              </div>
              <button class="profile-chip" type="button" title="Account" aria-label="Account menu for ${escapeHtml(displayName())}" data-action="toggle-account-menu" aria-expanded="${state.accountMenuOpen ? "true" : "false"}">${initials(displayName())}</button>
              ${accountMenu}
            </div>
          </div>
        </header>
        <section class="page-header">
          <div>
            <p class="eyebrow">${portal}</p>
            <h1>${module[1]}</h1>
            <p>${module[2]}</p>
          </div>
          <div class="page-actions">
            ${state.auth === "member" ? `<button class="button secondary" data-action="refresh-member" type="button" ${state.networkOnline ? "" : "disabled"} title="${state.networkOnline ? "" : t("refreshUnavailableOffline")}">${t("refresh")}</button>` : `<button class="button secondary" data-action="refresh" type="button" ${state.networkOnline ? "" : "disabled"} title="${state.networkOnline ? "" : t("refreshUnavailableOffline")}">${t("refresh")}</button>`}
            <button class="button ghost" type="button" data-action="export-summary">${t("exportSummary")}</button>
          </div>
        </section>
        <section class="content-area">
          ${runtimeNotice()}
          ${renderView(module[0])}
        </section>
        <footer class="footer">Tereka Online</footer>
      </main>
    </div>
    ${printableSummarySection(module, portal)}
  `);
}

function printableSummarySection(module, portal) {
  const generatedAt = formatDateTime(new Date().toISOString());
  const sacco = escapeHtml(contextName());
  if (state.auth === "member" && state.statementPrint) {
    const lines = state.memberStatementView || state.memberStatementLines || [];
    return `
    <section class="print-summary" role="document" aria-hidden="true">
      <header class="print-head">
        <div class="print-brand"><strong>Tereka Online</strong><span>${sacco}</span></div>
        <div class="print-title"><h1>Member Statement</h1><span>Generated ${escapeHtml(generatedAt)}</span></div>
      </header>
      <section class="print-identity">
        <div><small>Member</small><strong>${escapeHtml(displayName())}</strong></div>
        <div><small>Member number</small><strong>${escapeHtml(state.member?.membershipNo || "-")}</strong></div>
        <div><small>Status</small><strong>${escapeHtml(labelize(state.member?.status || "-"))}</strong></div>
      </section>
      <section class="print-block">
        <h2>Statement of account</h2>
        ${lines.length ? `<table class="print-table print-ledger">
          <thead><tr><th>Date</th><th>Source</th><th>Reference</th><th>Description</th><th>Method</th><th class="num">Debit</th><th class="num">Credit</th><th class="num">Balance</th></tr></thead>
          <tbody>${lines.map((line) => `<tr>
            <td>${escapeHtml(String(line.postedAt || "-"))}</td>
            <td>${escapeHtml(String(line.source || "-"))}</td>
            <td>${escapeHtml(String(line.reference || "-"))}</td>
            <td>${escapeHtml(String(line.description || "-"))}</td>
            <td>${escapeHtml(String(line.method || labelize(line.channel || line.paymentRoute || "-")))}</td>
            <td class="num">${Number(line.debit || 0) ? money.format(line.debit) : "-"}</td>
            <td class="num">${Number(line.credit || 0) ? money.format(line.credit) : "-"}</td>
            <td class="num">${line.runningBalance != null ? money.format(line.runningBalance) : "-"}</td>
          </tr>`).join("")}</tbody>
        </table>` : "<p>No statement activity.</p>"}
      </section>
      <footer class="print-foot"><span>Tereka Online · ${sacco}</span><span>Confidential member statement</span></footer>
    </section>`;
  }
  if (state.auth === "member") {
    const balances = state.memberData.balances || {};
    const savings = Number(balances.savings || 0);
    const shares = Number(balances.shares || 0);
    const welfare = Number(balances.welfare || 0);
    const loanBalance = (state.memberData.loans || [])
      .reduce((sum, loan) => sum + Number(loan.outstandingBalance || 0), 0);
    const recent = (state.memberData.dashboard?.recentTransactions || []).slice(0, 12);
    return `
    <section class="print-summary" role="document" aria-hidden="true">
      <header class="print-head">
        <div class="print-brand"><strong>Tereka Online</strong><span>${sacco}</span></div>
        <div class="print-title"><h1>Member Account Summary</h1><span>Generated ${escapeHtml(generatedAt)}</span></div>
      </header>
      <section class="print-identity">
        <div><small>Member</small><strong>${escapeHtml(displayName())}</strong></div>
        <div><small>Member number</small><strong>${escapeHtml(state.member?.membershipNo || "-")}</strong></div>
        <div><small>Status</small><strong>${escapeHtml(labelize(state.member?.status || "-"))}</strong></div>
      </section>
      <section class="print-block">
        <h2>Balances</h2>
        <table class="print-table">
          <tbody>
            <tr class="print-total"><th>Total savings</th><td class="num">${money.format(savings)}</td></tr>
            <tr><th>Shares</th><td class="num">${money.format(shares)}</td></tr>
            <tr><th>Welfare</th><td class="num">${money.format(welfare)}</td></tr>
          </tbody>
        </table>
      </section>
      <section class="print-block">
        <h2>Loan balance</h2>
        <table class="print-table">
          <tbody>
            <tr class="print-total"><th>Outstanding loan balance</th><td class="num">${money.format(loanBalance)}</td></tr>
          </tbody>
        </table>
      </section>
      ${recent.length ? `<section class="print-block">
        <h2>Recent activity</h2>
        <table class="print-table print-ledger">
          <thead><tr><th>Date</th><th>Reference</th><th>Description</th><th class="num">Debit</th><th class="num">Credit</th><th class="num">Balance</th></tr></thead>
          <tbody>${recent.map((row) => `<tr>
            <td>${escapeHtml(String(row.postedAt || "-"))}</td>
            <td>${escapeHtml(String(row.reference || "-"))}</td>
            <td>${escapeHtml(String(row.description || "-"))}</td>
            <td class="num">${Number(row.debit || 0) ? money.format(row.debit) : "-"}</td>
            <td class="num">${Number(row.credit || 0) ? money.format(row.credit) : "-"}</td>
            <td class="num">${row.runningBalance != null ? money.format(row.runningBalance) : "-"}</td>
          </tr>`).join("")}</tbody>
        </table>
      </section>` : ""}
      <footer class="print-foot"><span>Tereka Online · ${sacco}</span><span>Confidential member statement</span></footer>
    </section>`;
  }
  return `
    <section class="print-summary" role="document" aria-hidden="true">
      <header class="print-head">
        <div class="print-brand"><strong>Tereka Online</strong><span>${sacco}</span></div>
        <div class="print-title"><h1>${escapeHtml(module[1])} Summary</h1><span>Generated ${escapeHtml(generatedAt)}</span></div>
      </header>
      <section class="print-identity">
        <div><small>Portal</small><strong>${escapeHtml(portal)}</strong></div>
        <div><small>Prepared by</small><strong>${escapeHtml(displayName())}</strong></div>
        <div><small>Context</small><strong>${sacco}</strong></div>
      </section>
      <footer class="print-foot"><span>Tereka Online · ${sacco}</span><span>Confidential</span></footer>
    </section>`;
}

function quickSearchPanel(results) {
  if (!state.search.trim()) return "";
  const groups = groupQuickSearchResults(results);
  return `
    <div class="quick-search-panel" id="quickSearchResults" role="listbox" aria-label="Quick search results">
      ${results.length ? groups.map(({ group, rows }) => `
        <div class="quick-search-group">
          <strong>${escapeHtml(group)}</strong>
          ${rows.map((result) => `
            <button class="${result.id === state.quickSearchActiveId ? "active" : ""}" type="button" role="option" aria-selected="${result.id === state.quickSearchActiveId ? "true" : "false"}" data-quick-result="${escapeHtml(result.id)}">
              <span>${escapeHtml(result.title)}</span>
              <small>${escapeHtml(result.meta)}</small>
            </button>
          `).join("")}
        </div>
      `).join("") : `<div class="quick-search-empty">No quick results. Tables below still filter by this search.</div>`}
    </div>
  `;
}

function networkStatusChip() {
  return `<span class="network-chip ${state.networkOnline ? "online" : "offline"}">${state.networkOnline ? t("online") : t("offlineMode")}</span>`;
}

function quickSearchResults() {
  const model = buildQuickSearchModel({
    activeId: state.quickSearchActiveId,
    index: quickSearchIndex(),
    query: state.search,
    limit: 8
  });
  state.quickSearchActiveId = model.activeId;
  return model.results;
}

function quickSearchIndex() {
  if (state.auth === "member") {
    return [
      ...state.memberData.loans.map((loan) => buildQuickSearchResult("Loans", loan.id, "loans", loan.applicationNo || loan.product || "Loan", `${loan.product || ""} ${money.format(loan.requestedAmount || loan.outstandingBalance || 0)} ${loan.status || ""}`)),
      ...(state.memberData.chatThreads || []).map((thread) => buildQuickSearchResult("Support", thread.id, "complaints", thread.subject || "Support chat", `${thread.status || ""}`)),
      ...state.memberData.notifications.map((notification) => buildQuickSearchResult("Notifications", notification.id, "complaints", notification.title || "Notification", `${notification.status || ""} ${formatDateTime(notification.createdAt)}`)),
      ...state.memberData.pendingGuarantors.map((request) => buildQuickSearchResult("Guarantor Requests", request.id, "loans", request.loan?.applicationNo || request.borrower || "Guarantor request", `${request.status || ""} ${money.format(request.guaranteedAmount || 0)}`))
    ];
  }
  const visible = new Set(visibleModules().map((module) => module[0]));
  const results = [];
  if (visible.has("sacco-applications")) {
    results.push(...tenantRows().map((tenant) => buildQuickSearchResult("SACCOs", tenant.id, "sacco-applications", tenant.name, `${tenant.saccoCode || tenant.abbreviation || ""} ${tenant.status || ""}`, { selectedTenantId: tenant.id, saccoRegistrationTab: "applications" })));
  }
  if (visible.has("subscriptions")) {
    results.push(...dataRows("subscriptions").map((subscription) => buildQuickSearchResult("Subscriptions", subscription.id, "subscriptions", subscription.tenantName || tenantName(subscription.tenantId), `${subscription.packageName || ""} ${subscription.status || ""}`, { selectedSubscriptionId: subscription.id })));
  }
  if (visible.has("members")) {
    results.push(...dataRows("members").map((member) => buildQuickSearchResult("Members", member.id, "members", member.fullName, `${member.membershipNo || ""} ${member.phone || ""}`, { selectedMemberId: member.id, memberTab: "kyc" })));
  }
  if (visible.has("transactions")) {
    results.push(...dataRows("transactions").map((transaction) => buildQuickSearchResult("Transactions", transaction.id, "transactions", transaction.reference || transaction.id, `${memberName(transaction.memberId)} ${money.format(transaction.amount || 0)} ${transaction.status || ""}`)));
  }
  if (visible.has("loans")) {
    results.push(...dataRows("loans").map((loan) => buildQuickSearchResult("Loans", loan.id, "loans", loan.applicationNo || loan.id, `${loan.memberName || memberName(loan.memberId)} ${money.format(loan.requestedAmount || loan.outstandingBalance || 0)} ${loan.status || ""}`, { selectedLoanId: loan.id, moduleTabView: "loans", moduleTab: "detail" })));
  }
  if (visible.has("users")) {
    results.push(...dataRows("users").map((user) => buildQuickSearchResult(isPlatform() ? "Platform Users" : "SACCO Users", user.id, "users", user.fullName || user.email, `${user.email || ""} ${user.status || ""}`, { selectedUserId: user.id, userAdminTab: "detail" })));
  }
  if (visible.has("complaints")) {
    results.push(...dataRows("complaints").map((complaint) => buildQuickSearchResult("Complaints", complaint.id, "complaints", complaint.subject || complaint.category || complaint.id, `${complaint.status || ""} ${complaint.priority || ""}`, { selectedComplaintId: complaint.id })));
  }
  return results;
}

function topbarNotificationButton(modules) {
  const canOpen = state.auth === "member"
    ? modules.some((item) => item[0] === "complaints")
    : modules.some((item) => item[0] === "notifications");
  const unreadCount = unreadNotificationCount();
  const countLabel = unreadCount > 99 ? "99+" : String(unreadCount);
  const title = unreadCount ? `${countLabel} unread notification${unreadCount === 1 ? "" : "s"}` : "No unread notifications";
  return `
    <button class="icon-button notification-button ${unreadCount ? "has-alerts" : ""}" type="button" title="${escapeHtml(title)}" aria-label="${escapeHtml(title)}" data-action="open-notifications" ${canOpen ? "" : "disabled"}>
      <span aria-hidden="true">!</span>
      ${unreadCount ? `<strong class="notification-badge">${escapeHtml(countLabel)}</strong>` : ""}
    </button>
  `;
}

function unreadNotificationCount() {
  if (state.auth === "member") {
    return memberUnreadNotificationCount(state.memberData.notifications);
  }
  return staffUnreadNotificationCount(dataRows("notifications"));
}

function sessionSecurityMenu() {
  if (!state.sessionMenuOpen || state.auth === "none") return "";
  const minutes = sessionMinutesRemaining();
  const expiresAt = sessionExpiryValue();
  const security = state.data.securitySummary || {};
  const policy = state.data.platformSecurityPolicy || defaultPlatformSecurityPolicy();
  const mfaLabel = state.auth === "staff" ? (security.mfaEnabled || state.user?.mfaEnabled ? "Enabled" : "Not enabled") : "Member password";
  const expiryLabel = expiresAt ? formatDateTime(expiresAt) : "Not reported";
  const urgency = minutes === null ? "Active" : minutes <= 0 ? "Expired" : minutes <= 15 ? "Expires soon" : "Active";
  return `
    <div class="session-menu">
      <div class="session-menu-heading">
        <strong>Session and security</strong>
        <span class="status ${sessionStatusClass()}">${escapeHtml(urgency)}</span>
      </div>
      <div class="source-grid compact-source-grid">
        ${mini("Expires", expiryLabel)}
        ${mini("MFA", mfaLabel)}
        ${mini("Login", state.auth === "member" ? state.member?.membershipNo || "Member" : state.user?.email || "Staff")}
        ${mini("Role", roleLabel())}
      </div>
      ${isPlatform() ? `<p class="session-policy">Lockout after ${escapeHtml(policy.lockoutFailedAttempts ?? 5)} failed login attempts for ${escapeHtml(policy.lockoutMinutes ?? 15)} minute(s).</p>` : ""}
      <div class="session-menu-actions">
        <button class="button secondary" type="button" data-action="extend-session">Extend session</button>
        ${state.auth === "staff" ? `<button class="button ghost" type="button" data-action="open-security-settings">Security settings</button>` : `<button class="button ghost" type="button" data-action="open-member-security">Member security</button>`}
      </div>
    </div>
  `;
}

function helpSupportMenu() {
  if (!state.helpMenuOpen || state.auth === "none") return "";
  const role = roleLabel();
  const context = contextName();
  const primaryAction = state.auth === "member"
    ? ["open-help-complaints", "Submit complaint"]
    : isPlatform()
      ? ["open-help-complaints", "Open SACCO admin complaints"]
      : ["open-help-complaints", "Open member complaints"];
  const secondaryAction = state.auth === "member"
    ? ["open-help-security", "Security help"]
    : ["open-help-notifications", "Notification help"];
  return `
    <div class="help-menu">
      <div class="session-menu-heading">
        <strong>Help and support</strong>
        <span class="status active">Available</span>
      </div>
      <div class="source-grid compact-source-grid">
        ${mini("Portal", state.auth === "member" ? "Member" : isPlatform() ? "Platform" : "SACCO")}
        ${mini("Context", context)}
        ${mini("Role", role)}
        ${mini("Support path", state.auth === "member" ? "SACCO admin" : isPlatform() ? "SACCO admins" : "Members")}
      </div>
      <p class="session-policy">${escapeHtml(helpMenuGuidance())}</p>
      <div class="session-menu-actions">
        <button class="button secondary" type="button" data-action="${primaryAction[0]}">${primaryAction[1]}</button>
        <button class="button ghost" type="button" data-action="${secondaryAction[0]}">${secondaryAction[1]}</button>
      </div>
    </div>
  `;
}

function helpMenuGuidance() {
  if (state.auth === "member") return "Members raise account, payment, loan or profile issues to their SACCO administration team.";
  if (isPlatform()) return "The platform desk handles complaints and escalations submitted by SACCO administrators.";
  return "SACCO administrators resolve member complaints locally and escalate platform or billing issues when needed.";
}

function accountProfileMenu() {
  if (!state.accountMenuOpen || state.auth === "none") return "";
  const identity = state.auth === "member"
    ? state.member?.membershipNo || state.member?.email || state.member?.phone || "Member account"
    : state.user?.email || state.user?.phone || "Staff account";
  const primaryAction = state.auth === "member"
    ? ["open-account-profile", "Open profile"]
    : ["open-account-profile", "My access"];
  return `
    <div class="account-menu">
      <div class="account-menu-heading">
        <span class="profile-avatar">${initials(displayName())}</span>
        <div>
          <strong>${escapeHtml(displayName())}</strong>
          <small>${escapeHtml(identity)}</small>
        </div>
      </div>
      <div class="source-grid compact-source-grid">
        ${mini("Role", roleLabel())}
        ${mini("Context", contextName())}
        ${mini("Session", sessionTimeLabel())}
        ${mini("MFA", state.auth === "staff" ? ((state.data.securitySummary || {}).mfaEnabled || state.user?.mfaEnabled ? "Enabled" : "Not enabled") : "Member password")}
      </div>
      <div class="session-menu-actions">
        <button class="button secondary" type="button" data-action="${primaryAction[0]}">${primaryAction[1]}</button>
        <button class="button ghost" type="button" data-action="${state.auth === "member" ? "open-member-security" : "open-security-settings"}">Security</button>
        <button class="button ghost danger-text" type="button" data-action="logout">Logout</button>
      </div>
    </div>
  `;
}

function closeTopbarMenus({ clearSearch = false } = {}) {
  state.sessionMenuOpen = false;
  state.helpMenuOpen = false;
  state.accountMenuOpen = false;
  state.quickSearchActiveId = "";
  if (clearSearch) {
    state.search = "";
    state.tableState = {};
  }
}

function renderView(view) {
  if (state.auth === "member") return renderMemberView(view);
  if (view === "dashboard") return isPlatform() ? platformDashboard() : saccoDashboard();
  if (view === "sacco-applications") return saccoApplications();
  if (view === "subscriptions") return subscriptionsView();
  if (view === "member-dues") return memberDuesView();
  if (view === "savings-transfers") return savingsTransfersView();
  if (view === "sacco-accounts") return saccoAccounts();
  if (view === "members") return membersView();
  if (view === "transactions") return transactionsView();
  if (view === "loans") return loansView();
  if (view === "approvals") return approvalsView();
  if (view === "operations") return operationsView();
  if (view === "reports") return reportsView();
  if (view === "complaints") return complaintsView();
  if (view === "notifications") return notificationsView();
  if (view === "users") return usersView();
  if (view === "audit") return auditView();
  if (["savings", "shares", "welfare", "guarantors", "accounting", "reconciliation", "governance", "settings"].includes(view)) return moduleBlueprint(view);
  return emptyState("Module coming next", "This module has a document-driven shell and will be connected to deeper backend workflows next.");
}

function openSecuritySettings() {
  state.sessionMenuOpen = false;
  state.currentView = "settings";
  state.moduleTabs.settings = "security";
  renderShell();
}

function openMemberSecurity() {
  state.sessionMenuOpen = false;
  state.currentView = "profile";
  state.moduleTabs.profile = "security";
  renderShell();
}

function openHelpComplaints() {
  state.helpMenuOpen = false;
  state.currentView = "complaints";
  renderShell();
}

function openHelpNotifications() {
  state.helpMenuOpen = false;
  state.currentView = canAccessView("notifications") ? "notifications" : "dashboard";
  renderShell();
}

function openHelpSecurity() {
  state.helpMenuOpen = false;
  state.currentView = state.auth === "member" ? "profile" : "settings";
  if (state.auth === "member") state.moduleTabs.profile = "security";
  if (state.auth === "staff") state.moduleTabs.settings = "security";
  renderShell();
}

async function openAccountProfile() {
  state.accountMenuOpen = false;
  if (state.auth === "member") {
    state.currentView = "profile";
    state.moduleTabs.profile = "overview";
    renderShell();
    return;
  }
  if (canAccessView("users") && state.user?.id) {
    state.currentView = "users";
    await openUserDetail(state.user.id);
    return;
  }
  state.currentView = "settings";
  state.moduleTabs.settings = "security";
  renderShell();
}

function runtimeNotice() {
  if (state.loading) return `<section class="notice compact"><strong>Loading latest records...</strong><span>Please wait while Tereka Online refreshes this view.</span></section>`;
  if (state.auth !== "none" && !state.networkOnline) {
    return `<section class="notice warning"><strong>${t("offlineNoticeTitle")}</strong><span>${t("offlineNoticeCopy")}</span></section>`;
  }
  const sessionMinutes = sessionMinutesRemaining();
  if (state.auth !== "none" && sessionMinutes !== null && sessionMinutes <= 0) {
    return `<section class="notice danger"><strong>Session expired.</strong><span>Please login again to continue working.</span><button class="button secondary" type="button" data-action="logout">Return to login</button></section>`;
  }
  if (state.auth !== "none" && sessionMinutes !== null && sessionMinutes <= 15) {
    return `<section class="notice warning"><strong>Session expires soon.</strong><span>${escapeHtml(sessionTimeLabel())}. Save your work or extend the session before continuing sensitive actions.</span><button class="button secondary" type="button" data-action="extend-session">Extend session</button></section>`;
  }
  if (state.lastError) return `<section class="notice warning"><strong>Some records could not be loaded.</strong><span>${escapeHtml(state.lastError)}</span><button class="button secondary" type="button" data-action="${state.auth === "member" ? "refresh-member" : "refresh"}">Retry</button></section>`;
  return "";
}

function expireLocalSession(message) {
  localStorage.removeItem(STAFF_TOKEN_KEY);
  localStorage.removeItem(MEMBER_TOKEN_KEY);
  Object.assign(state, {
    auth: "none",
    authTab: "login",
    token: "",
    user: null,
    member: null,
    tenant: null,
    roleNames: [],
    permissionIds: [],
    currentView: "dashboard",
    sessionExpiresAt: "",
    data: emptyData(),
    pageMeta: {},
    memberData: emptyMemberData(),
    lastError: message || "Your session has expired. Please login again."
  });
  renderLogin();
}

function sessionExpiryValue() {
  if (state.auth === "member") {
    return state.sessionExpiresAt || state.memberData.sessionExpiresAt || state.memberData.dashboard?.sessionExpiresAt || "";
  }
  return state.sessionExpiresAt || "";
}

function sessionMinutesRemaining() {
  const expiresAt = sessionExpiryValue();
  if (!expiresAt) return null;
  const expiry = new Date(expiresAt).getTime();
  if (Number.isNaN(expiry)) return null;
  return Math.ceil((expiry - Date.now()) / 60000);
}

function sessionTimeLabel() {
  if (state.auth === "none") return "";
  const minutes = sessionMinutesRemaining();
  if (minutes === null) return "Session active";
  if (minutes <= 0) return "Session expired";
  if (minutes < 60) return `Session ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return remaining ? `Session ${hours}h ${remaining}m` : `Session ${hours}h`;
}

function sessionStatusClass() {
  const minutes = sessionMinutesRemaining();
  if (minutes === null) return "active";
  if (minutes <= 0) return "danger";
  if (minutes <= 15) return "pending";
  return "active";
}

