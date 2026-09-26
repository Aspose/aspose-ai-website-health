const apiBase = window.APP_CONFIG.apiBase;
const useStaticData = window.APP_CONFIG.useStaticData;
let dashboard = null;
let dataMode = useStaticData ? "static" : "live";
let activeReport = "daily";
let activeFilter = "all";

const FILTERS = [
  ["all", "All"],
  ["availability", "Availability"],
  ["priority_link", "Links"],
  ["homepage_ui", "Homepage"],
  ["browser_smoke", "Smoke"],
  ["quality", "Quality"],
];

const QUALITY_TYPES = ["sitemap", "crawl", "seo", "performance", "accessibility", "i18n"];
const QUALITY_LABELS = {
  sitemap: "Sitemaps",
  crawl: "Internal crawl",
  seo: "SEO",
  performance: "Performance",
  accessibility: "Accessibility",
  i18n: "Localization",
};

async function loadDashboard() {
  if (useStaticData) {
    dashboard = await loadStatic();
    dataMode = "static";
  } else {
    try {
      dashboard = await loadLive();
      dataMode = "live";
    } catch (error) {
      dashboard = await loadStatic();
      dataMode = "static";
    }
  }
  render(dashboard);
}

async function loadLive() {
  const response = await fetch(`${apiBase}/api/dashboard`);
  if (!response.ok) {
    throw new Error(`Dashboard API returned ${response.status}`);
  }
  return response.json();
}

async function loadStatic() {
  const response = await fetch("./dashboard.json");
  if (!response.ok) {
    throw new Error("No static dashboard.json found. Run: aspose-agent publish-static");
  }
  return response.json();
}

function screenshotHref(name) {
  if (dataMode === "static" || !apiBase) {
    return `./screenshots/${encodeURIComponent(name)}`;
  }
  return `${apiBase}/api/screenshots/${encodeURIComponent(name)}`;
}

function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatWhen(value) {
  if (!value) return "–";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return esc(value);
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  });
}

function hostOf(url) {
  try {
    return new URL(url).host;
  } catch (error) {
    return url;
  }
}

function render(data) {
  document.getElementById("generated-at").textContent = formatWhen(data.generated_at);
  const score = data.overall.score == null ? "–" : data.overall.score;
  document.getElementById("overall-score").textContent = score;
  const status = document.getElementById("overall-status");
  status.textContent = data.overall.status;
  status.className = `status-pill ${data.overall.status}`;
  document.getElementById("overall-label").textContent = data.overall.label;
  document.getElementById("score-card").className = `score-panel ${data.overall.status}`;

  document.getElementById("severity-grid").innerHTML = [
    ["Open incidents", data.open_incident_count],
    ["Critical", data.severity_counts.Critical],
    ["High", data.severity_counts.High],
    ["Failing checks", data.failing_check_count ?? 0],
  ]
    .map(
      ([label, value]) =>
        `<div><p class="meta-label">${esc(label)}</p><p class="metric">${esc(value)}</p></div>`
    )
    .join("");

  document.getElementById("components").innerHTML = data.components
    .map((item) => {
      const width = item.score == null ? 0 : item.score;
      return `
        <article>
          <h3>${esc(item.label)}</h3>
          <div class="meter ${esc(item.status)}"><span style="width:${width}%"></span></div>
          <p class="bar-score">${item.score == null ? "n/a" : item.score}</p>
        </article>`;
    })
    .join("");

  const attention = data.attention || data.latest_checks.filter((item) => !item.ok);
  const attentionSection = document.getElementById("attention-section");
  if (!attention.length) {
    attentionSection.classList.add("hidden");
  } else {
    attentionSection.classList.remove("hidden");
    document.getElementById("attention-list").innerHTML = attention
      .slice(0, 8)
      .map(
        (item) => `
        <article>
          <span class="badge ${esc(item.severity)}">${esc(item.severity)}</span>
          <div>
            <h3>${esc(item.check_type)} · ${esc(hostOf(item.target_url))}</h3>
            <p class="muted">${esc(item.message)}</p>
          </div>
          <span class="badge ${item.ok ? "pass" : "fail"}">${item.ok ? "PASS" : "FAIL"}</span>
        </article>`
      )
      .join("");
  }

  document.getElementById("domains").innerHTML = data.domains
    .map((item) => {
      const latest = item.latest;
      const ok = latest ? latest.ok : null;
      const state = ok === null ? "unknown" : ok ? "pass" : "fail";
      return `
        <article class="${state}">
          <h3>${esc(item.name)}</h3>
          <p><a href="${esc(item.url)}" target="_blank" rel="noreferrer">${esc(item.url)}</a></p>
          <p class="muted">24h uptime: ${item.uptime_24h == null ? "n/a" : item.uptime_24h + "%"}</p>
          <p class="badge ${state}">${ok === null ? "No data" : ok ? "Passing" : "Failing"}</p>
          <p class="muted">${esc(latest ? latest.message : "Awaiting first check")}</p>
        </article>`;
    })
    .join("");

  document.getElementById("links-body").innerHTML = data.priority_links
    .map((item) => {
      const latest = item.latest;
      const ok = latest ? latest.ok : null;
      return `<tr>
        <td><span class="badge ${esc(item.severity)}">${esc(item.severity)}</span></td>
        <td><a href="${esc(item.url)}" target="_blank" rel="noreferrer">${esc(item.url)}</a><br><span class="muted">${esc(item.reason)}</span></td>
        <td><span class="badge ${ok === null ? "unknown" : ok ? "pass" : "fail"}">${ok === null ? "No data" : ok ? "Passing" : "Failing"}</span><br><span class="muted">${esc(latest ? latest.message : "Awaiting first check")}</span></td>
      </tr>`;
    })
    .join("");

  const quality = data.quality || {};
  document.getElementById("quality-grid").innerHTML = QUALITY_TYPES.map((key) => {
    const rows = quality[key] || [];
    const failed = rows.filter((row) => !row.ok);
    const items = (failed.length ? failed : rows).slice(0, 3);
    const body = items.length
      ? items
          .map(
            (row) =>
              `<li><strong>${row.ok ? "Pass" : "Review"}</strong> — ${esc(hostOf(row.target_url))}: ${esc(row.message)}</li>`
          )
          .join("")
      : "<li>No results yet</li>";
    return `<article class="quality-card"><h3>${QUALITY_LABELS[key]}</h3><ul>${body}</ul></article>`;
  }).join("");

  document.getElementById("incidents-body").innerHTML = data.open_incidents.length
    ? data.open_incidents
        .map((item) => {
          const shot = item.screenshot_name
            ? `<br><a href="${screenshotHref(item.screenshot_name)}" target="_blank" rel="noreferrer">Screenshot</a>`
            : "";
          return `<tr>
            <td><span class="badge ${esc(item.severity)}">${esc(item.severity)}</span></td>
            <td>${esc(item.check_type)}</td>
            <td>${esc(item.target_url)}</td>
            <td>${esc(item.owner_team)}</td>
            <td>${esc(formatWhen(item.last_seen_utc))}</td>
            <td>${esc(item.message || item.error_signature)}${shot}</td>
          </tr>`;
        })
        .join("")
    : `<tr><td colspan="6" class="empty">No open incidents.</td></tr>`;

  renderFilters();
  renderChecks(data);
  document.getElementById("report-body").textContent = data.reports[activeReport] || "No report yet.";
}

