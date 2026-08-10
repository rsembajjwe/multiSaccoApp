// Login and public authentication panels for Tereka Online.
// Loaded before app.js as a classic browser script.

const demoAccounts = [
  { label: "Platform Super Admin", code: "PLATFORM", username: "admin@platform.local", password: "Admin@12345", portal: "Platform" },
  { label: "Platform Operations", code: "PLATFORM", username: "operations@platform.local", password: "Operations@12345", portal: "Platform" },
  { label: "Platform Billing", code: "PLATFORM", username: "billing@platform.local", password: "Billing@12345", portal: "Platform" },
  { label: "Platform Compliance", code: "PLATFORM", username: "compliance@platform.local", password: "Compliance@12345", portal: "Platform" },
  { label: "Platform Support", code: "PLATFORM", username: "support@platform.local", password: "Support@12345", portal: "Platform" },
  { label: "SACCO Admin", code: "GVS", username: "admin@greenvalley.local", password: "Sacco@12345", portal: "SACCO" },
  { label: "Treasurer", code: "GVS", username: "treasurer@greenvalley.local", password: "Treasurer@12345", portal: "SACCO" },
  { label: "Secretary", code: "GVS", username: "secretary@greenvalley.local", password: "Secretary@12345", portal: "SACCO" },
  { label: "Chairperson", code: "GVS", username: "chairperson@greenvalley.local", password: "Chair@12345", portal: "SACCO" },
  { label: "Member", code: "GVS", username: "GVS-0001", password: "Member@12345", portal: "Member" }
];

function renderLogin() {
  document.body.className = "login-page";
  setHtml(`
    <a class="skip-link" href="#login-main">Skip to login form</a>
    <main class="login-layout" id="login-main" tabindex="-1">
      <section class="login-hero">
        <div class="login-hero-top">
          <div class="logo-lockup">
            ${logo("large")}
            <div>
              <p class="eyebrow">Tereka Online</p>
              <h1>${t("loginHeroTitle")}</h1>
            </div>
          </div>
          <div class="login-locale-row">
            <label class="sr-only" for="loginLocale">Language</label>
            <select id="loginLocale" class="locale-select" aria-label="Language">
              ${supportedLocales.map((locale) => `<option value="${escapeHtml(locale.code)}" ${locale.code === state.locale ? "selected" : ""}>${escapeHtml(locale.label)}</option>`).join("")}
            </select>
            <span class="environment-pill">${t("securePortal")}</span>
          </div>
        </div>
        <p class="hero-copy">${t("loginHeroCopy")}</p>
        <div class="portal-route-grid">
          ${portalRouteCard(t("platformAdmin"), "PLATFORM", t("platformAdminCopy"))}
          ${portalRouteCard(t("saccoStaff"), t("saccoCode"), t("saccoStaffCopy"))}
          ${portalRouteCard(t("member"), t("membershipNo"), t("memberCopy"))}
        </div>
        <div class="trust-list">
          <span>${t("trustAccess")}</span>
          <span>${t("trustApprovals")}</span>
          <span>${t("trustPayments")}</span>
          <span>${t("trustLowBandwidth")}</span>
        </div>
        <div class="login-links">
          ${authTabButton("login", t("login"))}
          ${authTabButton("register", t("registerSacco"))}
          ${authTabButton("forgot", t("forgotPassword"))}
          ${authTabButton("support", t("support"))}
        </div>
      </section>
      <section class="login-card">
        ${authPanelContent()}
        ${demoToolsEnabled() ? `<section class="demo-panel">
          <div>
            <strong>${t("demoAccess")}</strong>
            <span>${t("demoAccessCopy")}</span>
          </div>
          <div class="demo-picker">
            <select id="demoAccountSelect">
              ${demoAccounts.map((account, index) => `<option value="${index}">${account.label} - ${account.portal}</option>`).join("")}
            </select>
            <button class="button secondary" type="button" data-action="fill-demo">${t("fillDemo")}</button>
          </div>
        </section>` : ""}
        <section class="login-assurance">
          <div><strong>${t("protectedSession")}</strong><span>${t("protectedSessionCopy")}</span></div>
          <div><strong>${t("correctPortal")}</strong><span>${t("correctPortalCopy")}</span></div>
          <div><strong>${t("productionReady")}</strong><span>${t("productionReadyCopy")}</span></div>
        </section>
        <div class="login-footer-links">
          <button type="button">${t("privacyPolicy")}</button>
          <button type="button">${t("terms")}</button>
          <button type="button">${t("maintenanceNotices")}</button>
        </div>
      </section>
    </main>
  `);
}

function authTabButton(tab, label) {
  return `<button class="${state.authTab === tab ? "active" : ""}" type="button" data-auth-tab="${tab}">${label}</button>`;
}

