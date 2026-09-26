const apiBase = window.APP_CONFIG.apiBase;
const useStaticData = window.APP_CONFIG.useStaticData;
let dashboard = null;
let dataMode = useStaticData ? "static" : "live";
let activeReport = "daily";

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

function render(data) {
  const suffix = dataMode === "static" ? " (static snapshot)" : "";
  document.getElementById("generated-at").textContent = `Updated ${data.generated_at}${suffix}`;
  const score = data.overall.score == null ? "–" : data.overall.score;
  document.getElementById("overall-score").textContent = score;
  const status = document.getElementById("overall-status");
  status.textContent = data.overall.status;
  status.className = `status-pill ${data.overall.status}`;
  document.getElementById("overall-label").textContent = data.overall.label;
  document.getElementById("score-card").className = `score-card ${data.overall.status}`;

  document.getElementById("severity-grid").innerHTML = [
    ["Open incidents", data.open_incident_count],
    ["Critical", data.severity_counts.Critical],
    ["High", data.severity_counts.High],
    ["Last 24h incidents", data.incident_count_24h],
  ]
    .map(
      ([label, value]) =>
        `<div><p class="muted">${label}</p><p class="metric">${value}</p></div>`
    )
    .join("");

  document.getElementById("components").innerHTML = data.components
    .map(
      (item) => `
      <article>
        <h3>${item.label}</h3>
        <p class="metric">${item.score == null ? "n/a" : item.score}</p>
        <p class="status-pill ${item.status}">${item.status}</p>
      </article>`
    )
    .join("");

  document.getElementById("domains").innerHTML = data.domains
    .map((item) => {
      const latest = item.latest;
      const ok = latest ? latest.ok : null;
      return `
        <article>
          <h3>${item.name}</h3>
          <p><a href="${item.url}" target="_blank" rel="noreferrer">${item.url}</a></p>
          <p class="muted">24h uptime: ${item.uptime_24h == null ? "n/a" : item.uptime_24h + "%"}</p>
          <p class="badge ${ok === null ? "unknown" : ok ? "pass" : "fail"}">${ok === null ? "No data" : ok ? "Passing" : "Failing"}</p>
          <p class="muted">${latest ? latest.message : "Awaiting first check"}</p>
        </article>`;
    })
    .join("");

  document.getElementById("links-body").innerHTML = data.priority_links
    .map((item) => {
      const latest = item.latest;
      const ok = latest ? latest.ok : null;
      return `<tr>
        <td><span class="badge ${item.severity}">${item.severity}</span></td>
        <td><a href="${item.url}" target="_blank" rel="noreferrer">${item.url}</a><br><span class="muted">${item.reason}</span></td>
        <td><span class="badge ${ok === null ? "unknown" : ok ? "pass" : "fail"}">${ok === null ? "No data" : ok ? "Passing" : "Failing"}</span></td>
        <td>${latest ? latest.message : "Awaiting first check"}</td>
      </tr>`;
    })
    .join("");

  document.getElementById("incidents-body").innerHTML = data.open_incidents.length
    ? data.open_incidents
        .map((item) => {
          const shot = item.screenshot_name
            ? `<br><a href="${screenshotHref(item.screenshot_name)}" target="_blank" rel="noreferrer">Screenshot</a>`
            : "";
          return `<tr>
            <td><span class="badge ${item.severity}">${item.severity}</span></td>
            <td>${item.check_type}</td>
            <td>${item.target_url}</td>
            <td>${item.owner_team}</td>
            <td>${item.last_seen_utc}</td>
            <td>${item.error_signature}${shot}</td>
          </tr>`;
        })
        .join("")
    : `<tr><td colspan="6" class="empty">No open incidents.</td></tr>`;

  document.getElementById("checks-body").innerHTML = data.latest_checks.length
    ? data.latest_checks
        .map((item) => {
          const shot = item.screenshot_name
            ? `<a href="${screenshotHref(item.screenshot_name)}" target="_blank" rel="noreferrer">Screenshot</a>`
            : "–";
          return `<tr>
            <td>${item.check_type}</td>
            <td>${item.target_url}</td>
            <td>${item.browser_context || "–"}</td>
            <td><span class="badge ${item.ok ? "pass" : "fail"}">${item.ok ? "PASS" : "FAIL"}</span></td>
            <td>${item.detected_at}</td>
            <td>${shot}<br><span class="muted">${item.message}</span></td>
          </tr>`;
        })
        .join("")
    : `<tr><td colspan="6" class="empty">No checks recorded yet.</td></tr>`;

  document.getElementById("report-body").textContent = data.reports[activeReport] || "No report yet.";
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
