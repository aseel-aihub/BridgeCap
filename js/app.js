/*
 * BridgeCap
 * Author: Aseel
 * (c) 2026 Aseel. All rights reserved.
 * Do not copy or reuse this code or idea without written permission.
 *
 * File: app.js
 * Controls the screen: draws the 4 portals and handles the buttons.
 *
 * SECURITY NOTE:
 * We never put data inside innerHTML. We build elements and use textContent,
 * so no one can inject code (XSS) through saved data.
 */

"use strict";

// When a student ticks a skill we count it as level 4 of 5.
const CHECKED_RATING = 4;
const TEAM_SIZE = 4;
const LOW_SCORE = 40; // below this the badge is grey

/* ===================================================================
   1) Helpers
   =================================================================== */

// Create an HTML element with a class and safe text.
function make(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined && text !== null) el.textContent = String(text);
  return el;
}

// Create an icon from Font Awesome.
function icon(name) {
  const i = document.createElement("i");
  i.className = "fa-solid " + name;
  i.setAttribute("aria-hidden", "true");
  return i;
}

// Create a button with an icon (optional) and text.
function makeButton(className, text, iconName) {
  const btn = make("button", className);
  btn.type = "button";
  if (iconName) btn.appendChild(icon(iconName));
  btn.appendChild(document.createTextNode(" " + text));
  return btn;
}

// Keep a number inside a range (e.g. 0 to 5).
function clamp(num, min, max) {
  const n = Number(num);
  if (!Number.isFinite(n)) return min;
  return Math.min(Math.max(n, min), max);
}

// Does the student have at least one skill?
function hasAnySkill(skills) {
  return Object.values(skills).some(v => v > 0);
}

/* ===================================================================
   2) App state + checking saved data
   =================================================================== */

// Empty starting state.
function emptyState() {
  return { mySkills: {}, applied: {}, teams: {} };
}

// Keep only valid skills with levels 0-5 (ignore anything strange).
function cleanSkills(raw) {
  const result = {};
  if (!raw || typeof raw !== "object") return result;
  SKILLS.forEach(skill => {
    const level = Math.round(clamp(raw[skill], MIN_LEVEL, MAX_LEVEL));
    if (level > 0) result[skill] = level;
  });
  return result;
}

// Check one saved team. If something is wrong we drop it.
function cleanTeam(raw) {
  if (!raw || typeof raw !== "object" || !Array.isArray(raw.team)) return null;

  const team = raw.team.slice(0, TEAM_SIZE).map(m => ({
    id: String(m && m.id || ""),
    name: String(m && m.name || "Unknown").slice(0, 40),
    skills: cleanSkills(m && m.skills),
    contribution: Math.round(clamp(m && (m.contribution ?? m._contribution), 0, 100)),
  }));

  // Rebuild milestones from the template, keep only allowed statuses.
  const savedMs = Array.isArray(raw.milestones) ? raw.milestones : [];
  const milestones = MILESTONE_TEMPLATE.map((m, i) => {
    const status = savedMs[i] && savedMs[i].status;
    return { name: m.name, course: m.course, status: MILESTONE_STATUSES.includes(status) ? status : "Not started" };
  });

  return {
    team,
    coveragePct: Math.round(clamp(raw.coveragePct, 0, 100)),
    companyApproved: raw.companyApproved === true,
    facultyApproved: raw.facultyApproved === true,
    milestones,
  };
}

// Check all saved data before using it.
function cleanState(saved) {
  const state = emptyState();
  if (!saved || typeof saved !== "object") return state;

  state.mySkills = cleanSkills(saved.mySkills);

  // Only keep applications/teams for challenges that really exist.
  CHALLENGES.forEach(ch => {
    if (saved.applied && saved.applied[ch.id] === true) state.applied[ch.id] = true;
    const team = saved.teams ? cleanTeam(saved.teams[ch.id]) : null;
    if (team) state.teams[ch.id] = team;
  });
  return state;
}

const state = cleanState(loadState());

function persist() {
  saveState(state);
}

/* ===================================================================
   3) Switching portals
   =================================================================== */

