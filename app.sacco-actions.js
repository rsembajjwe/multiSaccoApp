// SACCO operating action handlers for Tereka Online.
// Covers branches, products, accounts, welfare claims, expenses, assets and governance records.

async function createFinancialProduct(event) {
  event.preventDefault();
  const form = event.currentTarget;
  state.productFormMessage = "";
  state.productFormError = "";
  try {
    const product = await api("/financial-products", {
      method: "POST",
      body: JSON.stringify({
        tenantId: scopedValue(form, "product", "tenantId"),
        productType: scopedValue(form, "product", "productType"),
        code: scopedValue(form, "product", "code"),
        name: scopedValue(form, "product", "name"),
        contributionAmount: Number(scopedValue(form, "product", "contributionAmount")),
        minimumBalance: Number(scopedValue(form, "product", "minimumBalance")),
        interestRate: Number(scopedValue(form, "product", "interestRate"))
      })
    });
    state.productFormMessage = `Created ${labelize(product.productType)} product ${product.code}.`;
    await refreshAll();
    state.productFormMessage = `Created ${labelize(product.productType)} product ${product.code}.`;
    renderShell();
  } catch (error) {
    state.productFormError = error.message;
    renderShell();
  }
}

async function createBranchFromForm(event) {
  event.preventDefault();
  state.branchFormMessage = "";
  state.branchFormError = "";
  try {
    const branch = await api("/branches", {
      method: "POST",
      body: JSON.stringify({
        tenantId: value("newBranchTenantId"),
        code: value("newBranchCode"),
        name: value("newBranchName"),
        address: value("newBranchAddress"),
        status: value("newBranchStatus")
      })
    });
    state.branchFormMessage = `Created branch ${branch.code} - ${branch.name}.`;
    await refreshAll();
    state.branchFormMessage = `Created branch ${branch.code} - ${branch.name}.`;
    renderShell();
  } catch (error) {
    state.branchFormError = error.message;
    renderShell();
  }
}

async function openFinancialAccount(event) {
  event.preventDefault();
  const form = event.currentTarget;
  state.accountFormMessage = "";
  state.accountFormError = "";
  try {
    const account = await api("/financial-accounts", {
      method: "POST",
      body: JSON.stringify({
        tenantId: scopedValue(form, "account", "tenantId"),
        memberId: scopedValue(form, "account", "memberId"),
        productId: scopedValue(form, "account", "productId"),
        accountType: scopedValue(form, "account", "accountType"),
        accountNo: scopedValue(form, "account", "accountNo")
      })
    });
    state.accountFormMessage = `Opened account ${account.accountNo}.`;
    await refreshAll();
    state.accountFormMessage = `Opened account ${account.accountNo}.`;
    renderShell();
  } catch (error) {
    state.accountFormError = error.message;
    renderShell();
  }
}

async function submitWelfareClaim(event) {
  event.preventDefault();
  state.welfareClaimMessage = "";
  state.welfareClaimError = "";
  try {
    const claim = await api("/welfare-claims", {
      method: "POST",
      body: JSON.stringify({
        tenantId: value("newWelfareTenantId"),
        memberId: value("newWelfareMemberId"),
        claimType: value("newWelfareClaimType"),
        amount: Number(value("newWelfareAmount")),
        reference: value("newWelfareReference"),
        description: value("newWelfareDescription")
      })
    });
    state.welfareClaimMessage = `Submitted welfare claim ${claim.reference}.`;
    state.selectedWelfareClaimId = claim.id;
    await refreshAll();
    state.selectedWelfareClaimId = claim.id;
    state.welfareClaimMessage = `Submitted welfare claim ${claim.reference}.`;
    renderShell();
  } catch (error) {
    state.welfareClaimError = error.message;
    renderShell();
  }
}

function openWelfareClaimDetail(claimId) {
  state.selectedWelfareClaimId = claimId;
  state.moduleTabs.welfare = "detail";
  state.selectedWelfareClaimMessage = "";
  state.selectedWelfareClaimError = "";
  renderShell();
}

