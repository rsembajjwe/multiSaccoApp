function complaintsView() {
  const rows = chatThreadRows();
  const complaintSummary = buildComplaintSummary(rows);
  if (isPlatform()) {
    const tabs = [["chat", "SACCO admin chat"], ["capture", "Record SACCO message"], ["list", "Case list"]];
    const tab = activeModuleTab("complaints", tabs);
    return `
      <div class="dashboard-grid">
        ${summary(t("complaintsFromSaccoAdmins"), complaintSummary.open, "Open platform support cases", t("review"))}
        ${summary(t("urgentComplaints"), complaintSummary.urgent, "Needs same-day action", "Escalate")}
        ${summary(t("inProgress"), complaintSummary.inProgress, "Being handled", "Track")}
        ${summary(t("resolved"), complaintSummary.resolved, "Closed support cases", t("review"))}
      </div>
      ${moduleTabs("complaints", tabs, tab)}
      ${tab === "chat" ? complaintChatWorkspace("SACCO admin - Platform Super Admin chat", "WhatsApp-style support threads from SACCO administrators to the platform owner.", rows.filter((row) => row.type === "PLATFORM_SUPPORT"), "platform-super") : ""}
      ${tab === "capture" ? complaintCapturePanel("platform") : ""}
      ${tab === "list" ? `
        ${filterToolbar("Search threads by SACCO, subject or status", "Export", "Assign")}
        ${recordTable(t("complaintsFromSaccoAdmins"), rows.filter((row) => row.type === "PLATFORM_SUPPORT"), ["tenantName", "subject", "status", "lastMessagePreview", "updatedAt"])}
      ` : ""}
    `;
  }
  const memberRows = rows.filter((row) => row.type === "MEMBER_SUPPORT");
  const platformRows = rows.filter((row) => row.type === "PLATFORM_SUPPORT");
  const tabs = [["member-chat", "Member chat"], ["platform-chat", "Platform Super Admin chat"], ["capture-member", "New member message"], ["capture-platform", "Message platform"], ["list", "All messages"]];
  const tab = activeModuleTab("complaints", tabs);
  return `
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
      ${recordTable("Support threads", rows, ["memberName", "type", "subject", "status", "lastMessagePreview", "updatedAt"])}
    ` : ""}
  `;
}

function complaintChatWorkspace(title, copy, rows, mode) {
  const visibleRows = filterChatThreadRows(rows, state.chatFilters[mode] || "");
  if (!rows.length) {
    return emptyState(title, mode === "sacco-platform"
      ? "Start a platform message when the SACCO needs help from the Platform Super Admin."
      : "No chat threads are available yet.");
  }
  const selected = visibleRows.find((row) => row.id === state.selectedComplaintId) || visibleRows[0];
  return `
    <section class="chat-workspace panel">
      <div class="chat-sidebar">
        <div class="chat-sidebar-header">
          <strong>${escapeHtml(title)}</strong>
          <span>${visibleRows.length} of ${rows.length}</span>
        </div>
        <div class="chat-search-row">
          <input data-chat-search="${escapeHtml(mode)}" value="${escapeHtml(state.chatFilters[mode] || "")}" placeholder="Search chats">
        </div>
        ${visibleRows.length ? `<div class="chat-thread-list">
          ${visibleRows.map((row) => complaintChatThreadButton(row, selected.id === row.id, mode)).join("")}
        </div>` : `<div class="empty-state compact"><strong>No matching chats</strong><span>Clear the search to show all conversations.</span></div>`}
      </div>
      <div class="chat-main">
        ${selected ? `
          <div class="chat-main-header">
            <div>
              <h2>${escapeHtml(selected.subject || title)}</h2>
              <p>${escapeHtml(copy)}</p>
            </div>
            <span class="status ${selected.unreadCount ? "pending" : "active"}">${selected.unreadCount ? `${selected.unreadCount} new` : labelize(selected.status || "open")}</span>
          </div>
          ${chatConversationPanel(selected, mode)}
        ` : emptyState("No matching chats", "Clear the search to select a conversation.")}
      </div>
    </section>
  `;
}

function complaintChatThreadButton(row, selected, mode) {
  const participant = complaintChatParticipant(row, mode);
  const latest = row.lastMessagePreview || row.subject || "No messages yet.";
  return `
    <button class="chat-thread-button ${selected ? "active" : ""}" type="button" data-chat-complaint-id="${escapeHtml(row.id)}">
      <span class="chat-avatar">${escapeHtml(chatInitials(participant))}</span>
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

function chatInitials(text) {
  return chatInitialsFor(text);
}

function chatThreadRows(source) {
  const threads = source || dataRows("chatThreads") || [];
  return buildChatThreadRows({ threads, tenantName, memberName });
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
  const windowHtml = messages === undefined
    ? `<div class="chat-window"><div class="empty-state compact"><strong>Loading messages...</strong></div></div>`
    : (messages.length
        ? `<div class="chat-window">${messages.map((message) => chatBubble(
            message.senderType === viewerOutbound ? "sent" : "received",
            message.senderName || labelize(message.senderType),
            message.body,
            message.createdAt)).join("")}</div>`
        : `<div class="chat-window"><div class="empty-state compact"><strong>No messages yet</strong><span>Start the conversation below.</span></div></div>`);
  return `
    <section class="panel detail-panel">
      <div class="panel-heading">
        <div>
          <h2>${escapeHtml(heading)}</h2>
          <p>${escapeHtml(selected.subject || selected.id)} - ${escapeHtml(participant)}</p>
        </div>
        <span class="status ${selected.unreadCount ? "pending" : "active"}">${selected.unreadCount ? `${selected.unreadCount} new` : labelize(selected.status || "open")}</span>
      </div>
      ${state.chatError ? `<div class="notice warning"><strong>Chat error.</strong><span>${escapeHtml(state.chatError)}</span></div>` : ""}
      <div class="source-grid">
        ${mini("SACCO", selected.tenantName || selected.tenantId)}
        ${memberView ? mini("Support desk", "SACCO admin office") : (mode === "sacco-member" ? mini("Member", selected.memberName || "Member") : mini("Platform contact", "Platform Super Admin"))}
        ${mini("Status", labelize(selected.status || "open"))}
        ${mini("Last activity", selected.updatedAt ? formatDateTime(selected.updatedAt) : "-")}
      </div>
      <section class="panel compact-panel chat-panel">
        ${windowHtml}
      </section>
      ${canManage ? `
        <form id="chatComposerForm" class="form-grid single" data-thread-id="${escapeHtml(selected.id)}">
          <label><span>Message</span><textarea id="chatComposerInput" class="chat-reply-input" placeholder="Type a message..." ${state.chatSending ? "disabled" : ""}></textarea></label>
          <div class="form-actions chat-composer-actions">
            <button class="button primary" type="submit" ${state.chatSending ? "disabled" : ""}>${state.chatSending ? "Sending..." : "Send message"}</button>
          </div>
        </form>
      ` : `<div class="chat-composer-actions"><span class="status pending">View only</span></div>`}
    </section>
  `;
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
  const rows = chatThreadRows(state.memberData.chatThreads);
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