const VIEWS = {
  student:   { section: "studentPortal",   button: "btnStudentView" },
  company:   { section: "companyPortal",   button: "btnCompanyView" },
  faculty:   { section: "facultyPortal",   button: "btnFacultyView" },
  analytics: { section: "analyticsPortal", button: "btnAnalyticsView" },
};

function switchView(view) {
  // Ignore unknown names (safety).
  if (!Object.prototype.hasOwnProperty.call(VIEWS, view)) return;

  document.querySelectorAll(".portal-section").forEach(el => el.classList.remove("active-portal"));
  document.querySelectorAll(".toggle-btn").forEach(el => {
    el.classList.remove("active");
    el.setAttribute("aria-pressed", "false");
  });

  document.getElementById(VIEWS[view].section).classList.add("active-portal");
  const btn = document.getElementById(VIEWS[view].button);
  btn.classList.add("active");
  btn.setAttribute("aria-pressed", "true");

  // Redraw the portal so it shows the newest data.
  if (view === "student") renderStudentResults();
  if (view === "company") renderCompanyPortal();
  if (view === "faculty") renderFacultyPortal();
  if (view === "analytics") renderAnalyticsPortal();
}

/* ===================================================================
   4) Student portal
   =================================================================== */

// Draw the skill checkboxes.
function renderSkillsSelector() {
  const wrap = document.getElementById("skillsSelector");
  wrap.replaceChildren();

  SKILLS.forEach(skill => {
    const label = make("label", "chip");
    const box = make("input", "skill-check");
    box.type = "checkbox";
    box.value = skill;
    box.checked = (state.mySkills[skill] || 0) > 0;

    // Save the choice when the box changes.
    box.addEventListener("change", () => {
      if (box.checked) state.mySkills[skill] = CHECKED_RATING;
      else delete state.mySkills[skill];
      persist();
    });

    label.append(box, document.createTextNode(" " + skill));
    wrap.appendChild(label);
  });
}

// Show the challenges with the match score for the student.
function renderStudentResults() {
  const list = document.getElementById("challengesList");
  list.replaceChildren();

  if (!hasAnySkill(state.mySkills)) {
    list.appendChild(make("p", "empty-hint", "Select at least one skill, then press Run Skill-Match."));
    return;
  }

  // Sort so the best match comes first.
  const results = CHALLENGES
    .map(ch => ({ ch, score: compatibilityScore(state.mySkills, ch.required) }))
    .sort((a, b) => b.score - a.score);

  results.forEach(({ ch, score }) => {
    const company = getCompany(ch.companyId);
    const { covered, missing } = explainMatch(state.mySkills, ch.required);

    const card = make("div", "challenge-card");

    // --- top part: info + score ---
    const top = make("div", "challenge-card-top");
    const info = make("div", "challenge-info");
    info.append(
      make("span", "company-name", company ? company.name + " | " + company.sector : ""),
      make("h4", "", ch.title),
      make("p", "small-desc", ch.description)
    );
    const scoreBox = make("div", "match-score");
    scoreBox.appendChild(make("span", "score-badge" + (score < LOW_SCORE ? " low" : ""), score + "% Match"));
    top.append(info, scoreBox);

    // --- explanation tags ---
    const explain = make("div", "explain-row");
    covered.forEach(s => explain.appendChild(make("span", "skill-tag covered", "✓ " + s)));
    missing.forEach(s => explain.appendChild(make("span", "skill-tag missing", "missing: " + s)));

    card.append(top, explain);

    // --- apply button ---
    if (state.applied[ch.id]) {
      const done = make("div", "applied-tag");
      done.append(icon("fa-circle-check"), document.createTextNode(" Applied"));
      card.appendChild(done);
    } else {
      const btn = makeButton("apply-btn", "Apply to this challenge");
      btn.addEventListener("click", () => {
        state.applied[ch.id] = true;
        persist();
        renderStudentResults();
      });
      card.appendChild(btn);
    }

    list.appendChild(card);
  });
}

/* ===================================================================
   5) Industry mentor portal
   =================================================================== */