function portalRouteCard(title, code, copy) {
  return `
    <article class="portal-route-card">
      <strong>${escapeHtml(title)}</strong>
      <span>${escapeHtml(code)}</span>
      <p>${escapeHtml(copy)}</p>
    </article>
  `;
}

function authPanelContent() {
  if (state.mfaChallengeId) return mfaVerificationPanel();
  if (state.authTab === "register") return publicSaccoRegistrationPanel();
  if (state.authTab === "forgot") return passwordRecoveryPanel();
  if (state.authTab === "support") return authInfoPanel("Support", "For onboarding, payment, login or member-access support, share your SACCO code, role, phone number and the error shown on this screen.", "Open support request");
  return loginPanel();
}

function mfaVerificationPanel() {
  return `
    <div class="form-heading">
      <p class="eyebrow">Step-up verification</p>
      <h2>Verify secure login</h2>
      <p>This staff account requires a second verification code before the portal opens.</p>
    </div>
    <section class="support-checklist">
      <div><strong>1</strong><span>Enter the verification code from ${escapeHtml(labelize(state.mfaDeliveryChannel || "verification channel"))}.</span></div>
      <div><strong>2</strong><span>The challenge expires ${state.mfaExpiresAt ? escapeHtml(formatDateTime(state.mfaExpiresAt)) : "soon"}.</span></div>
      <div><strong>3</strong><span>Successful verification creates the staff session and records an audit event.</span></div>
    </section>
    ${state.mfaDemoCode ? `<div class="notice compact"><strong>Development MFA code</strong><span>${escapeHtml(state.mfaDemoCode)}</span></div>` : ""}
    ${state.mfaMessage ? `<div class="notice compact"><strong>${escapeHtml(state.mfaMessage)}</strong></div>` : ""}
    ${state.mfaError ? `<div class="notice warning"><strong>MFA verification failed.</strong><span>${escapeHtml(state.mfaError)}</span></div>` : ""}
    <form id="mfaVerifyForm" class="form-grid single">
      <label><span>Verification code</span><input id="mfaCode" required inputmode="numeric" maxlength="6" placeholder="6-digit code" autocomplete="one-time-code"></label>
      <button id="mfaVerifyButton" class="button primary" type="submit">Verify and continue</button>
    </form>
    <button class="button ghost" type="button" data-action="cancel-mfa">Cancel login</button>
  `;
}

function loginPanel() {
  return `
    <div class="form-heading">
      <p class="eyebrow">${t("secureAccess")}</p>
      <h2>${t("loginTitle")}</h2>
      <p>${t("loginCopy")}</p>
    </div>
    ${state.lastError ? `<div class="alert error">${escapeHtml(state.lastError)}</div>` : ""}
    <div class="login-context-strip">
      <div><span>${t("platformCode")}</span><strong>PLATFORM</strong></div>
      <div><span>${t("saccoCode")}</span><strong>${t("saccoCodeExample")}</strong></div>
      <div><span>${t("memberLogin")}</span><strong>${t("memberLoginCopy")}</strong></div>
    </div>
    <form id="loginForm" class="form-grid single">
      ${field(t("code"), "code", "text", t("codePlaceholder"), t("codeHelp"))}
      ${field(t("usernameLabel"), "username", "text", t("usernameLabel"), t("usernameHelp"))}
      <label>
        <span>${t("password")}</span>
        <div class="password-row">
          <input id="password" type="password" placeholder="${escapeHtml(t("enterPassword"))}" autocomplete="current-password" required>
          <button type="button" data-action="toggle-password">${t("show")}</button>
        </div>
      </label>
      <label class="check-row"><input id="remember" type="checkbox" checked> <span>${t("rememberDevice")}</span></label>
      <div id="loginError" class="alert error" hidden></div>
      <button id="loginButton" class="button primary" type="submit">${t("loginSecurely")}</button>
    </form>
  `;
}

