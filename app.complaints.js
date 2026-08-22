function complaintsView() {
  const cycle = isPlatform() ? null : currentSaccoCycleContext();
  const sourceRows = isPlatform()
    ? dataRows("chatThreads") || []
    : filterComplaintsBySaccoCycle(dataRows("chatThreads") || [], cycle);
  const rows = buildChatThreadRows({ threads: sourceRows, tenantName, memberName });
  const complaintSummary = buildComplaintSummary(rows);
  if (isPlatform()) {
    const tabs = [["chat", "SACCO admin chat"], ["list", "Complaint list"]];
    const tab = activeModuleTab("complaints", tabs);
    return `
      ${complaintFlowStrip("platform")}
      <div class="dashboard-grid">
        ${summary(t("complaintsFromSaccoAdmins"), complaintSummary.open, "Open platform support cases", t("review"))}
        ${summary(t("urgentComplaints"), complaintSummary.urgent, "Needs same-day action", "Escalate")}
        ${summary(t("inProgress"), complaintSummary.inProgress, "Being handled", "Track")}
        ${summary(t("resolved"), complaintSummary.resolved, "Closed support cases", t("review"))}
      </div>
      <section class="panel compact-panel">
        <div class="panel-heading">
          <div>
            <h2>Complaints from SACCO admins</h2>
            <p>View and export support cases submitted by SACCO administrators.</p>
          </div>
          <button class="button secondary" type="button">Export complaints</button>
        </div>
      </section>
      ${moduleTabs("complaints", tabs, tab)}
      ${tab === "chat" ? complaintChatWorkspace("SACCO admin - Platform Super Admin chat", "WhatsApp-style support threads from SACCO administrators to the platform owner.", rows.filter((row) => row.type === "PLATFORM_SUPPORT"), "platform-super") : ""}
      ${tab === "list" ? `
        ${filterToolbar("Search threads by SACCO, subject or status", "Export", "Assign")}
        ${recordTable(t("complaintsFromSaccoAdmins"), complaintTableRows(rows.filter((row) => row.type === "PLATFORM_SUPPORT")), ["tenantName", "subject", "priority", "status", "routedTo", "latestActivity", "updatedAt"])}
      ` : ""}
    `;
  }
  const memberRows = rows.filter((row) => row.type === "MEMBER_SUPPORT");
  const platformRows = rows.filter((row) => row.type === "PLATFORM_SUPPORT");
  const tabs = [["member-chat", "Member chat"], ["platform-chat", "Platform Super Admin chat"], ["capture-member", "New member message"], ["capture-platform", "Message platform"], ["list", "All messages"]];
  const tab = activeModuleTab("complaints", tabs);
  return `
    ${saccoCyclePanel(cycle)}
    ${complaintFlowStrip("sacco")}
    <div class="dashboard-grid">
      ${summary("Member chats", memberRows.length, "SACCO admin and member support", "Open")}
      ${summary("Platform chats", platformRows.length, "SACCO admin and platform support", "Open")}
      ${summary("Urgent complaints", complaintSummary.urgent, "Needs same-day action", "Escalate")}
      ${summary("Open follow-up", complaintSummary.open, "Unresolved conversations", "Track")}
    </div>
    ${moduleTabs("complaints", tabs, tab)}
    ${tab === "member-chat" ? complaintChatWorkspace("SACCO admin - member chat", "WhatsApp-style member support threads for questions, complaints and SACCO office replies.", memberRows, "sacco-member") : ""}
    ${tab === "platform-chat" ? complaintChatWorkspace("SACCO admin - Platform Super Admin chat", "Escalate platform, billing or system support messages to the platform owner.", platformRows, "sacco-platform") : ""}
    ${tab === "capture-member" ? complaintCapturePanel("member") : ""}
    ${tab === "capture-platform" ? complaintCapturePanel("platform-escalation") : ""}
    ${tab === "list" ? `
      ${filterToolbar("Search messages by member, subject or status", "New message", "Assign officer")}
      ${recordTable(`Support threads - ${cycle.label}`, complaintTableRows(rows), ["memberName", "type", "subject", "priority", "status", "routedTo", "latestActivity", "updatedAt"])}
    ` : ""}
  `;
}

function complaintTableRows(rows) {
  return (rows || []).map((row) => {
    const route = complaintRouteAssignment(row.id);
    return {
      ...row,
      priority: complaintPriorityBadge(row.priority || complaintPriorityFromText(row.lastMessagePreview || row.subject || "")),
      status: complaintStatusBadge(row.status || "open"),
      routedTo: route ? `<span class="complaint-chip route">${escapeHtml(route.assignedTo)}</span>` : `<span class="complaint-chip neutral">Secretary</span>`,
      latestActivity: complaintLatestActivity(row.lastMessagePreview || row.subject || ""),
      updatedAt: row.updatedAt
    };
  });
}