function initCompanySelect() {
  const select = document.getElementById("companySelect");
  select.replaceChildren();
  COMPANIES.forEach(c => {
    const opt = make("option", "", c.name + " - " + c.sector);
    opt.value = c.id;
    select.appendChild(opt);
  });
  select.addEventListener("change", renderCompanyPortal);
}

// Candidates = fictional students + "You" (only if you applied and have skills).
function candidatePoolFor(challengeId) {
  const pool = STUDENT_POOL.map(s => ({ id: s.id, name: s.name, skills: s.skills }));
  if (state.applied[challengeId] && hasAnySkill(state.mySkills)) {
    pool.push({ id: "you", name: "You", skills: { ...state.mySkills } });
  }
  return pool;
}

// Small helper for one approval line (approved / pending).
function statusLine(isApproved, label, pendingText) {
  const line = make("div", "status-item " + (isApproved ? "approved" : "pending"));
  line.appendChild(icon(isApproved ? "fa-circle-check" : "fa-clock"));
  line.appendChild(document.createTextNode(" " + label + ": "));
  line.appendChild(make("strong", "", isApproved ? "Approved" : pendingText));
  return line;
}

function renderCompanyPortal() {
  const select = document.getElementById("companySelect");
  const companyId = getCompany(select.value) ? select.value : COMPANIES[0].id;
  const container = document.getElementById("companyChallenges");
  container.replaceChildren();

  CHALLENGES.filter(ch => ch.companyId === companyId).forEach(ch => {
    const record = state.teams[ch.id] || null;
    const locked = record && record.companyApproved && record.facultyApproved;

    // Rank candidates by score (highest first).
    const ranked = candidatePoolFor(ch.id)
      .map(p => ({ ...p, score: compatibilityScore(p.skills, ch.required) }))
      .sort((a, b) => b.score - a.score);

    const card = make("div", "project-approval-card");

    // ---------- left side: challenge + candidates ----------
    const left = make("div", "project-info");
    left.append(make("span", "industry-tag", ch.title), make("p", "small-desc", ch.description));

    const req = make("div", "explain-row");
    Object.entries(ch.required).forEach(([skill, level]) => {
      req.appendChild(make("span", "skill-tag covered", skill + " | level " + level));
    });
    left.appendChild(req);

    left.appendChild(make("h4", "pool-title", "Candidate pool (" + ranked.length + ")"));
    ranked.forEach(p => {
      const row = make("div", "candidate-row");
      const who = make("div");
      const skillText = Object.entries(p.skills).map(([s, v]) => s + " (" + v + ")").join(", ");
      who.append(make("div", "candidate-name", p.name), make("div", "candidate-skills", skillText));
      row.append(who, make("span", "score-badge small" + (p.score < LOW_SCORE ? " low" : ""), p.score + "%"));
      left.appendChild(row);
    });

    // Form team button. Locked after both approvals so the team can't change.
    const formBtn = makeButton("btn-form-team", locked ? "Team locked (approved)" : "Form Balanced Team", "fa-people-group");
    formBtn.disabled = !!locked;
    formBtn.addEventListener("click", () => {
      // Re-forming resets approvals, so we ask first.
      if (record && !window.confirm("Re-forming the team will reset its approvals. Continue?")) return;
      const result = formBalancedTeam(ch.required, candidatePoolFor(ch.id), TEAM_SIZE);
      state.teams[ch.id] = {
        team: result.team,
        coveragePct: result.coveragePct,
        companyApproved: false,
        facultyApproved: false,
        milestones: MILESTONE_TEMPLATE.map(m => ({ name: m.name, course: m.course, status: "Not started" })),
      };
      persist();
      renderCompanyPortal();
    });
    left.appendChild(formBtn);

    if (record) left.appendChild(buildTeamResult(record));

    // ---------- right side: dual approval ----------
    const right = make("div", "approval-box");
    right.appendChild(make("h4", "", "Dual Approval System"));
    const statusBox = make("div", "approval-status");
    statusBox.append(
      statusLine(record && record.facultyApproved, "Academic Supervisor", "Pending (see Faculty portal)"),
      statusLine(record && record.companyApproved, "Industry Mentor", "Pending review")
    );
    right.appendChild(statusBox);

    const approveBtn = makeButton("btn-approve",
      record && record.companyApproved ? "Industry Approved" : "Grant Industry Approval", "fa-signature");
    // Can't approve if there is no team yet, or already approved.
    approveBtn.disabled = !record || record.companyApproved;
    approveBtn.addEventListener("click", () => {
      const current = state.teams[ch.id];
      if (!current) return;
      current.companyApproved = true;
      persist();
      renderCompanyPortal();
    });
    right.appendChild(approveBtn);

    card.append(left, right);
    container.appendChild(card);
  });
}

