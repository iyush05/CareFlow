"use strict";
const $ = (s) => document.querySelector(s),
  esc = (v) =>
    String(v ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
const paths = {
  overview: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z",
  patients:
    "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M17 4a4 4 0 0 1 0 7 M22 21v-2a4 4 0 0 0-3-3.8",
  bed: "M3 18V6 M3 14h18v7 M3 18h18 M7 10h3v4H7z M13 10h5a3 3 0 0 1 3 3v1h-8z",
  admissions: "M8 3h8v4H8z M7 5H5v16h14V5h-2 M8 12h8 M8 16h5",
  plans: "M14 2H5v20h14V7z M14 2v6h5 M8 13h8 M8 17h6",
  reports: "M4 20h17 M7 16v-5 M12 16V5 M17 16V8",
  plus: "M12 5v14 M5 12h14",
  download: "M12 3v12 M7 10l5 5 5-5 M4 16v5h16v-5",
  chevron: "m9 5 7 7-7 7",
  logout: "M9 5H4v14h5 M10 12h11 M17 8l4 4-4 4",
  search: "M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14 M15 15l6 6",
  clock: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18 M12 7v5l3 2",
  spark: "m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5z",
  menu: "M3 6h18 M3 12h18 M3 18h18",
  close: "m6 6 12 12 M6 18 18 6",
  check: "m5 12 4 4L19 6",
  hospital:
    "M8 21V3h8v18 M3 21V9h5 M16 9h5v12 M10 7h4 M12 5v4 M10 13h4 M10 17h4",
};
const icon = (n) =>
  `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="${paths[n] || paths.overview}"/></svg>`;
const state = {
  user: null,
  page: "overview",
  days: 30,
  patients: [],
  admissions: [],
  notes: [],
  plans: [],
  followups: [],
  lookups: { beds: [], wards: [], departments: [] },
  filter: "",
  query: "",
  sort: "name",
  resource: "beds",
  selected: 0,
  csrf: "",
};
const names = {
  overview: "Overview",
  patients: "Patients",
  admissions: "Admissions",
  resources: "Bed & ward management",
  plans: "Discharge studio",
  followups: "Follow-ups",
  reports: "Reports",
  users: "Team access",
};
const date = (v) =>
  v
    ? new Date(v).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";
const initials = (n) =>
  (n || "CF")
    .split(" ")
    .map((x) => x[0])
    .slice(0, 2)
    .join("");
const person = (id) => state.patients.find((p) => p.id === Number(id));
const bed = (id) => state.lookups.beds.find((b) => b.id === Number(id));
const ward = (id) => state.lookups.wards.find((w) => w.id === Number(id));
const badge = (text, style = "") =>
  `<span class="badge ${style}">${esc(text)}</span>`;
function toast(message) {
  $("#toast").textContent = message;
  $("#toast").classList.add("show");
  clearTimeout(window.toastTimer);
  window.toastTimer = setTimeout(
    () => $("#toast").classList.remove("show"),
    4500,
  );
}
async function api(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...options.headers };
  if (options.method && options.method !== "GET")
    headers["X-CSRF-TOKEN"] = state.csrf;
  const r = await fetch("/api/" + path, { ...options, headers });
  if (r.status === 204) return null;
  const body = await r.json().catch(() => ({}));
  if (!r.ok) {
    if (r.status === 401 && state.user) {
      state.user = null;
      login();
    }
    throw new Error(
      body.error ||
        Object.values(body.errors || {})
          .flat()
          .join(" ") ||
        {
          401: "Please sign in to continue.",
          403: "This action requires an administrator.",
          429: "Too many attempts. Try again in a minute.",
        }[r.status] ||
        "Unable to complete this request.",
    );
  }
  return body;
}
async function csrf() {
  state.csrf = (await api("auth/csrf")).token;
}
async function load() {
  const data = await Promise.all(
    [
      "patients",
      "admissions",
      "notes",
      "plans",
      "followups",
      "hospital/lookups",
      "hospital/analytics?days=" + state.days,
    ].map((p) => api(p)),
  );
  [
    state.patients,
    state.admissions,
    state.notes,
    state.plans,
    state.followups,
    state.lookups,
    state.analytics,
  ] = data;
}
function login() {
  const admin = new URLSearchParams(location.search).get("portal") !== "staff";
  $("#app").innerHTML =
    `<div class="login"><section class="login-story"><div class="brand"><span class="brandmark">✚</span>CareFlow</div><h1>Better insights.<br>Thoughtful care.</h1><p>A clearer picture of your hospital. From the next available bed to the next step in a patient's recovery.</p><div class="login-art"><div class="stat-top">A connected care journey ${icon("hospital")}</div><strong>Every patient.<br>Every next step.</strong><div class="progress"><i style="width:74%"></i></div><p class="subtitle">Resources, insights, and discharge planning in one workspace.</p></div><div class="footer">Hospital resource & patient readmission analytics</div></section><section class="login-form"><div class="login-inner"><p class="eyebrow">YOUR CARE WORKSPACE</p><h1>Welcome to CareFlow</h1><p class="subtitle">Sign in to keep care moving forward.</p><div class="portal"><button data-role="Admin" class="${admin ? "active" : ""}">Admin portal</button><button data-role="User" class="${admin ? "" : "active"}">Staff portal</button></div><form id="login-form"><input type="hidden" name="role" value="${admin ? "Admin" : "User"}"><div class="field"><label for="email">Email address</label><input id="email" name="email" type="email" autocomplete="username" placeholder="you@hospital.org" required></div><div class="field"><label for="password">Password</label><input id="password" name="password" type="password" autocomplete="current-password" placeholder="Enter your password" required></div><p id="login-error" class="form-error" role="alert"></p><button type="submit" class="primary">Sign in to workspace</button></form><div class="demo-credentials">Local development accounts only<br><code>admin@careflow.local · staff@careflow.local</code><br>Password: <code>CareFlow@Demo2026!</code></div><p class="subtitle" style="font-size:.75rem;margin-top:24px">Authorized hospital staff access.</p></div></section></div>`;
  document.querySelectorAll("[data-role]").forEach(
    (b) =>
      (b.onclick = () => {
        document
          .querySelectorAll("[data-role]")
          .forEach((x) => x.classList.toggle("active", x === b));
        $("#login-form [name=role]").value = b.dataset.role;
      }),
  );
  $("#login-form").onsubmit = async (e) => {
    e.preventDefault();
    const button = e.submitter;
    button.disabled = true;
    try {
      await csrf();
      state.user = await api("auth/login", {
        method: "POST",
        body: JSON.stringify(Object.fromEntries(new FormData(e.target))),
      });
      await csrf();
      await load();
      shell();
    } catch (error) {
      $("#login-error").textContent = error.message;
    } finally {
      button.disabled = false;
    }
  };
}
function shell() {
  const nav = [
    "overview",
    "patients",
    "admissions",
    "resources",
    "plans",
    "followups",
    "reports",
    ...(state.user.role === "Admin" ? ["users"] : []),
  ];
  $("#app").innerHTML =
    `<div class="layout"><aside class="sidebar"><div class="sidebar-scroll"><div class="brand"><span class="brandmark">✚</span>CareFlow</div><div class="workspace">${icon("hospital")}<div>CareFlow Hospital<small>Hospital workspace</small></div></div><p class="navlabel">Workspace</p><nav class="nav">${nav.map((n) => `<button data-nav="${n}" class="${state.page === n ? "active" : ""}">${icon(n === "resources" ? "bed" : n === "followups" ? "clock" : n === "users" ? "patients" : n)}${names[n]}</button>`).join("")}</nav><div class="support"><strong>Care starts with clarity.</strong>One connected view for your team and your patients.</div></div><div class="sidebar-foot"><div class="profile"><span class="avatar">${esc(initials(state.user.name))}</span><div>${esc(state.user.name)}<small>${state.user.role === "Admin" ? "Administrator" : "Clinical staff"}</small></div><button id="logout" aria-label="Sign out">${icon("logout")}</button></div></div></aside><main class="main"><header class="topbar"><div class="breadcrumb"><button class="mobile-menu" id="menu" aria-label="Toggle navigation">${icon("menu")}</button><span>Workspace</span><span>/</span><b id="crumb">${names[state.page]}</b></div><div class="topright">${state.lookups.demo ? '<span class="demo-tag">Synthetic demo data</span>' : ""}<time>${date(new Date())}</time><span class="avatar">${esc(initials(state.user.name))}</span></div></header><div class="content" id="content"></div></main></div>`;
  document
    .querySelectorAll("[data-nav]")
    .forEach((b) => (b.onclick = () => navigate(b.dataset.nav)));
  $("#logout").onclick = async () => {
    try {
      await api("auth/logout", { method: "POST" });
      state.user = null;
      login();
    } catch (e) {
      toast(e.message);
    }
  };
  $("#menu").onclick = () => $(".sidebar").classList.toggle("open");
  render();
}
function navigate(page) {
  state.page = page;
  state.query = "";
  state.filter = "";
  state.sort = "name";
  document
    .querySelectorAll("[data-nav]")
    .forEach((b) => b.classList.toggle("active", b.dataset.nav === page));
  $(".sidebar").classList.remove("open");
  $("#crumb").textContent = names[page];
  render();
}
function heading(title, sub, actions = "") {
  return `<div class="heading"><div><p class="eyebrow">${state.page === "overview" ? "HOSPITAL AT A GLANCE" : "CONNECTED CARE"}</p><h1>${title}</h1><p class="subtitle">${sub}</p></div><div class="actions">${actions}</div></div>`;
}
function render() {
  const page = {
    overview,
    patients: patientsPage,
    admissions: admissionsPage,
    resources: resourcesPage,
    plans: plansPage,
    followups: followupsPage,
    reports: reportsPage,
    users: usersPage,
  }[state.page];
  $("#content").innerHTML =
    page() +
    `<footer class="footer"><span>CareFlow · A little clarity. Better care.</span><span>${state.lookups.demo ? "Academic demonstration" : "Hospital workspace"} · All times displayed locally</span></footer>`;
  bind();
}
function stat(title, value, unit, note, i) {
  return `<article class="stat"><div class="stat-top">${title}<span class="stat-icon">${icon(i)}</span></div><div class="stat-value">${value} <small>${unit}</small></div><div class="stat-note">${note}</div></article>`;
}
function overview() {
  const a = state.analytics,
    available = a.totalBeds - a.occupied,
    rate = a.totalBeds ? Math.round((a.occupied / a.totalBeds) * 100) : 0;
  return (
    heading(
      "A clearer view of care.",
      "Your hospital's resources and patient journeys, all in one place.",
      `<select id="period" aria-label="Reporting period">${[7, 30, 90].map((d) => `<option value="${d}" ${d === state.days ? "selected" : ""}>Last ${d} days</option>`).join("")}</select>${state.user.role === "Admin" ? `<button data-export>${icon("download")} Export report</button>` : ""}`,
    ) +
    `<section class="stats">${stat("Bed occupancy", rate + "%", "", `<b>${a.occupied}</b> of ${a.totalBeds} in-service beds`, "bed")}${stat("Admissions", a.admissions, "", `In the last ${a.days} days`, "admissions")}${stat("30-day readmission", a.readmissionRate === null ? "—" : a.readmissionRate + "%", "", `${a.readmitted} of ${a.cohortCount} mature discharges`, "patients")}${stat("Average length of stay", a.averageStay, "days", "Completed stays in selected period", "clock")}</section><div class="grid-two"><section class="panel"><div class="panel-head"><div><h2>Patient flow</h2><p class="subtitle">Daily admissions & occupied beds</p></div><div class="legend"><span><i></i>Occupancy</span><span><i></i>Admissions</span></div></div>${chart(a.series)}<div class="panel-footer">${available} beds available now · ${state.lookups.wards.length} wards connected</div></section><section class="panel"><div class="panel-head"><div><h2>Ward utilization</h2><p class="subtitle">A live view of your available capacity</p></div>${icon("bed")}</div><div class="ward-list">${a.wards.map((w) => `<div class="ward-item"><div class="ward-top"><span>${esc(w.name)}</span><span>${w.occupied} / ${w.total} beds</span></div><div class="progress"><i class="${w.total && w.occupied / w.total > 0.8 ? "high" : ""}" style="width:${w.total ? Math.min(100, (w.occupied / w.total) * 100) : 0}%"></i></div></div>`).join("") || '<p class="subtitle">Add a ward to begin.</p>'}</div><div class="panel-footer">${a.totalBeds ? Math.round((available / a.totalBeds) * 100) : 0}% of in-service capacity is available</div></section></div><section class="panel"><div class="panel-head"><div><h2>Current patient activity</h2><p class="subtitle">The latest admissions across your hospital</p></div><button class="small" data-go="admissions">View all admissions</button></div>${admissionsTable(
      [...state.admissions]
        .filter((a) => !a.dischargedAt)
        .sort((a, b) => new Date(b.admittedAt) - new Date(a.admittedAt))
        .slice(0, 5),
      false,
    )}</section>`
  );
}
function chart(series) {
  const max = Math.max(
      5,
      ...series.map((s) => s.occupied),
      ...series.map((s) => s.admissions),
    ),
    w = 600,
    h = 185;
  const points = series
    .map(
      (s, i) =>
        `${(i / (series.length - 1)) * w},${h - (s.occupied / max) * (h - 15)}`,
    )
    .join(" ");
  return `<div class="chart"><svg viewBox="-28 -8 645 208" role="img" aria-label="Daily admissions and occupied beds over the selected reporting period">${[0, 0.25, 0.5, 0.75, 1].map((n) => `<line x1="0" y1="${h - n * (h - 15)}" x2="600" y2="${h - n * (h - 15)}" stroke="#edf1ee" stroke-dasharray="3 4"/><text x="-10" y="${h - n * (h - 15) + 4}" text-anchor="end" fill="#8a9690" font-size="10">${Math.round(n * max)}</text>`).join("")}<polygon points="0,${h} ${points} ${w},${h}" fill="#eef6f1"/>${series.map((s, i) => `<rect x="${(i / (series.length - 1)) * w - 3}" y="${h - (s.admissions / max) * (h - 15)}" width="6" height="${(s.admissions / max) * (h - 15)}" rx="2" fill="#b4d5c3"><title>${esc(s.date)}: ${s.admissions} admissions, ${s.occupied} occupied beds</title></rect>`).join("")}<polyline points="${points}" fill="none" stroke="#4c9771" stroke-width="2.5" stroke-linejoin="round"/></svg><div class="chart-labels">${[0, 0.25, 0.5, 0.75, 1].map((n) => `<span>${date(series[Math.round((series.length - 1) * n)].date).slice(0, 6)}</span>`).join("")}</div><p class="chart-caption">Occupancy measured at end of day (UTC); today's value is current.</p></div>`;
}
function patientCell(p) {
  return p
    ? `<div class="person"><span class="avatar">${esc(initials(p.name))}</span><div><strong>${esc(p.name)}</strong><small>${esc(p.medicalRecordNumber)}</small></div></div>`
    : "Unknown patient";
}
function table(headers, rows) {
  return rows.length
    ? `<div class="table-wrap"><table><thead><tr>${headers.map((h) => `<th scope="col">${h}</th>`).join("")}</tr></thead><tbody>${rows.join("")}</tbody></table></div>`
    : `<div class="empty"><h3>No records to show</h3><p>Create a record or adjust your search and filters.</p></div>`;
}
function toolbar(placeholder, filters = "") {
  return `<div class="toolbar"><input id="search" type="search" value="${esc(state.query)}" placeholder="${placeholder}" aria-label="Search records">${filters}<select id="sort" aria-label="Sort records"><option value="name" ${state.sort === "name" ? "selected" : ""}>Name A–Z</option><option value="newest" ${state.sort === "newest" ? "selected" : ""}>Newest first</option></select></div>`;
}
function filterMatch(p) {
  return `${p?.name} ${p?.medicalRecordNumber}`
    .toLowerCase()
    .includes(state.query.toLowerCase());
}
function patientsPage() {
  let rows = state.patients.filter(filterMatch);
  if (state.filter === "active")
    rows = rows.filter((p) =>
      state.admissions.some((a) => a.patientId === p.id && !a.dischargedAt),
    );
  rows.sort(
    state.sort === "newest"
      ? (a, b) => b.id - a.id
      : (a, b) => a.name.localeCompare(b.name),
  );
  return (
    heading(
      "Patients",
      "Thoughtful care starts with knowing your patients.",
      `<button class="primary" data-add="patients">${icon("plus")} Add patient</button>`,
    ) +
    toolbar(
      "Search name or medical record number",
      `<select id="filter" aria-label="Patient status"><option value="">All patients</option><option value="active" ${state.filter === "active" ? "selected" : ""}>Currently admitted</option></select>`,
    ) +
    `<section class="panel"><div class="panel-head"><h2>Patient directory</h2><span class="subtitle">${rows.length} patients</span></div>${table(
      ["Patient", "Date of birth", "Sex", "Phone", "Status", "Actions"],
      rows.map(
        (p) =>
          `<tr><td>${patientCell(p)}</td><td>${date(p.dateOfBirth)}</td><td>${esc(p.sex)}</td><td>${esc(p.phone) || "—"}</td><td>${state.admissions.some((a) => a.patientId === p.id && !a.dischargedAt) ? badge("Admitted") : badge("Outpatient", "gray")}</td><td>${editButtons("patients", p.id)}</td></tr>`,
      ),
    )}</section>`
  );
}
function editButtons(type, id) {
  return `<div class="actions"><button class="small" data-edit="${type}" data-id="${id}">Edit</button><button class="small danger" data-delete="${type}" data-id="${id}">Delete</button></div>`;
}
function admissionsTable(rows, actions = true) {
  return table(
    [
      "Patient",
      "Ward / bed",
      "Reason for stay",
      "Admitted",
      "Status",
      ...(actions ? ["Actions"] : []),
    ],
    rows.map(
      (a) =>
        `<tr><td>${patientCell(person(a.patientId))}</td><td>${esc(ward(bed(a.bedId)?.wardId)?.name)}<br><small class="subtitle">${esc(bed(a.bedId)?.label)}</small></td><td>${esc(a.diagnosis)}</td><td>${date(a.admittedAt)}</td><td>${a.dischargedAt ? badge("Discharged", "gray") : badge(a.priority === "Routine" ? "In care" : a.priority, a.priority === "Routine" ? "" : "amber")}</td>${actions ? `<td><div class="actions"><button class="small" data-care="${a.id}">Care plan</button><button class="small" data-edit="admissions" data-id="${a.id}">Edit</button>${a.dischargedAt ? `<button class="small danger" data-delete="admissions" data-id="${a.id}">Delete</button>` : `<button class="small" data-discharge="${a.id}">Discharge</button>`}</div></td>` : ""}</tr>`,
    ),
  );
}
function admissionsPage() {
  let rows = state.admissions.filter(
    (a) =>
      filterMatch(person(a.patientId)) &&
      (!state.filter ||
        (state.filter === "active" ? !a.dischargedAt : !!a.dischargedAt)),
  );
  rows.sort(
    state.sort === "newest"
      ? (a, b) => new Date(b.admittedAt) - new Date(a.admittedAt)
      : (a, b) =>
          (person(a.patientId)?.name || "").localeCompare(
            person(b.patientId)?.name || "",
          ),
  );
  return (
    heading(
      "Admissions",
      "Coordinate patient arrivals, bed assignments, and discharges.",
      `<button class="primary" data-add="admissions">${icon("plus")} New admission</button>`,
    ) +
    toolbar(
      "Search patient or record number",
      `<select id="filter" aria-label="Admission status"><option value="">All admissions</option><option value="active" ${state.filter === "active" ? "selected" : ""}>In care</option><option value="discharged" ${state.filter === "discharged" ? "selected" : ""}>Discharged</option></select>`,
    ) +
    `<section class="panel">${admissionsTable(rows)}</section>`
  );
}
function resourcesPage() {
  const admin = state.user.role === "Admin";
  return (
    heading(
      "Space for better care.",
      "Coordinate your beds, wards, and hospital departments.",
      admin
        ? `<button class="primary" data-add="${state.resource}">${icon("plus")} Add ${state.resource === "beds" ? "bed" : state.resource === "wards" ? "ward" : "department"}</button>`
        : "",
    ) +
    `<div class="tabs">${["beds", "wards", "departments"].map((t) => `<button data-resource="${t}" class="${state.resource === t ? "active" : ""}">${t[0].toUpperCase() + t.slice(1)}</button>`).join("")}</div>` +
    (state.resource === "beds"
      ? `<div class="notice">${badge("Available")} &nbsp; ${badge("Occupied", "gray")} &nbsp; Select a bed to ${admin ? "edit its details" : "view its status"}. Occupied beds cannot be taken out of service.</div><div class="resource-grid">${
          state.lookups.wards
            .map((w) => {
              const beds = state.lookups.beds.filter((b) => b.wardId === w.id);
              return `<section class="panel"><div class="panel-head"><div><h2>${esc(w.name)}</h2><p class="subtitle">${esc(state.lookups.departments.find((d) => d.id === w.departmentId)?.name)}</p></div><span class="subtitle">${beds.length} beds</span></div><div class="bed-grid">${beds
                .map((b) => {
                  const occupied = state.admissions.some(
                    (a) => a.bedId === b.id && !a.dischargedAt,
                  );
                  return `<button class="bed ${!b.inService ? "off" : occupied ? "occupied" : ""}" ${admin ? `data-edit="beds" data-id="${b.id}"` : `data-bed-info="${b.id}"`} aria-label="${esc(b.label)}: ${!b.inService ? "Out of service" : occupied ? "Occupied" : "Available"}">${icon("bed")}${esc(b.label)}</button>`;
                })
                .join("")}</div></section>`;
            })
            .join("") ||
          '<div class="empty">Create your first ward to get started.</div>'
        }</div>`
      : `<section class="panel">${table(
          [
            "Name",
            ...(state.resource === "wards" ? ["Department"] : []),
            ...(admin ? ["Actions"] : []),
          ],
          state.lookups[state.resource].map(
            (r) =>
              `<tr><td>${esc(r.name)}</td>${state.resource === "wards" ? `<td>${esc(state.lookups.departments.find((d) => d.id === r.departmentId)?.name)}</td>` : ""}${admin ? `<td>${editButtons(state.resource, r.id)}</td>` : ""}</tr>`,
          ),
        )}</section>`)
  );
}
function plansPage() {
  const selected = state.admissions.find((a) => a.id === state.selected);
  const plan = state.plans.find((p) => p.admissionId === state.selected);
  const notes = state.notes.filter((n) => n.admissionId === state.selected);
  return (
    heading(
      "A confident next step.",
      "Turn clinician instructions into clear, patient-friendly care plans.",
      `<button data-go="followups">${icon("clock")} Follow-ups</button>`,
    ) +
    `<div class="editor-grid"><section class="panel"><div class="pad"><h2>Discharge details</h2><p class="subtitle" style="margin:10px 0 24px">Start with the patient's admission.</p><div class="field"><label for="admission-select">Patient / admission</label><select id="admission-select"><option value="0">Select an admission</option>${[
      ...state.admissions,
    ]
      .sort((a, b) => b.id - a.id)
      .map(
        (a) =>
          `<option value="${a.id}" ${a.id === state.selected ? "selected" : ""}>${esc(person(a.patientId)?.name)} · #${a.id}</option>`,
      )
      .join(
        "",
      )}</select></div>${selected ? `<div class="notice"><strong>${esc(selected.diagnosis)}</strong><br>Admitted ${date(selected.admittedAt)}<br>${selected.dischargedAt ? "Discharged " + date(selected.dischargedAt) : "Currently in care"}</div><h3>Clinical instructions</h3>${notes.map((n) => `<div class="field"><p class="subtitle">${esc(n.instructions)}</p><div class="actions" style="margin-top:10px">${editButtons("notes", n.id)}</div></div>`).join("") || '<p class="subtitle">No instructions yet.</p>'}<button data-add="notes">${icon("plus")} Add clinical note</button><hr style="border:0;border-top:1px solid var(--line);margin:24px 0"><div class="field"><label for="generation-mode">Drafting method</label><select id="generation-mode"><option value="template">Structured template</option><option value="ai">AI plain-language draft</option></select></div><p class="subtitle" style="font-size:.75rem;margin-bottom:16px">AI drafting sends the diagnosis and note text to your configured provider. Avoid identifying details in notes.</p><button class="primary" id="generate" ${notes.length ? "" : "disabled"}>${icon("spark")} Generate draft</button>` : '<div class="empty">Select a patient to begin their care plan.</div>'}</div></section><div><div class="notice">All generated plans are drafts. A clinician must verify the instructions before approving and sharing them.</div><section class="paper"><div class="paper-header"><div><h2>CareFlow</h2><p class="subtitle">Your discharge care plan</p></div><div>${badge(plan?.approved ? "Reviewed & approved" : "Draft", plan?.approved ? "" : "amber")}<p class="subtitle" style="margin-top:8px;font-size:.75rem">${esc(plan?.source || "Not generated")}</p></div></div>${selected ? `<p class="subtitle" style="margin-bottom:20px">${esc(person(selected.patientId)?.name)} · ${esc(person(selected.patientId)?.medicalRecordNumber)}</p><div id="print-content" class="care-plan-content">${renderCarePlan(plan?.content || "")}</div><div class="paper-editor-tools"><button id="edit-plan" aria-expanded="false" aria-controls="plan-content">Edit care plan</button></div><textarea id="plan-content" aria-label="Discharge care plan" placeholder="Generate a draft from clinical instructions, or write your care plan here." hidden>${esc(plan?.content || "")}</textarea>` : '<div class="empty">Your care plan will appear here.</div>'}</section>${selected ? `<div class="paper-actions"><label class="check" style="margin:20px 0"><input id="approve" type="checkbox" ${plan?.approved ? "checked" : ""}> I have reviewed these instructions for clinical accuracy and approve this plan.</label><div class="actions"><button class="primary" id="save-plan">Save care plan</button><button id="print-plan">${icon("download")} Print / save PDF</button>${plan && !plan.approved ? `<button class="danger" data-delete="plans" data-id="${plan.id}">Delete draft</button>` : ""}</div></div>` : ""}</div></div>`
  );
}
function followupsPage() {
  return (
    heading(
      "Care beyond discharge.",
      "Keep the next appointment in view.",
      `<button class="primary" data-add="followups">${icon("plus")} Schedule follow-up</button>`,
    ) +
    `<section class="panel">${table(
      ["Patient", "Clinic", "Scheduled", "Status", "Actions"],
      state.followups.map((f) => {
        const p = state.plans.find((p) => p.id === f.dischargePlanId),
          a = state.admissions.find((a) => a.id === p?.admissionId);
        return `<tr><td>${patientCell(person(a?.patientId))}</td><td>${esc(f.clinic)}</td><td>${date(f.scheduledAt)}</td><td>${badge(f.completed ? "Completed" : new Date(f.scheduledAt) < new Date() ? "Overdue" : "Scheduled", f.completed ? "" : new Date(f.scheduledAt) < new Date() ? "amber" : "gray")}</td><td>${editButtons("followups", f.id)}</td></tr>`;
      }),
    )}</section>`
  );
}
function reportsPage() {
  return (
    heading(
      "Insights you can act on.",
      "Explore your outcomes and share a clearer picture with your team.",
    ) +
    `<div class="report-grid"><section class="panel report-card"><span class="stat-icon">${icon("reports")}</span><h2>Admissions report</h2><p>Download all admissions, bed assignments, and discharge dates as an Excel-compatible CSV.</p>${state.user.role === "Admin" ? "<button data-export>Download CSV</button>" : badge("Admin access required", "gray")}</section><section class="panel report-card"><span class="stat-icon">${icon("patients")}</span><h2>Import patient records</h2><p>Upload up to 500 synthetic patient records with validation before any rows are saved.</p>${state.user.role === "Admin" ? '<div class="actions"><button id="import-button">Upload CSV</button><button class="small" id="template">Template</button></div><input type="file" id="import-file" accept=".csv,text/csv" hidden>' : badge("Admin access required", "gray")}</section><section class="panel report-card"><span class="stat-icon">${icon("plans")}</span><h2>Patient care plans</h2><p>Review a personalized discharge plan and print or save an approved copy as a PDF.</p><button data-go="plans">Open discharge studio</button></section></div><section class="panel" style="margin-top:24px"><div class="panel-head"><div><h2>Readmissions by reason for stay</h2><p class="subtitle">Explore patterns in the ${state.days}-day mature discharge cohort. Associations do not establish causes.</p></div></div>${table(
      [
        "Reason for stay",
        "Eligible discharges",
        "Readmissions",
        "Rate",
        "Average stay",
      ],
      (state.analytics.readmissionBreakdown || []).map(
        (r) =>
          `<tr><td>${esc(r.diagnosis)}</td><td>${r.discharges}</td><td>${r.readmissions}</td><td>${Math.round((r.readmissions / r.discharges) * 100)}%</td><td>${r.averageStay} days</td></tr>`,
      ),
    )}</section><section class="panel" style="margin-top:24px"><div class="panel-head"><h2>How your metrics are calculated</h2></div><div class="pad" style="padding-top:0"><p class="subtitle"><strong>Occupancy:</strong> active admissions divided by beds currently in service. Historical chart shows end-of-day occupied beds, not historical capacity.</p><p class="subtitle" style="margin-top:16px"><strong>30-day readmission:</strong> discharges with a subsequent admission within 30 days, divided by eligible discharges. The cohort window ends 30 days ago to allow complete follow-up and spans the selected reporting period. Same-time transfers count as readmissions in this prototype.</p><p class="subtitle" style="margin-top:16px"><strong>Average stay:</strong> elapsed days between admission and discharge for stays completed during the selected period. These are descriptive measures; no predictive risk model is used.</p></div></section>`
  );
}
function usersPage() {
  return (
    heading(
      "The people behind the care.",
      "Create secure access for hospital administrators and clinical staff.",
    ) +
    `<section class="panel" style="max-width:620px"><div class="pad"><h2>Invite a team member</h2><p class="subtitle" style="margin:10px 0 24px">Create their account, then share the initial credentials through your approved channel.</p><form id="user-form"><div class="field"><label>Name<input name="name" required maxlength="100"></label></div><div class="field"><label>Email<input name="email" required type="email"></label></div><div class="field"><label>Initial password<input name="password" required type="password" minlength="14" autocomplete="new-password"></label></div><div class="field"><label>Access role<select name="role"><option value="User">Clinical staff</option><option value="Admin">Administrator</option></select></label></div><p class="form-error" id="user-error"></p><button class="primary" type="submit">Create account</button></form></div></section>`
  );
}
const definitions = {
  patients: [
    ["name", "Full name", "text"],
    ["medicalRecordNumber", "Medical record number", "text"],
    ["dateOfBirth", "Date of birth", "date"],
    ["sex", "Sex", ["Female", "Male", "Other", "Prefer not to say"]],
    ["phone", "Phone", "tel", false],
    ["conditions", "Relevant history", "textarea", false],
  ],
  admissions: [
    ["patientId", "Patient", "patients"],
    ["bedId", "Bed", "beds"],
    ["admittedAt", "Admission date & time", "datetime-local"],
    ["diagnosis", "Reason for stay", "text"],
    ["priority", "Priority", ["Routine", "Urgent", "Emergency"]],
  ],
  departments: [["name", "Department name", "text"]],
  wards: [
    ["name", "Ward name", "text"],
    ["departmentId", "Department", "departments"],
  ],
  beds: [
    ["label", "Bed label", "text"],
    ["wardId", "Ward", "wards"],
    ["inService", "In service", "checkbox"],
  ],
  notes: [
    ["admissionId", "Admission", "admissions"],
    ["instructions", "Clinician instructions", "textarea"],
  ],
  followups: [
    ["dischargePlanId", "Care plan", "plans"],
    ["scheduledAt", "Appointment date & time", "datetime-local"],
    ["clinic", "Clinic / contact", "text"],
    ["completed", "Completed", "checkbox"],
  ],
};
function dataFor(type) {
  return state[type] || state.lookups[type] || [];
}
function localDateTime(v) {
  const d = v ? new Date(v) : new Date();
  return new Date(d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}
function openForm(type, id) {
  const row = dataFor(type).find((x) => x.id === Number(id)) || {};
  const fields = definitions[type];
  if (!fields) return;
  const title =
    (id ? "Edit " : "Add ") +
    {
      patients: "patient",
      admissions: "admission",
      beds: "bed",
      wards: "ward",
      departments: "department",
      notes: "clinical note",
      followups: "follow-up",
    }[type];
  $("#modal-content").innerHTML =
    `<div class="modal-head"><h2>${title}</h2><button data-close aria-label="Close form">${icon("close")}</button></div><form id="record-form"><div class="form-grid">${fields
      .map(([key, label, kind, required = true]) => {
        let value =
          row[key] ??
          (key === "admissionId"
            ? state.selected
            : key === "inService"
              ? true
              : "");
        let control;
        if (Array.isArray(kind))
          control = `<select name="${key}">${kind.map((v) => `<option ${v === value ? "selected" : ""}>${esc(v)}</option>`).join("")}</select>`;
        else if (
          [
            "patients",
            "beds",
            "wards",
            "departments",
            "admissions",
            "plans",
          ].includes(kind)
        ) {
          let options = dataFor(kind);
          if (kind === "beds")
            options = options.filter(
              (b) =>
                b.id === row.bedId ||
                (b.inService &&
                  !state.admissions.some(
                    (a) => a.bedId === b.id && !a.dischargedAt,
                  )),
            );
          control = `<select name="${key}" required><option value="">Select ${label.toLowerCase()}</option>${options
            .map((o) => {
              const a =
                kind === "plans"
                  ? state.admissions.find((a) => a.id === o.admissionId)
                  : o;
              const text =
                o.name || o.label || person(a.patientId)?.name + " · #" + o.id;
              return `<option value="${o.id}" ${o.id === Number(value) ? "selected" : ""}>${esc(text)}</option>`;
            })
            .join("")}</select>`;
        } else if (kind === "textarea")
          control = `<textarea name="${key}" ${required ? "required" : ""} maxlength="${key === "instructions" ? 5000 : 1000}">${esc(value)}</textarea>`;
        else if (kind === "checkbox")
          control = `<input type="checkbox" name="${key}" ${value ? "checked" : ""}>`;
        else
          control = `<input name="${key}" type="${kind}" value="${esc(kind === "datetime-local" ? localDateTime(value) : kind === "date" && value ? String(value).slice(0, 10) : value)}" ${required ? "required" : ""} ${kind === "text" ? 'maxlength="' + (key === "diagnosis" ? 300 : key === "medicalRecordNumber" || key === "label" ? 30 : 100) + '"' : ""}>`;
        return `<div class="field ${kind === "textarea" ? "full" : ""}"><label class="${kind === "checkbox" ? "check" : ""}">${label}${control}</label></div>`;
      })
      .join(
        "",
      )}</div><p class="form-error" id="form-error" role="alert"></p><div class="modal-actions">${id && type === "beds" ? `<button type="button" class="danger" id="delete-bed">Delete bed</button>` : ""}<button type="button" data-close>Cancel</button><button class="primary" type="submit">Save ${title.split(" ").slice(1).join(" ")}</button></div></form>`;
  $("#modal").showModal();
  bindClose();
  if ($("#delete-bed"))
    $("#delete-bed").onclick = () => {
      closeModal();
      deleteRecord(type, id);
    };
  $("#record-form").onsubmit = async (e) => {
    e.preventDefault();
    e.submitter.disabled = true;
    const payload = { ...row };
    for (const [key, , kind] of fields) {
      const input = e.target.elements[key];
      payload[key] =
        kind === "checkbox"
          ? input.checked
          : key.endsWith("Id")
            ? Number(input.value)
            : kind === "datetime-local"
              ? new Date(input.value).toISOString()
              : input.value;
    }
    try {
      await api(type + (id ? "/" + id : ""), {
        method: id ? "PUT" : "POST",
        body: JSON.stringify(payload),
      });
      await load();
      closeModal();
      render();
      toast("Record saved.");
    } catch (err) {
      $("#form-error").textContent = err.message;
      e.submitter.disabled = false;
    }
  };
}
function closeModal() {
  $("#modal").close();
}
function bindClose() {
  document
    .querySelectorAll("[data-close]")
    .forEach((b) => (b.onclick = closeModal));
}
function confirmDialog(title, message, action) {
  $("#modal-content").innerHTML =
    `<div class="modal-head"><h2>${esc(title)}</h2><button data-close aria-label="Close">${icon("close")}</button></div><p class="subtitle">${esc(message)}</p><p class="form-error" id="confirm-error" role="alert"></p><div class="modal-actions"><button data-close>Cancel</button><button class="primary" id="confirm-action">Confirm</button></div>`;
  $("#modal").showModal();
  bindClose();
  $("#confirm-action").onclick = async (e) => {
    e.target.disabled = true;
    try {
      await action();
      await load();
      closeModal();
      render();
    } catch (err) {
      $("#confirm-error").textContent = err.message;
      e.target.disabled = false;
    }
  };
}
function deleteRecord(type, id) {
  confirmDialog(
    "Delete this record?",
    "This removes the record. Records with linked clinical history cannot be deleted.",
    async () => {
      await api(type + "/" + id, { method: "DELETE" });
      toast("Record deleted.");
    },
  );
}
function download(content, name, type = "text/csv") {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([content], { type }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
function bind() {
  document
    .querySelectorAll("[data-go]")
    .forEach((b) => (b.onclick = () => navigate(b.dataset.go)));
  document
    .querySelectorAll("[data-add]")
    .forEach((b) => (b.onclick = () => openForm(b.dataset.add)));
  document
    .querySelectorAll("[data-edit]")
    .forEach((b) => (b.onclick = () => openForm(b.dataset.edit, b.dataset.id)));
  document
    .querySelectorAll("[data-delete]")
    .forEach(
      (b) => (b.onclick = () => deleteRecord(b.dataset.delete, b.dataset.id)),
    );
  document.querySelectorAll("[data-care]").forEach(
    (b) =>
      (b.onclick = () => {
        state.selected = Number(b.dataset.care);
        navigate("plans");
      }),
  );
  document.querySelectorAll("[data-resource]").forEach(
    (b) =>
      (b.onclick = () => {
        state.resource = b.dataset.resource;
        render();
      }),
  );
  document.querySelectorAll("[data-bed-info]").forEach(
    (b) =>
      (b.onclick = () => {
        const a = state.admissions.find(
          (a) => a.bedId === Number(b.dataset.bedInfo) && !a.dischargedAt,
        );
        toast(
          a
            ? "Occupied · " + person(a.patientId)?.name
            : bed(b.dataset.bedInfo)?.inService
              ? "Available"
              : "Out of service",
        );
      }),
  );
  document.querySelectorAll("[data-export]").forEach(
    (b) =>
      (b.onclick = () => {
        window.location.href = "/api/hospital/export";
      }),
  );
  if ($("#search"))
    $("#search").oninput = (e) => {
      const position = e.target.selectionStart;
      state.query = e.target.value;
      render();
      $("#search").focus();
      try {
        $("#search").setSelectionRange(position, position);
      } catch {}
    };
  for (const name of ["filter", "sort"])
    if ($("#" + name))
      $("#" + name).onchange = (e) => {
        state[name] = e.target.value;
        render();
      };
  if ($("#period"))
    $("#period").onchange = async (e) => {
      state.days = Number(e.target.value);
      try {
        state.analytics = await api("hospital/analytics?days=" + state.days);
        render();
      } catch (err) {
        toast(err.message);
      }
    };
  document.querySelectorAll("[data-discharge]").forEach(
    (b) =>
      (b.onclick = () => {
        const a = state.admissions.find(
          (a) => a.id === Number(b.dataset.discharge),
        );
        confirmDialog(
          "Discharge patient?",
          `This closes the admission for ${person(a.patientId)?.name} and releases their bed. Review the care plan and follow-up arrangements first.`,
          async () => {
            await api("admissions/" + a.id, {
              method: "PUT",
              body: JSON.stringify({
                ...a,
                dischargedAt: new Date().toISOString(),
              }),
            });
            toast("Patient discharged. Bed is now available.");
          },
        );
      }),
  );
  if ($("#admission-select"))
    $("#admission-select").onchange = (e) => {
      state.selected = Number(e.target.value);
      render();
    };
  if ($("#generate"))
    $("#generate").onclick = async (e) => {
      const b = e.currentTarget;
      b.disabled = true;
      b.textContent = "Preparing draft…";
      try {
        const result = await api("hospital/generate-plan", {
          method: "POST",
          body: JSON.stringify({
            admissionId: state.selected,
            useAi: $("#generation-mode").value === "ai",
          }),
        });
        $("#plan-content").value = result.content;
        $("#plan-content").dataset.source = result.source;
        $("#print-content").innerHTML = renderCarePlan(result.content);
        $("#approve").checked = false;
        toast(result.source + " ready. Review and save it.");
      } catch (err) {
        toast(err.message);
      } finally {
        b.disabled = false;
        b.innerHTML = icon("spark") + " Generate draft";
      }
    };
  if ($("#save-plan"))
    $("#save-plan").onclick = async (e) => {
      const content = $("#plan-content").value.trim();
      if (!content) return toast("Write or generate a care plan first.");
      const p = state.plans.find((p) => p.admissionId === state.selected);
      e.currentTarget.disabled = true;
      try {
        await api("plans" + (p ? "/" + p.id : ""), {
          method: p ? "PUT" : "POST",
          body: JSON.stringify({
            ...p,
            admissionId: state.selected,
            content,
            approved: $("#approve").checked,
            source: $("#plan-content").dataset.source || p?.source || "Manual",
          }),
        });
        await load();
        render();
        toast("Care plan saved.");
      } catch (err) {
        toast(err.message);
        e.target.disabled = false;
      }
    };
  if ($("#edit-plan"))
    $("#edit-plan").onclick = (e) => {
      const editor = $("#plan-content");
      editor.hidden = !editor.hidden;
      e.currentTarget.setAttribute("aria-expanded", String(!editor.hidden));
      e.currentTarget.textContent = editor.hidden ? "Edit care plan" : "Done editing";
      if (!editor.hidden) editor.focus();
    };
  if ($("#plan-content"))
    $("#plan-content").oninput = () => {
      $("#print-content").innerHTML = renderCarePlan($("#plan-content").value);
      $("#approve").checked = false;
    };
  if ($("#print-plan"))
    $("#print-plan").onclick = () => {
      const p = state.plans.find((p) => p.admissionId === state.selected);
      if (
        !p?.approved ||
        p.content !== $("#plan-content").value ||
        !$("#approve").checked
      )
        return toast("Save and approve the current plan before printing.");
      $("#print-content").innerHTML = renderCarePlan(p.content);
      window.print();
    };
  if ($("#template"))
    $("#template").onclick = () =>
      download(
        "name,medicalRecordNumber,dateOfBirth,sex,phone\nDemo Person,CF-9001,1985-04-17,Female,555-0199\n",
        "careflow-patient-template.csv",
      );
  if ($("#import-button"))
    $("#import-button").onclick = () => $("#import-file").click();
  if ($("#import-file"))
    $("#import-file").onchange = async (e) => {
      const f = e.target.files[0];
      if (!f) return;
      if (f.size > 200000)
        return toast("Choose a CSV file smaller than 200 KB.");
      try {
        const r = await api("hospital/import", {
          method: "POST",
          body: JSON.stringify({ csv: await f.text() }),
        });
        await load();
        toast(r.imported + " patients imported.");
      } catch (err) {
        toast(err.message);
      }
      e.target.value = "";
    };
  if ($("#user-form"))
    $("#user-form").onsubmit = async (e) => {
      e.preventDefault();
      e.submitter.disabled = true;
      try {
        await api("auth/users", {
          method: "POST",
          body: JSON.stringify(Object.fromEntries(new FormData(e.target))),
        });
        e.target.reset();
        toast("Account created.");
      } catch (err) {
        $("#user-error").textContent = err.message;
      } finally {
        e.submitter.disabled = false;
      }
    };
}
(async () => {
  try {
    state.user = await api("auth/me");
    await csrf();
    await load();
    shell();
  } catch (e) {
    if (!state.user) login();
    else
      $("#app").innerHTML =
        `<div class="boot"><h1>Unable to load your workspace</h1><p>${esc(e.message)}</p><button id="retry">Try again</button></div>`;
    if ($("#retry")) $("#retry").onclick = () => location.reload();
  }
})();
