(function () {
  const path = window.location.pathname;
  const marker = "/website-health";
  const idx = path.indexOf(marker);
  const prefix = idx >= 0 ? path.slice(0, idx + marker.length) : "";
  const injected = window.API_BASE_URL || "";
  const isLocal = ["localhost", "127.0.0.1"].includes(window.location.hostname);
  const localDefault = isLocal ? "http://127.0.0.1:8000" : prefix;
  window.APP_CONFIG = {
    apiBase: (injected || localDefault).replace(/\/$/, ""),
    useStaticData: window.USE_STATIC_DATA === true || !isLocal,
  };
})();