async function runWelfareClaimAction(action) {
  const claimId = value("selectedWelfareClaimId") || state.selectedWelfareClaimId;
  if (!claimId) return;
  state.selectedWelfareClaimMessage = "";
  state.selectedWelfareClaimError = "";
  try {
    let claim;
    if (action === "pay") {
      claim = await api(`/welfare-claims/${encodeURIComponent(claimId)}/payment`, {
        method: "POST",
        body: JSON.stringify({ channel: value("welfarePaymentChannel") || "cash" })
      });
      state.selectedWelfareClaimMessage = `Paid welfare claim ${claim.reference}.`;
    } else {
      const status = action === "approve" ? "approved" : "rejected";
      claim = await api(`/welfare-claims/${encodeURIComponent(claimId)}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status, reason: value("welfareClaimReason") || "Reviewed in Tereka Online" })
      });
      state.selectedWelfareClaimMessage = `Welfare claim ${claim.reference} ${status}.`;
    }
    const message = state.selectedWelfareClaimMessage;
    await refreshAll();
    state.selectedWelfareClaimId = claim.id;
    state.selectedWelfareClaimMessage = message;
    renderShell();
  } catch (error) {
    state.selectedWelfareClaimError = error.message;
    renderShell();
  }
}

function scopedValue(form, group, field) {
  return form.querySelector(`[data-${group}-field='${field}']`)?.value || "";
}

async function postExpense(event) {
  event.preventDefault();
  state.expenseFormMessage = "";
  state.expenseFormError = "";
  try {
    const expense = await api("/expenses", {
      method: "POST",
      body: JSON.stringify({
        tenantId: value("newExpenseTenantId"),
        accountCode: value("newExpenseAccountCode"),
        amount: Number(value("newExpenseAmount")),
        channel: value("newExpenseChannel"),
        reference: value("newExpenseReference"),
        description: value("newExpenseDescription"),
        expenseDate: value("newExpenseDate")
      })
    });
    state.expenseFormMessage = `Posted expense ${expense.reference}.`;
    await refreshAll();
    state.expenseFormMessage = `Posted expense ${expense.reference}.`;
    renderShell();
  } catch (error) {
    state.expenseFormError = error.message;
    renderShell();
  }
}

async function registerAsset(event) {
  event.preventDefault();
  state.assetFormMessage = "";
  state.assetFormError = "";
  try {
    const asset = await api("/assets", {
      method: "POST",
      body: JSON.stringify({
        tenantId: value("newAssetTenantId"),
        name: value("newAssetName"),
        category: value("newAssetCategory"),
        assetAccountCode: value("newAssetAccountCode"),
        cost: Number(value("newAssetCost")),
        salvageValue: Number(value("newAssetSalvageValue")),
        usefulLifeMonths: Number(value("newAssetLifeMonths")),
        purchaseDate: value("newAssetPurchaseDate"),
        depreciationStartDate: value("newAssetPurchaseDate"),
        channel: value("newAssetChannel"),
        reference: value("newAssetReference"),
        location: value("newAssetLocation")
      })
    });
    state.assetFormMessage = `Registered asset ${asset.reference}.`;
    await refreshAll();
    state.assetFormMessage = `Registered asset ${asset.reference}.`;
    renderShell();
  } catch (error) {
    state.assetFormError = error.message;
    renderShell();
  }
}

async function createGovernanceMeeting(event) {
  event.preventDefault();
  syncRichTextEditorValue("newMeetingMinutes");
  const chairMemberId = resolveGovernanceChairpersonMemberId(true, "newMeetingChairSearch", "newMeetingChairUserId");
  state.governanceMeetingMessage = "";
  state.governanceMeetingError = "";
  if (!chairMemberId) {
    state.governanceMeetingError = "Search and select the chairperson from the SACCO member list.";
    renderShell();
    return;
  }
  try {
    const meeting = await api("/governance-meetings", {
      method: "POST",
      body: JSON.stringify({
        tenantId: value("newMeetingTenantId"),
        title: value("newMeetingTitle"),
        meetingType: value("newMeetingType"),
        scheduledAt: new Date(value("newMeetingScheduledAt")).toISOString(),
        chairMemberId,
        status: value("newMeetingStatus"),
        minutes: value("newMeetingMinutes")
      })
    });
    state.governanceMeetingMessage = `Created governance meeting ${meeting.title}.`;
    state.selectedMeetingId = meeting.id;
    state.moduleTabs.governance = "detail";
    await refreshAll();
    state.selectedMeetingId = meeting.id;
    state.moduleTabs.governance = "detail";
    state.governanceMeetingMessage = `Created governance meeting ${meeting.title}.`;
    renderShell();
  } catch (error) {
    state.governanceMeetingError = error.message;
    renderShell();
  }
}

async function updateGovernanceMeeting(event) {
  event.preventDefault();
  syncRichTextEditorValue("selectedMeetingMinutes");
  const meetingId = value("selectedMeetingUpdateId") || state.selectedMeetingId;
  const chairMemberId = resolveGovernanceChairpersonMemberId(true, "selectedMeetingChairSearch", "selectedMeetingChairMemberId");
  if (!meetingId) return;
  state.selectedMeetingMessage = "";
  state.selectedMeetingError = "";
  if (!chairMemberId) {
    state.selectedMeetingError = "Search and select the chairperson from the SACCO member list.";
    renderShell();
    return;
  }
  try {
    const meeting = await api(`/governance-meetings/${encodeURIComponent(meetingId)}`, {
      method: "PATCH",
      body: JSON.stringify({
        title: value("selectedMeetingTitle"),
        meetingType: value("selectedMeetingType"),
        scheduledAt: new Date(value("selectedMeetingScheduledAt")).toISOString(),
        chairMemberId,
        status: value("selectedMeetingStatus"),
        minutes: value("selectedMeetingMinutes")
      })
    });
    state.selectedMeetingMessage = `Saved meeting setup ${meeting.title}.`;
    const message = state.selectedMeetingMessage;
    await refreshAll();
    state.selectedMeetingId = meeting.id;
    state.selectedMeetingMessage = message;
    state.moduleTabs.governance = "detail";
    renderShell();
  } catch (error) {
    state.selectedMeetingError = error.message;
    renderShell();
  }
}

function openGovernanceMeetingDetail(meetingId) {
  state.selectedMeetingId = meetingId;
  state.currentView = "governance";
  state.moduleTabs.governance = "detail";
  state.selectedMeetingMessage = "";
  state.selectedMeetingError = "";
  renderShell();
}

async function createGovernanceResolution(event) {
  event.preventDefault();
  syncRichTextEditorValue("newResolutionDecision");
  const meetingId = value("selectedMeetingId") || state.selectedMeetingId;
  if (!meetingId) return;
  state.selectedMeetingMessage = "";
  state.selectedMeetingError = "";
  if (!value("newResolutionOwnerName")) {
    state.selectedMeetingError = "Enter the responsible person for this resolution.";
    renderShell();
    return;
  }
  try {
    const resolution = await api(`/governance-meetings/${encodeURIComponent(meetingId)}/resolutions`, {
      method: "POST",
      body: JSON.stringify({
        title: value("newResolutionTitle"),
        decision: value("newResolutionDecision"),
        ownerName: value("newResolutionOwnerName"),
        ownerTitle: value("newResolutionOwnerTitle") || "Responsible person",
        dueDate: value("newResolutionDueDate") || null,
        status: value("newResolutionStatus")
      })
    });
    state.selectedMeetingMessage = `Recorded resolution ${resolution.title}.`;
    const message = state.selectedMeetingMessage;
    await refreshAll();
    state.selectedMeetingId = meetingId;
    state.selectedMeetingMessage = message;
    renderShell();
  } catch (error) {
    state.selectedMeetingError = error.message;
    renderShell();
  }
}

function exportGovernanceMeetingPdf() {
  const meetingId = value("selectedMeetingId") || value("selectedMeetingUpdateId") || state.selectedMeetingId;
  const meeting = buildGovernanceMeetingRows({ meetings: dataRows("governanceMeetings"), memberName, userName })
    .find((row) => row.id === meetingId);
  if (!meeting) {
    state.selectedMeetingError = "Select a governance meeting before exporting.";
    renderShell();
    return;
  }
  const rows = buildMeetingResolutionRows(meeting, { memberName, memberTitle: governanceMemberTitle, userName });
  const pdf = createGovernanceMeetingPdfDocument(meeting, rows);
  downloadClientFile(governanceMeetingPdfFilename(meeting), pdf, "application/pdf");
  state.selectedMeetingMessage = "Governance meeting PDF downloaded.";
  renderShell();
}

function governanceMeetingPdfFilename(meeting) {
  const name = safeExportName(`${contextName()}-${meeting.title || "governance-meeting"}`);
  return `governance-meeting-${name}-${new Date().toISOString().slice(0, 10)}.pdf`;
}

function createGovernanceMeetingPdfDocument(meeting, resolutions) {
  const pageWidth = 595;
  const pageHeight = 842;
  const margin = 32;
  const usableWidth = pageWidth - margin * 2;
  const lineHeight = 12;
  const footerTop = 54;
  const pages = [];
  let stream = "";
  let y = 0;
  const startPage = () => {
    if (stream) pages.push(stream);
    stream = "";
    stream += `0.06 0.29 0.24 rg ${margin} 792 ${usableWidth} 28 re f\n`;
    stream += pdfText(margin + 8, 803, contextName(), pdfHeaderTitleSize(contextName()), true, usableWidth - 16, [1, 1, 1], "center");
    stream += pdfText(margin, 773, "Powered by Tereka Online", 8, true, usableWidth, [0.06, 0.29, 0.24], "center");
    stream += pdfText(margin, 760, `Governance Meeting Record | Generated ${formatDateTime(new Date().toISOString())}`, 8, false, usableWidth, [0.08, 0.18, 0.15], "center");
    y = 742;
  };
  const ensureSpace = (height) => {
    if (y - height < footerTop) startPage();
  };
  const section = (title) => {
    ensureSpace(24);
    stream += `0.88 0.97 0.93 rg ${margin} ${y - 5} ${usableWidth} 18 re f\n`;
    stream += pdfText(margin + 6, y, title, 9, true, usableWidth - 12, [0.06, 0.29, 0.24]);
    y -= 24;
  };
  const textBlock = (label, value, width = usableWidth - 132) => {
    const lines = pdfWrapText(stripExportHtml(value || "-"), width, 8).map((text) => ({ text, indent: 0 }));
    writeLabeledLines(label, lines, width);
  };
  const richTextBlock = (label, value, width = usableWidth - 132) => {
    writeLabeledLines(label, richTextPdfLines(value || "-", width, 8), width);
  };
  const writeLabeledLines = (label, lines, width) => {
    ensureSpace(18);
    stream += pdfText(margin + 4, y, label, 8, true, 130, [0.06, 0.13, 0.11]);
    let currentLabel = label;
    lines.forEach((line, index) => {
      if (index > 0) ensureSpace(lineHeight);
      if (index > 0 && currentLabel) {
        currentLabel = "";
      }
      const indent = Number(line.indent || 0);
      stream += pdfText(margin + 132 + indent, y, line.text, 8, Boolean(line.bold), Math.max(80, width - indent), [0.06, 0.13, 0.11]);
      y -= lineHeight;
    });
    y -= 4;
  };
  startPage();
  section("Meeting setup");
  textBlock("Title", meeting.title);
  textBlock("Meeting type", labelize(meeting.meetingType || ""));
  textBlock("Scheduled", meeting.scheduledAt);
  textBlock("Chairperson", meeting.chairName);
  textBlock("Status", labelize(meeting.status || ""));
  richTextBlock("Minutes / agenda", meeting.minutes, usableWidth - 132);
  section("Resolutions");
  if (!resolutions.length) {
    textBlock("Resolution list", "No resolutions recorded for this meeting.");
  } else {
    resolutions.forEach((resolution, index) => {
      textBlock(`Resolution ${index + 1}`, resolution.title);
      textBlock("Responsible", `${resolution.ownerName || "Unassigned"} (${resolution.ownerTitle || "Member"})`);
      textBlock("Due date", resolution.dueDate || "-");
      textBlock("Status", labelize(resolution.status || "open"));
      richTextBlock("Decision", resolution.decision || "-");
      y -= 4;
    });
  }
  if (stream) pages.push(stream);
  const pageStreams = pages.map((pageStream, index) => {
    let footer = pageStream;
    footer += `0.82 0.89 0.86 RG ${margin} 42 ${usableWidth} 0.5 re S\n`;
    footer += pdfText(margin, 28, "Confidential SACCO governance record", 7, false, usableWidth / 2, [0.26, 0.34, 0.31]);
    footer += pdfText(pageWidth - 180, 28, `Page ${index + 1} of ${pages.length}`, 7, false, 150, [0.26, 0.34, 0.31], "right");
    return footer;
  });
  return buildPdfDocument(pageStreams, pageWidth, pageHeight);
}

function stripExportHtml(value) {
  return String(value || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<li>/gi, "- ")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+\n/g, "\n")
    .replace(/\n\s+/g, "\n")
    .replace(/[ \t]+/g, " ")
    .trim();
}

function richTextPdfLines(value, maxWidth, size) {
  if (typeof document === "undefined") {
    return pdfWrapText(stripExportHtml(value || "-"), maxWidth, size).map((text) => ({ text, indent: 0 }));
  }
  const container = document.createElement("div");
  container.innerHTML = String(value || "");
  const lines = [];
  const pushWrapped = (text, level = 0, prefix = "", bold = false) => {
    const clean = String(text || "").replace(/\s+/g, " ").trim();
    if (!clean && !prefix) return;
    const indent = Math.min(72, Math.max(0, level) * 16);
    const availableWidth = Math.max(80, maxWidth - indent);
    const wrapped = pdfWrapText(`${prefix}${clean || "-"}`, availableWidth, size);
    wrapped.forEach((line, index) => {
      lines.push({ text: line, indent: indent + (index > 0 && prefix ? 10 : 0), bold });
    });
  };
  const listItemText = (item) => {
    const clone = /** @type {HTMLElement} */ (item.cloneNode(true));
    clone.querySelectorAll("ul,ol").forEach((list) => list.remove());
    return clone.textContent || "";
  };
  const visitList = (list, level = 0) => {
    const ordered = list.tagName === "OL";
    let number = 1;
    Array.from(list.children).forEach((item) => {
      if (item.tagName !== "LI") return;
      const prefix = ordered ? `${number}. ` : "- ";
      pushWrapped(listItemText(item), level, prefix);
      number += 1;
      Array.from(item.children)
        .filter((child) => ["UL", "OL"].includes(child.tagName))
        .forEach((childList) => visitList(childList, level + 1));
    });
  };
  const visitNode = (node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      pushWrapped(node.textContent || "", 0);
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const element = /** @type {HTMLElement} */ (node);
    if (["UL", "OL"].includes(element.tagName)) {
      visitList(element, 0);
      return;
    }
    if (["P", "DIV", "BLOCKQUOTE", "H1", "H2", "H3"].includes(element.tagName)) {
      const clone = /** @type {HTMLElement} */ (element.cloneNode(true));
      clone.querySelectorAll("ul,ol").forEach((list) => list.remove());
      pushWrapped(clone.textContent || "", element.tagName === "BLOCKQUOTE" ? 1 : 0, "", ["H1", "H2", "H3"].includes(element.tagName));
      Array.from(element.children)
        .filter((child) => ["UL", "OL"].includes(child.tagName))
        .forEach((childList) => visitList(childList, 0));
      return;
    }
    Array.from(element.childNodes).forEach(visitNode);
  };
  Array.from(container.childNodes).forEach(visitNode);
  return lines.length ? lines : [{ text: "-", indent: 0 }];
}

function pdfWrapText(value, maxWidth, size) {
  const maxChars = Math.max(14, Math.floor(maxWidth / (size * 0.48)));
  const paragraphs = String(value || "-").split(/\n+/);
  const lines = [];
  paragraphs.forEach((paragraph) => {
    const words = paragraph.trim().split(/\s+/).filter(Boolean);
    let line = "";
    words.forEach((word) => {
      const next = line ? `${line} ${word}` : word;
      if (next.length > maxChars) {
        if (line) lines.push(line);
        line = word.length > maxChars ? `${word.slice(0, maxChars - 1)}.` : word;
      } else {
        line = next;
      }
    });
    if (line) lines.push(line);
  });
  return lines.length ? lines : ["-"];
}