// Show the formed team and how much it covers.
function buildTeamResult(record) {
  const box = make("div", "team-result");

  const bar = make("div", "coverage-bar");
  const fill = make("div", "coverage-fill");
  fill.style.width = clamp(record.coveragePct, 0, 100) + "%";
  bar.appendChild(fill);

  const text = make("p", "subtitle", "Skill coverage: ");
  text.appendChild(make("strong", "highlight", record.coveragePct + "%"));
  text.appendChild(document.createTextNode(" of required skill points met"));

  box.append(bar, text);

  if (record.team.length === 0) {
    box.appendChild(make("p", "empty-hint", "No candidate matches this challenge yet."));
  }
  record.team.forEach(m => {
    const row = make("div", "team-member");
    row.append(make("span", "", m.name), make("span", "", "contributes " + m.contribution + " skill pts"));
    box.appendChild(row);
  });
  return box;
}

/* ===================================================================
   6) Faculty portal
   =================================================================== */

function renderFacultyPortal() {
  const container = document.getElementById("facultyList");
  container.replaceChildren();

  const ids = Object.keys(state.teams).filter(id => getChallenge(id));
  if (ids.length === 0) {
    container.appendChild(make("p", "empty-hint", "No teams formed yet. Form one from the Industry Mentor portal first."));
    return;
  }

  ids.forEach(chId => {
    const ch = getChallenge(chId);
    const company = getCompany(ch.companyId);
    const record = state.teams[chId];
    const bothApproved = record.companyApproved && record.facultyApproved;

    const card = make("div", "faculty-card");
    const head = make("div", "faculty-head");

    // --- project info ---
    const info = make("div");
    const names = record.team.map(m => m.name).join(", ") || "none";
    info.append(
      make("span", "company-name", company ? company.name : ""),
      make("h4", "faculty-title", ch.title),
      make("p", "subtitle", "Team: " + names + " | " + record.coveragePct + "% coverage")
    );

    // --- approval part ---
    const side = make("div", "faculty-side");
    if (bothApproved) {
      const tag = make("span", "final-approved-tag");
      tag.append(icon("fa-check-double"), document.createTextNode(" Approved: Active Project"));
      side.appendChild(tag);
    } else {
      const statusBox = make("div", "approval-status");
      statusBox.append(
        statusLine(record.companyApproved, "Industry", "Pending"),
        statusLine(record.facultyApproved, "Faculty", "Pending")
      );
      side.appendChild(statusBox);

      if (!record.facultyApproved) {
        const btn = makeButton("btn-approve btn-small", "Approve as Faculty");
        btn.disabled = record.team.length === 0; // empty team can't be approved
        btn.addEventListener("click", () => {
          state.teams[chId].facultyApproved = true;
          persist();
          renderFacultyPortal();
        });
        side.appendChild(btn);
      }
    }

    head.append(info, side);
    card.appendChild(head);

    // Milestones appear only after BOTH approvals.
    if (bothApproved) card.appendChild(buildMilestones(chId));
    container.appendChild(card);
  });
}

