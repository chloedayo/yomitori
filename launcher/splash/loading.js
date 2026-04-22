// Splash controller — single-page launcher UI with four panels:
//   loading / wizard / ready / error
//
// The native window never navigates to the React SPA. It only opens
// http://localhost:3000 in the user's default browser via IPC.
// All Tauri interaction is through __TAURI_INTERNALS__ IPC + events.
// Event listeners are attached via addEventListener (no inline handlers).

const internals = window.__TAURI_INTERNALS__;

function invoke(cmd, args) {
  if (!internals) return Promise.reject(new Error("Tauri IPC not available"));
  return internals.invoke(cmd, args ?? {});
}

// ---- Elements ----
const statusEl = document.getElementById("status");
const stageEls = {
  backend: document.getElementById("stage-backend"),
  middleware: document.getElementById("stage-middleware"),
  health: document.getElementById("stage-health"),
};
const panels = {
  loading: document.getElementById("panel-loading"),
  wizard: document.getElementById("panel-wizard"),
  ready: document.getElementById("panel-ready"),
  error: document.getElementById("panel-error"),
};
const errorMsgEl = document.getElementById("error-msg");
const wizardPathEl = document.getElementById("wizard-path");
const wizardErrorEl = document.getElementById("wizard-error");
const btnContinue = document.getElementById("btn-continue");

let pendingBooksPath = null;

// ---- View switching ----
function showPanel(name) {
  for (const [key, el] of Object.entries(panels)) {
    if (key === name) el.classList.remove("hidden");
    else el.classList.add("hidden");
  }
}

function setStage(name, status) {
  const el = stageEls[name];
  if (!el) return;
  el.classList.remove("active", "done", "fail");
  if (status) el.classList.add(status);
}

function setStatus(text) {
  statusEl.textContent = text;
}

function resetStages() {
  for (const s of Object.keys(stageEls)) setStage(s, null);
}

// ---- Event handlers from Rust ----
function handleProgress(p) {
  if (!p || !p.stage) return;
  setStage(p.stage, p.ok ? "done" : "active");
  if (p.stage === "backend" && p.ok) setStatus("Backend ready...");
  else if (p.stage === "middleware" && p.ok) setStatus("Middleware ready...");
  else if (p.stage === "health") setStatus(p.ok ? "Ready" : "Checking health...");
}

function handleReady() {
  setStatus("Ready");
  for (const s of Object.keys(stageEls)) setStage(s, "done");
  showPanel("ready");
}

function handleError(payload) {
  const msg = (payload && payload.message) || "Timed out waiting for Yomitori to start.";
  errorMsgEl.textContent = msg;
  for (const s of Object.keys(stageEls)) {
    if (!stageEls[s].classList.contains("done")) setStage(s, "fail");
  }
  showPanel("error");
}

// ---- Wizard flow ----
async function pickFolder() {
  wizardErrorEl.textContent = "";
  const path = await invoke("open_file_dialog").catch(() => null);
  if (!path) return;
  pendingBooksPath = path;
  wizardPathEl.value = path;
  btnContinue.disabled = false;
}

async function continueWizard() {
  if (!pendingBooksPath) return;
  wizardErrorEl.textContent = "";
  btnContinue.disabled = true;
  try {
    await invoke("save_books_path", { booksPath: pendingBooksPath });
    await invoke("start_sidecars", { booksPath: pendingBooksPath });
    showPanel("loading");
    setStatus("Starting services...");
    resetStages();
    await invoke("splash_ready").catch(() => {});
  } catch (e) {
    wizardErrorEl.textContent = String(e);
    btnContinue.disabled = false;
  }
}

async function changeFolder() {
  // Clear stored booksPath and reset to wizard.
  try {
    await invoke("save_books_path", { booksPath: "" });
  } catch (_) {
    // non-fatal; still show wizard
  }
  pendingBooksPath = null;
  wizardPathEl.value = "";
  wizardErrorEl.textContent = "";
  btnContinue.disabled = true;
  showPanel("wizard");
}

async function openDictFolder() {
  try {
    const dataDir = await invoke("get_data_dir");
    // Join with "dictionaries" subfolder. Use forward slash — Rust will
    // canonicalize and handle both separators on Windows.
    const sep = dataDir.includes("\\") ? "\\" : "/";
    const trimmed = dataDir.endsWith(sep) ? dataDir.slice(0, -1) : dataDir;
    const dictPath = `${trimmed}${sep}dictionaries`;
    await invoke("open_path", { path: dictPath });
  } catch (e) {
    // Fall back to logs dir as a diagnostic signal.
    await invoke("open_logs_dir").catch(() => {});
  }
}

async function retry() {
  showPanel("loading");
  setStatus("Retrying...");
  resetStages();
  try {
    const bp = await invoke("get_books_path").catch(() => null);
    if (bp) {
      await invoke("start_sidecars", { booksPath: bp });
      await invoke("splash_ready").catch(() => {});
    } else {
      showPanel("wizard");
    }
  } catch (e) {
    handleError({ message: String(e) });
  }
}

// ---- Init ----
async function init() {
  // Decide initial panel: wizard if no booksPath stored, else loading.
  const booksPath = internals ? await invoke("get_books_path").catch(() => null) : null;
  if (!booksPath) {
    showPanel("wizard");
  } else {
    showPanel("loading");
    setStage("backend", "active");
  }

  // Wizard panel
  document.getElementById("btn-pick").addEventListener("click", pickFolder);
  btnContinue.addEventListener("click", continueWizard);
  document.getElementById("btn-wizard-quit").addEventListener("click", () => {
    invoke("quit_app").catch(() => {});
  });

  // Ready panel
  document.getElementById("btn-open").addEventListener("click", () => {
    invoke("open_in_browser_and_hide").catch((e) => {
      errorMsgEl.textContent = String(e);
      showPanel("error");
    });
  });
  document.getElementById("btn-change-folder").addEventListener("click", changeFolder);
  document.getElementById("btn-open-dict").addEventListener("click", openDictFolder);
  document.getElementById("btn-ready-quit").addEventListener("click", () => {
    invoke("quit_app").catch(() => {});
  });

  // Error panel
  document.getElementById("btn-retry").addEventListener("click", retry);
  document.getElementById("btn-logs").addEventListener("click", () => {
    invoke("open_logs_dir").catch(() => {});
  });
  document.getElementById("btn-quit").addEventListener("click", () => {
    invoke("quit_app").catch(() => {});
  });

  // Subscribe to splash events from Rust. Tauri v2 event listen path.
  if (internals && internals.event && typeof internals.event.listen === "function") {
    internals.event.listen("splash://progress", (e) => handleProgress(e.payload));
    internals.event.listen("splash://ready", () => handleReady());
    internals.event.listen("splash://error", (e) => handleError(e.payload));
  } else if (internals) {
    const subscribe = (name, cb) => {
      if (!internals.transformCallback) return;
      internals.invoke("plugin:event|listen", {
        event: name,
        target: { kind: "Any" },
        handler: internals.transformCallback((e) => cb(e.payload)),
      });
    };
    subscribe("splash://progress", handleProgress);
    subscribe("splash://ready", handleReady);
    subscribe("splash://error", handleError);
  }

  // Client-side safety timeout in case Rust fails to emit, only while loading.
  setTimeout(() => {
    if (!panels.loading.classList.contains("hidden")) {
      handleError({ message: "Services did not start within 30 seconds." });
    }
  }, 33000);
}

init();