function renderFilters() {
  document.getElementById("check-filters").innerHTML = FILTERS.map(
    ([id, label]) =>
      `<button type="button" class="chip ${activeFilter === id ? "active" : ""}" data-filter="${id}">${label}</button>`
  ).join("");
  document.querySelectorAll("#check-filters .chip").forEach((button) => {
    button.addEventListener("click", () => {
      activeFilter = button.dataset.filter;
      if (dashboard) {
        renderFilters();
        renderChecks(dashboard);
      }
    });
  });
}

function renderChecks(data) {
  const rows = (data.latest_checks || []).filter((item) => {
    if (activeFilter === "all") return true;
    if (activeFilter === "quality") return QUALITY_TYPES.includes(item.check_type);
    return item.check_type === activeFilter;
  });
  document.getElementById("checks-body").innerHTML = rows.length
    ? rows
        .map((item) => {
          const shot = item.screenshot_name
            ? `<a href="${screenshotHref(item.screenshot_name)}" target="_blank" rel="noreferrer">Screenshot</a>`
            : "–";
          return `<tr>
            <td>${esc(item.check_type)}</td>
            <td>${esc(item.target_url)}</td>
            <td>${esc(item.browser_context || "–")}</td>
            <td><span class="badge ${item.ok ? "pass" : "fail"}">${item.ok ? "PASS" : "FAIL"}</span></td>
            <td>${esc(formatWhen(item.detected_at))}</td>
            <td>${shot}<br><span class="muted">${esc(item.message)}</span></td>
          </tr>`;
        })
        .join("")
    : `<tr><td colspan="6" class="empty">No checks in this view.</td></tr>`;
}

document.getElementById("refresh-btn").addEventListener("click", () => {
  loadDashboard().catch(showError);
});

document.querySelectorAll(".tab").forEach((button) => {
  button.addEventListener("click", () => {
    activeReport = button.dataset.report;
    document.querySelectorAll(".tab").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    if (dashboard) {
      document.getElementById("report-body").textContent = dashboard.reports[activeReport];
    }
  });
});

function showError(error) {
  document.getElementById("overall-label").textContent =
    `Unable to load health data. ${error.message}`;
}

loadDashboard().catch(showError);
if (!useStaticData) {
  setInterval(() => loadDashboard().catch(() => {}), 60000);
}