function publicSaccoRegistrationPanel() {
  return `
    <div class="form-heading">
      <p class="eyebrow">${t("selfRegistration")}</p>
      <h2>${t("registerSacco")}</h2>
      <p>${t("registerSaccoCopy")}</p>
    </div>
    ${state.publicRegistrationMessage ? `<div class="notice compact"><strong>${escapeHtml(state.publicRegistrationMessage)}</strong></div>` : ""}
    ${state.publicRegistrationError ? `<div class="notice warning"><strong>${t("registrationFailed")}</strong><span>${escapeHtml(state.publicRegistrationError)}</span></div>` : ""}
    <form id="publicSaccoRegistrationForm" class="form-grid">
      <label><span>${t("saccoName")}</span><input id="publicTenantName" required placeholder="e.g. Tereka Farmers SACCO"></label>
      <label><span>${t("saccoCode")}</span><input id="publicTenantCode" readonly placeholder="${escapeHtml(t("saccoCodeGenerated"))}"></label>
      <label><span>${t("registrationNumber")}</span><input id="publicTenantRegistrationNo" required placeholder="${escapeHtml(t("registrationNumberPlaceholder"))}"></label>
      <label><span>Country</span><select id="publicTenantCountry">${countryRegionOptions("uganda")}</select></label>
      <label><span>Currency</span><input id="publicTenantCurrencyCode" readonly value="UGX"></label>
      <label><span>${t("district")}</span><input id="publicTenantDistrict" required></label>
      <label><span>${t("parish")}</span><input id="publicTenantParish" required></label>
      <label><span>${t("village")}</span><input id="publicTenantVillage" required></label>
      <label><span>${t("contactNumber")}</span><input id="publicTenantContactNumber" required placeholder="+256..."></label>
      <label><span>${t("memberRange")}</span><select id="publicTenantMemberRange">${memberRangeOptions()}</select></label>
      <label class="wide"><span>${t("mobileMoneyNumber")}</span><input id="publicTenantPaymentPhone" required placeholder="+256..."></label>
      <div class="mini-fact wide">
        <span>${t("paymentStep")}</span>
        <strong>${t("paymentStepCopy")}</strong>
      </div>
      <button class="button primary wide" type="submit">${t("submitAndPay")}</button>
    </form>
  `;
}

function passwordRecoveryPanel() {
  return `
    <div class="form-heading">
      <p class="eyebrow">Account recovery</p>
      <h2>Password recovery</h2>
      <p>Platform and SACCO staff can request a reset by email. SACCO members should contact their SACCO administrator for member-password reset.</p>
    </div>
    <section class="support-checklist">
      <div><strong>1</strong><span>Enter the staff email registered on Tereka Online.</span></div>
      <div><strong>2</strong><span>If the user exists and is active, a reset request is recorded without exposing whether the email exists.</span></div>
      <div><strong>3</strong><span>After reset, active staff sessions are revoked for safety.</span></div>
    </section>
    ${state.passwordResetMessage ? `<div class="notice compact"><strong>${escapeHtml(state.passwordResetMessage)}</strong>${state.passwordResetExpiresAt ? `<span>Expires ${escapeHtml(formatDateTime(state.passwordResetExpiresAt))}</span>` : ""}</div>` : ""}
    ${state.passwordResetError ? `<div class="notice warning"><strong>Password reset request failed.</strong><span>${escapeHtml(state.passwordResetError)}</span></div>` : ""}
    <form id="passwordResetRequestForm" class="form-grid single">
      <label><span>Staff email</span><input id="passwordResetEmail" type="email" required placeholder="name@sacco.org"></label>
      <button class="button primary" type="submit">Request password reset</button>
    </form>
    ${state.passwordResetToken ? `
      <section class="demo-panel">
        <div>
          <strong>Development reset token</strong>
          <span>This token is shown only when demo logins are enabled.</span>
        </div>
        <code class="token-box">${escapeHtml(state.passwordResetToken)}</code>
      </section>
      ${state.passwordResetConfirmMessage ? `<div class="notice compact"><strong>${escapeHtml(state.passwordResetConfirmMessage)}</strong></div>` : ""}
      ${state.passwordResetConfirmError ? `<div class="notice warning"><strong>Password reset failed.</strong><span>${escapeHtml(state.passwordResetConfirmError)}</span></div>` : ""}
      <form id="passwordResetConfirmForm" class="form-grid single">
        <label><span>Reset token</span><input id="passwordResetToken" required value="${escapeHtml(state.passwordResetToken)}"></label>
        <label><span>New password</span><input id="passwordResetNewPassword" type="password" required minlength="10" placeholder="At least 10 characters"></label>
        <button class="button secondary" type="submit">Set new password</button>
      </form>
    ` : ""}
    <button class="button ghost" type="button" data-auth-tab="login">Back to login</button>
  `;
}

function authInfoPanel(title, copy, action = "Back to login") {
  return `
    <div class="form-heading">
      <p class="eyebrow">Tereka Online</p>
      <h2>${title}</h2>
      <p>${copy}</p>
    </div>
    <section class="support-checklist">
      <div><strong>1</strong><span>Confirm the SACCO code or PLATFORM code.</span></div>
      <div><strong>2</strong><span>Confirm username, email, phone or membership number.</span></div>
      <div><strong>3</strong><span>Authorized admin verifies identity before reset or support action.</span></div>
    </section>
    <button class="button primary" type="button" data-auth-tab="login">${escapeHtml(action)}</button>
  `;
}