// GP1/GP2 milestone tracker with a progress bar.
function buildMilestones(chId) {
  const record = state.teams[chId];
  const box = make("div", "milestones");

  const done = record.milestones.filter(m => m.status === "Done").length;
  const pct = Math.round((done / record.milestones.length) * 100);

  const bar = make("div", "ms-progress");
  const fill = make("div", "ms-fill");
  fill.style.width = pct + "%";
  bar.appendChild(fill);
  box.append(bar, make("p", "subtitle", done + "/" + record.milestones.length + " milestones complete"));

  record.milestones.forEach((m, index) => {
    const row = make("div", "milestone-row");
    const select = make("select");
    select.setAttribute("aria-label", m.name + " status");

    MILESTONE_STATUSES.forEach(status => {
      const opt = make("option", "", status);
      opt.value = status;
      opt.selected = m.status === status;
      select.appendChild(opt);
    });

    // Save new status, but only if it is one of the allowed ones.
    select.addEventListener("change", () => {
      if (!MILESTONE_STATUSES.includes(select.value)) return;
      state.teams[chId].milestones[index].status = select.value;
      persist();
      box.replaceWith(buildMilestones(chId));
    });

    row.append(
      make("span", "gp-tag " + (m.course === "GP1" ? "gp1" : "gp2"), m.course),
      make("span", "ms-name", m.name),
      select
    );
    box.appendChild(row);
  });
  return box;
}

/* ===================================================================
   7) University / Ministry portal
   =================================================================== */

function statCard(num, label) {
  const card = make("div", "stat-card");
  card.append(make("div", "num", num), make("div", "label", label));
  return card;
}

function renderAnalyticsPortal() {
  const teams = Object.values(state.teams);
  const activeTeams = teams.filter(t => t.companyApproved && t.facultyApproved).length;

  // Count "You" as a student only if you picked skills.
  const allStudents = [...STUDENT_POOL];
  if (hasAnySkill(state.mySkills)) allStudents.push({ id: "you", name: "You", skills: state.mySkills });

  const stats = document.getElementById("statsRow");
  stats.replaceChildren(
    statCard(allStudents.length, "Registered Students"),
    statCard(CHALLENGES.length, "Posted Challenges"),
    statCard(activeTeams + " / " + teams.length, "Active / Formed Teams")
  );

  const gaps = computeSkillsGap(allStudents, CHALLENGES);
  const maxVal = Math.max(...gaps.map(g => Math.max(g.avgSupply, g.avgDemand)), 1);

  const chart = document.getElementById("skillsGapChart");
  chart.replaceChildren();

  // --- legend ---
  const legend = make("div", "gap-legend");
  legend.append(make("span", "lg-supply", "Avg. student supply"), make("span", "lg-demand", "Avg. challenge demand"));
  chart.appendChild(legend);

  // --- one row per skill ---
  gaps.forEach(g => {
    const row = make("div", "gap-row");
    const label = make("div", "gap-label");
    label.append(
      make("span", "", g.skill),
      make("span", g.gap > 0 ? "gap-positive" : "gap-neutral", (g.gap > 0 ? "+" : "") + g.gap + " gap")
    );

    const supplyTrack = make("div", "gap-track");
    const supply = make("div", "gap-supply");
    supply.style.width = (g.avgSupply / maxVal) * 100 + "%";
    supplyTrack.appendChild(supply);

    const demandTrack = make("div", "gap-track second");
    const demand = make("div", "gap-demand");
    demand.style.width = (g.avgDemand / maxVal) * 100 + "%";
    demandTrack.appendChild(demand);

    row.append(label, supplyTrack, demandTrack);
    chart.appendChild(row);
  });
}

/* ===================================================================
   8) Start the app
   =================================================================== */

function resetDemo() {
  if (!window.confirm("This will delete your skills, applications and teams. Continue?")) return;
  clearState();
  Object.assign(state, emptyState());
  renderSkillsSelector();
  initCompanySelectValue();
  switchView("student");
}

function initCompanySelectValue() {
  document.getElementById("companySelect").value = COMPANIES[0].id;
}

function init() {
  // Connect portal buttons (no onclick in HTML, safer with our security rule).
  document.querySelectorAll(".toggle-btn").forEach(btn => {
    btn.addEventListener("click", () => switchView(btn.dataset.view));
  });
  document.getElementById("btnRunMatch").addEventListener("click", renderStudentResults);
  document.getElementById("btnReset").addEventListener("click", resetDemo);

  renderSkillsSelector();
  initCompanySelect();
  switchView("student");

  // Signature in the browser console.
  console.info("BridgeCap | منصة جسر — (c) 2026 Aseel. All rights reserved.");
}

init();