function complaintPriorityFromText(text) {
  const value = String(text || "").toLowerCase();
  if (value.includes("urgent") || value.includes("high")) return "high";
  if (value.includes("low")) return "low";
  return "medium";
}

function complaintPriorityBadge(priority) {
  const value = String(priority || "medium").toLowerCase();
  const tone = value.includes("high") || value.includes("urgent") ? "high" : value.includes("low") ? "low" : "medium";
  return `<span class="complaint-chip priority-${tone}">${escapeHtml(labelize(value))}</span>`;
}

function complaintStatusBadge(status) {
  const value = String(status || "open").toLowerCase();
  const tone = value.includes("resolved") || value.includes("closed") ? "resolved" : value.includes("progress") ? "progress" : "open";
  return `<span class="complaint-chip status-${tone}">${escapeHtml(labelize(status || "open"))}</span>`;
}

function complaintLatestActivity(text) {
  const cleaned = String(text || "")
    .replace(/Category:\s*.+/gi, "")
    .replace(/Priority:\s*.+/gi, "")
    .replace(/Primary response:\s*.+/gi, "")
    .replace(/C:\s*.+?\|\s*P:\s*.+?\|\s*R:\s*.+/gi, "")
    .replace(/Routing update/gi, "Routed")
    .replace(/Assigned to:\s*/gi, "To ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || "No message yet";
}

function complaintChatWorkspace(title, copy, rows, mode) {
  const visibleRows = filterChatThreadRows(rows, state.chatFilters[mode] || "");
  if (!rows.length) {
    return `
      <section class="panel complaint-empty-panel">
        <div>
          <h2>${escapeHtml(title)}</h2>
          <p>${escapeHtml(mode === "sacco-platform"
            ? "Start a platform message when the SACCO needs help from the Platform Super Admin."
            : copy || "No chat threads are available yet.")}</p>
        </div>
        <span class="status active">No open chats</span>
      </section>
    `;
  }
  const selected = visibleRows.find((row) => row.id === state.selectedComplaintId) || visibleRows[0];
  return `
    <section class="chat-workspace panel" aria-label="${escapeHtml(title)}" aria-description="${escapeHtml(copy)}">
      <div class="chat-sidebar">
        <div class="chat-sidebar-header">
          <div>
            <strong>${escapeHtml(complaintChatTitle(mode))}</strong>
            <small>${escapeHtml(complaintChatDirection(mode))}</small>
          </div>
          <span>${visibleRows.length} of ${rows.length}</span>
        </div>
        <div class="chat-search-row">
          <input data-chat-search="${escapeHtml(mode)}" value="${escapeHtml(state.chatFilters[mode] || "")}" placeholder="${escapeHtml(complaintChatSearchPlaceholder(mode))}">
        </div>
        ${visibleRows.length ? `<div class="chat-thread-list">
          ${visibleRows.map((row) => complaintChatThreadButton(row, selected.id === row.id, mode)).join("")}
        </div>` : `<div class="empty-state compact"><strong>No matching chats</strong><span>Clear the search to show all conversations.</span></div>`}
      </div>
      <div class="chat-main">
        ${selected ? chatConversationPanel(selected, mode) : emptyState("No matching chats", "Clear the search to select a conversation.")}
      </div>
    </section>
  `;
}

function complaintChatThreadButton(row, selected, mode) {
  const participant = complaintChatParticipant(row, mode);
  const latest = row.lastMessagePreview || row.subject || "No messages yet.";
  return `
    <button class="chat-thread-button ${selected ? "active" : ""}" type="button" data-chat-complaint-id="${escapeHtml(row.id)}">
      <span class="chat-avatar">${escapeHtml(chatInitialsFor(participant))}</span>
      <span class="chat-thread-copy">
        <strong>${escapeHtml(participant)}</strong>
        <em>${escapeHtml(row.subject || "Support chat")}</em>
        <small>${escapeHtml(latest)}</small>
      </span>
      <span class="chat-thread-meta">
        <time>${escapeHtml(shortDate(row.updatedAt || row.createdAt))}</time>
        ${row.unreadCount ? `<b class="chat-unread">${row.unreadCount}</b>` : `<b>${escapeHtml(labelize(row.status || "open"))}</b>`}
      </span>
    </button>
  `;
}

function complaintChatParticipant(row, mode) {
  return chatParticipantLabel({ row, mode, tenantName, memberName, contextName });
}

function complaintFlowStrip(mode) {
  const platform = mode === "platform";
  return `
    <section class="complaint-flow-strip">
      <div>
        <span>${platform ? "Platform complaint desk" : "SACCO complaint desk"}</span>
        <strong>${platform ? "SACCO admins contact the Platform Super Admin here." : "Members contact the SACCO here. SACCO admins escalate system issues to the platform."}</strong>
      </div>
      <div class="complaint-flow-steps">
        ${complaintFlowStep(platform ? "SACCO Admin" : "Member", "Starts chat")}
        ${complaintFlowStep(platform ? "Platform Super Admin" : "SACCO Admin / Secretary", "Replies and routes")}
        ${complaintFlowStep("Status", "Open, in progress, resolved")}
      </div>
    </section>
  `;
}

function complaintFlowStep(label, detail) {
  return `<div><span>${escapeHtml(label)}</span><strong>${escapeHtml(detail)}</strong></div>`;
}

function complaintChatTitle(mode) {
  if (mode === "platform-super") return "SACCO admin complaints";
  if (mode === "sacco-platform") return "Platform support chats";
  if (mode === "member-support") return "My SACCO support";
  return "Member complaint chats";
}

function complaintChatDirection(mode) {
  if (mode === "platform-super") return "SACCO Admin -> Platform Super Admin";
  if (mode === "sacco-platform") return "SACCO Admin -> Platform Super Admin";
  if (mode === "member-support") return "Member -> SACCO Admin";
  return "Member -> SACCO Admin / Secretary";
}

function complaintChatSearchPlaceholder(mode) {
  if (mode === "platform-super") return "Search by SACCO, subject or latest message";
  if (mode === "sacco-platform") return "Search platform support chats";
  return "Search member, subject or latest message";
}

/**
 * @param {TerekaComplaintThread | undefined} selected
 * @param {string} mode
 * @returns {string}
 */
function chatConversationPanel(selected, mode) {
  if (!selected) return emptyState("No conversation", "Select a chat to view messages.");
  const messages = state.chatMessages[selected.id];
  const memberView = mode === "member-support" || state.auth === "member";
  const canManage = memberView ? true : hasPermission("complaints:manage");
  const viewerOutbound = memberView ? "MEMBER" : (isPlatform() ? "PLATFORM" : "STAFF");
  const heading = memberView
    ? "Support chat with SACCO admin"
    : mode === "sacco-member"
      ? "SACCO admin - member chat"
      : "SACCO admin - Platform Super Admin chat";
  const participant = complaintChatParticipant(selected, mode);
  const route = complaintRouteAssignment(selected.id);
  const canReply = complaintCanReply(selected, mode, route);
  const routedReply = !memberView && !!route && canReply && !canManage;
  const canCompose = canManage || routedReply;
  const windowHtml = messages === undefined
    ? `<div class="chat-window"><div class="empty-state compact"><strong>Loading messages...</strong></div></div>`
    : (messages.length
        ? `<div class="chat-window">${messages.map((message) => chatBubble(
            message.senderType === viewerOutbound ? "sent" : "received",
            message.senderName || labelize(message.senderType),
            complaintMessageDisplayBody(message.body),
            message.createdAt)).join("")}</div>`
        : `<div class="chat-window"><div class="empty-state compact"><strong>No messages yet</strong><span>Start the conversation below.</span></div></div>`);
  return `
    <section class="panel detail-panel">
      ${state.chatError ? `<div class="notice warning"><strong>Chat error.</strong><span>${escapeHtml(state.chatError)}</span></div>` : ""}
      <section class="panel compact-panel chat-panel">
        ${windowHtml}
      </section>
      ${route ? complaintRouteBanner(route) : ""}
      ${mode === "sacco-member" && canManage && complaintCanRoute(mode) ? complaintRoutingPanel(selected, route) : ""}
      ${canCompose && canReply ? `
        <form id="chatComposerForm" class="form-grid single" data-thread-id="${escapeHtml(selected.id)}">
          <label><span>${escapeHtml(routedReply ? `Reply as ${route.assignedTo}` : complaintComposerLabel(mode))}</span><textarea id="chatComposerInput" class="chat-reply-input" placeholder="${escapeHtml(complaintComposerPlaceholder(mode))}" ${state.chatSending ? "disabled" : ""}></textarea></label>
          <div class="form-actions chat-composer-actions">
            <button class="button primary" type="submit" ${state.chatSending ? "disabled" : ""}>${state.chatSending ? "Sending..." : "Send message"}</button>
          </div>
        </form>
      ` : ""}
    </section>
  `;
}

function complaintMessageDisplayBody(body) {
  let text = String(body || "");
  const category = text.match(/^\s*Category:\s*(.+)\s*$/im)?.[1];
  const priority = text.match(/^\s*Priority:\s*(.+)\s*$/im)?.[1];
  const response = text.match(/^\s*Primary response:\s*(.+)\s*$/im)?.[1];
  if (category || priority || response) {
    text = text
      .replace(/^\s*Category:\s*.+\s*$/gim, "")
      .replace(/^\s*Priority:\s*.+\s*$/gim, "")
      .replace(/^\s*Primary response:\s*.+\s*$/gim, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    text = `${text}\n\nC: ${category || "-"} | P: ${priority || "-"} | R: ${response || "-"}`.trim();
  }
  return text;
}

function complaintRoutingPanel(selected, route = null) {
  const options = complaintRoutingOptions();
  return `
    <section class="complaint-routing-inline">
      <div>
        <strong>Route this complaint</strong>
        <span>${route ? `Currently routed to ${route.assignedTo}.` : "The Secretary is the primary responder until a route is posted."} Routing is posted into the same chat so the full case history remains visible.</span>
      </div>
      <form id="chatRoutingForm" class="complaint-routing-form" data-thread-id="${escapeHtml(selected.id)}">
        <label><span>Route to</span><select id="chatRoutingTarget">${options.map((option) => `<option value="${escapeHtml(option)}">${escapeHtml(option)}</option>`).join("")}</select></label>
        <label><span>Routing note</span><input id="chatRoutingReason" placeholder="Reason or next action"></label>
        <button class="button secondary" type="submit" ${state.chatSending ? "disabled" : ""}>Post routing update</button>
      </form>
    </section>
  `;
}

function complaintRouteBanner(route) {
  return `
    <section class="complaint-route-banner">
      <strong>Routed to ${escapeHtml(route.assignedTo)}</strong>
      <span>${escapeHtml(route.note || "The routed officer is responsible for the next reply. Other users can follow the thread history.")}</span>
    </section>
  `;
}

function complaintRouteAssignment(threadId) {
  const messages = state.chatMessages?.[threadId] || [];
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const body = String(messages[index]?.body || "");
    if (!body.toLowerCase().includes("routing update")) continue;
    const assignedTo = (body.match(/Assigned to:\s*(.+)/i)?.[1] || "").split(/\r?\n/)[0].trim();
    const note = (body.match(/Note:\s*(.+)/i)?.[1] || "").split(/\r?\n/)[0].trim();
    if (assignedTo) return { assignedTo, note, message: messages[index] };
  }
  return null;
}

function complaintCanReply(selected, mode, route) {
  if (state.auth === "member" || mode === "member-support") return true;
  if (isPlatform() || mode === "platform-super" || mode === "sacco-platform") return true;
  if (!route) return true;
  if (!hasPermission("complaints:manage") && hasPermission("complaints:view")) return true;
  return complaintRouteMatchesCurrentRole(route.assignedTo);
}

function complaintCanRoute(mode) {
  return mode === "sacco-member" && ["secretary", "admin"].includes(roleKind());
}

function complaintRouteMatchesCurrentRole(assignedTo) {
  const target = complaintNormalizeRoleText(assignedTo);
  const roles = complaintNormalizeRoleText([
    ...(state.roleNames || []),
    state.user?.role,
    state.user?.roleName,
    state.user?.title,
    state.user?.fullName,
    state.user?.name,
    state.user?.username,
    state.user?.email
  ].filter(Boolean).join(" "));
  const kind = roleKind();
  if (target.includes("secretary")) return kind === "secretary" || roles.includes("secretary");
  if (target.includes("treasurer")) return kind === "treasurer" || roles.includes("treasurer");
  if (target.includes("chairperson") || target.includes("chairman") || target.includes("chair")) return kind === "chairperson" || roles.includes("chairperson") || roles.includes("chairman") || roles.includes("chair");
  if (target.includes("administrator") || target.includes("admin")) return kind === "admin" || roles.includes("administrator");
  if (target.includes("loan")) return kind === "loans" || roles.includes("loan");
  if (target.includes("welfare")) return roles.includes("welfare") || kind === "admin";
  if (target.includes("governance")) return kind === "secretary" || kind === "chairperson" || roles.includes("governance");
  if (target.includes("platform")) return isPlatform() || kind === "admin";
  return roles.includes(target);
}

function complaintNormalizeRoleText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function complaintRoutingOptions() {
  return [
    "Secretary",
    "Treasurer",
    "Chairperson / Chairman",
    "SACCO Administrator",
    "Loans Officer",
    "Welfare Officer",
    "Governance Committee",
    "Platform Support"
  ];
}

function complaintComposerLabel(mode) {
  if (mode === "platform-super") return "Reply to SACCO admin";
  if (mode === "sacco-platform") return "Message to Platform Super Admin";
  if (mode === "member-support") return "Message to SACCO admin";
  return "Reply to member";
}

function complaintComposerPlaceholder(mode) {
  if (mode === "platform-super") return "Type the platform response, next step or support instruction...";
  if (mode === "sacco-platform") return "Describe the system, billing or support issue clearly...";
  if (mode === "member-support") return "Type your message to the SACCO office...";
  return "Type the SACCO response or next follow-up for the member...";
}

function chatApiBase() {
  return state.auth === "member" ? "/member-auth/chat" : "/chat";
}

/**
 * @param {string} threadId
 * @returns {TerekaComplaintThread | undefined}
 */
function chatThreadById(threadId) {
  const collection = state.auth === "member" ? (state.memberData.chatThreads || []) : (dataRows("chatThreads") || []);
  return collection.find((thread) => thread.id === threadId);
}

/**
 * @param {string} threadId
 * @param {{ markRead?: boolean }} [options]
 * @returns {Promise<void>}
 */
async function loadChatMessages(threadId, { markRead = true } = {}) {
  if (!threadId) return;
  const base = chatApiBase();
  try {
    const messages = await api(`${base}/threads/${encodeURIComponent(threadId)}/messages`);
    state.chatMessages[threadId] = Array.isArray(messages) ? messages : [];
    if (markRead) {
      await api(`${base}/threads/${encodeURIComponent(threadId)}/read`, { method: "POST" }).catch(() => {});
      const thread = chatThreadById(threadId);
      if (thread) thread.unreadCount = 0;
    }
  } catch (error) {
    state.chatMessages[threadId] = state.chatMessages[threadId] || [];
    state.chatError = error.message || "Unable to load messages.";
  }
  renderShell();
}

function selectChatThread(threadId) {
  state.selectedComplaintId = threadId;
  state.chatError = "";
  state.selectedComplaintMessage = "";
  renderShell();
  loadChatMessages(threadId);
}

/**
 * @returns {Promise<void>}
 */
async function refreshChatThreads() {
  const base = chatApiBase();
  const threads = await optionalApi(`${base}/threads`, []);
  if (state.auth === "member") state.memberData.chatThreads = threads;
  else state.data.chatThreads = threads;
}

/**
 * @param {string} threadId
 * @returns {Promise<void>}
 */
async function sendChatMessage(threadId) {
  const input = document.querySelector("#chatComposerInput");
  const text = input ? input.value.trim() : "";
  if (!text || state.chatSending) return;
  state.chatSending = true;
  state.chatError = "";
  renderShell();
  const base = chatApiBase();
  try {
    const message = await api(`${base}/threads/${encodeURIComponent(threadId)}/messages`, {
      method: "POST",
      body: JSON.stringify({ body: text })
    });
    const list = state.chatMessages[threadId] || [];
    list.push(message);
    state.chatMessages[threadId] = list;
    await refreshChatThreads();
  } catch (error) {
    state.chatError = error.message || "Unable to send message.";
  }
  state.chatSending = false;
  renderShell();
}

async function routeChatThread(event) {
  if (event?.preventDefault) event.preventDefault();
  const threadId = event?.currentTarget?.dataset?.threadId || "";
  const target = value("chatRoutingTarget") || "Secretary";
  const reason = value("chatRoutingReason").trim();
  if (!threadId || state.chatSending) return;
  const note = [
    "Routing update",
    `Assigned to: ${target}`,
    `Action by: ${typeof roleLabel === "function" ? roleLabel() : "SACCO staff"}`,
    reason ? `Note: ${reason}` : "Note: Please review and respond in this same complaint chat.",
    "The Secretary remains the primary response person until the complaint is closed."
  ].join("\n");
  state.chatSending = true;
  state.chatError = "";
  renderShell();
  try {
    const message = await api(`/chat/threads/${encodeURIComponent(threadId)}/messages`, {
      method: "POST",
      body: JSON.stringify({ body: note })
    });
    const list = state.chatMessages[threadId] || [];
    list.push(message);
    state.chatMessages[threadId] = list;
    await refreshChatThreads();
  } catch (error) {
    state.chatError = error.message || "Unable to route complaint.";
  }
  state.chatSending = false;
  renderShell();
}

function maybeAutoLoadChatMessages() {
  if (state.currentView !== "complaints") return;
  const threads = state.auth === "member" ? (state.memberData.chatThreads || []) : (dataRows("chatThreads") || []);
  if (!threads.length) return;
  const selectedId = state.selectedComplaintId && threads.some((thread) => thread.id === state.selectedComplaintId)
    ? state.selectedComplaintId
    : threads[0].id;
  if (state.chatMessages[selectedId] === undefined) {
    loadChatMessages(selectedId);
  }
}

function startChatPolling() {
  if (state.chatPollTimer || typeof setInterval !== "function") return;
  state.chatPollTimer = setInterval(pollChatThread, 12000);
}

async function pollChatThread() {
  if (typeof document !== "undefined" && document.hidden) return;
  if (state.auth === "none" || !state.networkOnline) return;
  if (state.currentView !== "complaints") return;
  const threadId = state.selectedComplaintId;
  if (!threadId || state.chatSending) return;
  const base = chatApiBase();
  try {
    const messages = await api(`${base}/threads/${encodeURIComponent(threadId)}/messages`);
    const next = Array.isArray(messages) ? messages : [];
    const current = state.chatMessages[threadId] || [];
    if (next.length !== current.length) {
      state.chatMessages[threadId] = next;
      await refreshChatThreads();
      renderShell();
    }
  } catch (error) {
    // Ignore transient polling errors; the next tick retries.
  }
}

function memberChatWorkspace() {
  const rows = buildChatThreadRows({ threads: state.memberData.chatThreads || [], tenantName, memberName });
  const composer = `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>Start a new chat</h2>
          <p>Send a new message to your SACCO admin office.</p>
        </div>
      </div>
      ${state.chatError ? `<div class="notice warning"><strong>Chat error.</strong><span>${escapeHtml(state.chatError)}</span></div>` : ""}
      <form id="memberNewChatForm" class="form-grid single">
        <label><span>Subject</span><input id="memberNewChatSubject" placeholder="What is this about?" ${state.chatSending ? "disabled" : ""}></label>
        <label><span>Message</span><textarea id="memberNewChatMessage" class="chat-reply-input" placeholder="Type your message..." ${state.chatSending ? "disabled" : ""}></textarea></label>
        <div class="form-actions chat-composer-actions">
          <button class="button primary" type="submit" ${state.chatSending ? "disabled" : ""}>${state.chatSending ? "Sending..." : "Start chat"}</button>
        </div>
      </form>
    </section>
  `;
  if (!rows.length) {
    return `${composer}${emptyState("No messages yet", "Start a conversation with your SACCO admin above.")}`;
  }
  const selected = rows.find((row) => row.id === state.selectedComplaintId) || rows[0];
  return `
    ${composer}
    <section class="chat-workspace panel">
      <div class="chat-sidebar">
        <div class="chat-sidebar-header"><strong>Support chats</strong><span>${rows.length}</span></div>
        <div class="chat-thread-list">
          ${rows.map((row) => complaintChatThreadButton(row, selected.id === row.id, "member-support")).join("")}
        </div>
      </div>
      <div class="chat-main">
        <div class="chat-main-header">
          <div>
            <h2>${escapeHtml(selected.subject || "Support chat")}</h2>
            <p>Messages with your SACCO admin office.</p>
          </div>
          <span class="status ${selected.unreadCount ? "pending" : "active"}">${selected.unreadCount ? `${selected.unreadCount} new` : labelize(selected.status || "open")}</span>
        </div>
        ${chatConversationPanel(selected, "member-support")}
      </div>
    </section>
  `;
}

async function startMemberChatThread() {
  const subject = value("memberNewChatSubject").trim();
  const message = value("memberNewChatMessage").trim();
  if (!subject || !message || state.chatSending) {
    if (!subject || !message) state.chatError = "Enter a subject and a message to start a chat.";
    renderShell();
    return;
  }
  state.chatSending = true;
  state.chatError = "";
  renderShell();
  try {
    const thread = await api("/member-auth/chat/threads", {
      method: "POST",
      body: JSON.stringify({ subject, message })
    });
    await refreshChatThreads();
    if (thread && thread.id) {
      state.selectedComplaintId = thread.id;
      state.chatMessages[thread.id] = undefined;
    }
  } catch (error) {
    state.chatError = error.message || "Unable to start chat.";
  }
  state.chatSending = false;
  renderShell();
}

function complaintServiceControlPanel(rows, open, urgent, assigned) {
  const memberLinked = rows.filter((row) => row.memberId).length;
  const unassigned = open.filter((row) => !row.assignedUserId).length;
  return rolePriorityPanel(isPlatform() ? "SACCO admin complaint control" : "Member message and reply control", [
    ["Urgent queue", `${urgent.length} urgent complaint(s) need same-day follow-up.`, urgent.length ? "Escalate" : "Clear"],
    ["Assignment coverage", `${assigned.length} complaint(s) have a named officer; ${unassigned} open case(s) are unassigned.`, unassigned ? "Assign" : "Covered"],
    [isPlatform() ? "Platform scope" : "Member impact", isPlatform() ? "Platform receives complaints from SACCO administrators only. Member complaints stay inside each SACCO portal." : `${memberLinked} complaint(s) are linked to member records for traceable resolution.`, isPlatform() ? "SACCO admins only" : memberLinked ? "Traceable" : "SACCO-level"]
  ]);
}

function complaintCapturePanel(mode = "member") {
  const canManage = hasPermission("complaints:manage");
  const tenants = tenantRows();
  const tenantId = isPlatform() ? tenants[0]?.id || "" : state.user?.tenantId || "";
  const members = dataRows("members").filter((member) => !tenantId || member.tenantId === tenantId || !isPlatform());
  const platformScope = isPlatform();
  const platformEscalation = mode === "platform-escalation";
  const memberCapture = !platformScope && !platformEscalation;
  const title = platformScope
    ? "Record SACCO admin message"
    : platformEscalation
      ? "Message Platform Super Admin"
      : "Member message intake";
  const copy = platformScope
    ? "Record a support message submitted by a SACCO administrator for platform follow-up."
    : platformEscalation
      ? "Start a platform support chat for billing, system access, integrations or operating issues."
      : "SACCO admins receive, assign and resolve complaints submitted by SACCO members.";
  const subjectPlaceholder = platformScope
    ? "SACCO admin message title"
    : platformEscalation
      ? "Platform support message title"
      : "Short member message title";
  const messagePlaceholder = platformScope
    ? "What issue has the SACCO administrator raised with the platform?"
    : platformEscalation
      ? "What should the Platform Super Admin help this SACCO resolve?"
      : "What did the member ask, and what support is expected?";
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>${title}</h2>
          <p>${copy}</p>
        </div>
      </div>
      ${state.complaintFormMessage ? `<div class="notice compact"><strong>${escapeHtml(state.complaintFormMessage)}</strong></div>` : ""}
      ${state.complaintFormError ? `<div class="notice warning"><strong>Complaint capture failed.</strong><span>${escapeHtml(state.complaintFormError)}</span></div>` : ""}
      <form id="complaintForm" class="form-grid" data-thread-type="${memberCapture ? "MEMBER_SUPPORT" : "PLATFORM_SUPPORT"}">
        <label><span>SACCO</span><select id="newComplaintTenantId" ${isPlatform() && canManage ? "" : "disabled"}>${tenants.map((tenant) => `<option value="${escapeHtml(tenant.id)}" ${tenant.id === tenantId ? "selected" : ""}>${escapeHtml(tenant.abbreviation || tenant.code || tenant.name)} - ${escapeHtml(tenant.name || tenant.id)}</option>`).join("")}</select></label>
        ${memberCapture ? `<label><span>Member</span><select id="newComplaintMemberId" ${canManage ? "" : "disabled"}><option value="">SACCO-level case</option>${members.map((member) => `<option value="${escapeHtml(member.id)}">${escapeHtml(member.membershipNo)} - ${escapeHtml(member.fullName)}</option>`).join("")}</select></label>` : `<input type="hidden" id="newComplaintMemberId" value="">`}
        <label><span>Category</span><select id="newComplaintCategory" ${canManage ? "" : "disabled"}>${complaintCategoryOptions().map((item) => `<option value="${escapeHtml(item.value)}">${escapeHtml(item.label)}</option>`).join("")}</select></label>
        <label><span>Priority</span><select id="newComplaintPriority" ${canManage ? "" : "disabled"}><option value="medium">Medium</option><option value="high">High</option><option value="low">Low</option></select></label>
        <label><span>Channel</span><select id="newComplaintChannel" ${canManage ? "" : "disabled"}><option value="branch">Branch</option><option value="phone">Phone</option><option value="email">Email</option><option value="web">Web</option><option value="mobile">Mobile</option></select></label>
        <label><span>Subject</span><input id="newComplaintSubject" required placeholder="${subjectPlaceholder}" ${canManage ? "" : "disabled"}></label>
        <label class="wide"><span>Message</span><textarea id="newComplaintDescription" placeholder="${messagePlaceholder}" ${canManage ? "" : "disabled"}></textarea></label>
        <div class="form-actions inline">${canManage ? `<button class="button primary" type="submit">${platformEscalation ? "Send to Platform Super Admin" : platformScope ? "Record SACCO admin message" : "Capture member message"}</button>` : `<span class="status pending">View only</span>`}</div>
      </form>
    </section>
  `;
}

function complaintDetailPanel(rows, mode = "sacco-member") {
  const complaint = rows.find((item) => item.id === state.selectedComplaintId);
  const selected = complaint || rows[0];
  if (!selected) return "";
  const canManage = hasPermission("complaints:manage");
  const reply = selected.resolutionNotes || selected.resolution || "";
  const participant = complaintChatParticipant(selected, mode);
  const isSaccoToPlatform = mode === "sacco-platform";
  const isPlatformReply = mode === "platform-super";
  const originalAuthor = isPlatformReply ? `${selected.tenantName || tenantName(selected.tenantId)} admin` : isSaccoToPlatform ? "SACCO admin" : (selected.memberName || "Member");
  const replyAuthor = isPlatformReply ? "Platform Super Admin" : isSaccoToPlatform ? "Platform Super Admin" : "SACCO admin";
  const originalDirection = isPlatformReply || mode === "sacco-member" ? "received" : "sent";
  const replyDirection = isPlatformReply || mode === "sacco-member" ? "sent" : "received";
  const heading = mode === "sacco-member"
    ? "SACCO admin - member chat"
    : "SACCO admin - Platform Super Admin chat";
  const replyLabel = isPlatformReply
    ? "Reply to SACCO admin"
    : isSaccoToPlatform
      ? "Platform Super Admin reply"
      : "Reply to member";
  return `
    <section class="panel detail-panel">
      <div class="panel-heading">
        <div>
          <h2>${heading}</h2>
          <p>${escapeHtml(selected.subject || selected.id)} - ${escapeHtml(participant)}</p>
        </div>
        <button class="button ghost" type="button" data-action="close-complaint-detail">Close</button>
      </div>
      ${state.selectedComplaintMessage ? `<div class="notice compact"><strong>${escapeHtml(state.selectedComplaintMessage)}</strong></div>` : ""}
      ${state.selectedComplaintError ? `<div class="notice warning"><strong>Complaint update failed.</strong><span>${escapeHtml(state.selectedComplaintError)}</span></div>` : ""}
      <div class="source-grid">
        ${mini("SACCO", selected.tenantName || selected.tenantId)}
        ${mode === "sacco-member" ? mini("Member", selected.memberName) : mini("Platform contact", "Platform Super Admin")}
        ${mini("Category", labelize(selected.category))}
        ${mini("Priority", selected.priority)}
        ${mini("Status", selected.status)}
        ${mini("Channel", selected.channel)}
        ${mini("Assigned officer", selected.assignedOfficer)}
        ${mini("Created", selected.createdAt)}
        ${mini("Last reply", reply ? selected.updatedAt : "No reply yet")}
      </div>
      <section class="panel compact-panel chat-panel">
        <div class="panel-heading">
          <div>
            <h2>Chat thread</h2>
            <p>${mode === "sacco-member" ? "Member messages and SACCO admin replies stay visible to both sides." : "SACCO admin messages and Platform Super Admin replies stay visible for follow-up."}</p>
          </div>
          <span class="status ${reply ? "active" : "pending"}">${reply ? "Replied" : "Awaiting reply"}</span>
        </div>
        <div class="chat-window">
          ${chatBubble(originalDirection, originalAuthor, selected.description || selected.subject || "No message body captured.", selected.createdAt)}
          ${reply ? chatBubble(replyDirection, replyAuthor, reply, selected.updatedAt) : chatBubble(`${replyDirection} pending`, replyAuthor, "No reply has been sent yet.", "")}
        </div>
      </section>
      <form id="complaintStatusForm" class="form-grid single">
        <input type="hidden" id="selectedComplaintId" value="${escapeHtml(selected.id)}">
        <label><span>Status</span><select id="selectedComplaintStatus" ${canManage ? "" : "disabled"}>${complaintStatusOptions().map((status) => `<option value="${escapeHtml(status.value)}" ${status.value === selected.status ? "selected" : ""}>${escapeHtml(status.label)}</option>`).join("")}</select></label>
        <label><span>${replyLabel}</span><textarea id="selectedComplaintNotes" class="chat-reply-input" placeholder="Type a reply..." ${canManage && !isSaccoToPlatform ? "" : "disabled"}>${escapeHtml(reply)}</textarea></label>
        <div class="form-actions chat-composer-actions">
          ${canManage && !isSaccoToPlatform ? `
            <button class="button primary" type="submit">${isPlatformReply ? "Send reply to SACCO admin" : "Send reply"}</button>
            <button class="button secondary" type="button" data-complaint-status="in_progress">Mark in progress</button>
            <button class="button secondary" type="button" data-complaint-status="resolved">Resolve</button>
            <button class="button ghost" type="button" data-complaint-status="closed">Close</button>
          ` : `<span class="status pending">${isSaccoToPlatform ? "Waiting for Platform Super Admin reply" : "View only"}</span>`}
        </div>
      </form>
    </section>
  `;
}
