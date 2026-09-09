(() => {
  "use strict";

  const DRAFT_KEY = "mdeditor:draft";
  const NAME_KEY = "mdeditor:filename";

  const hasFSAccess = "showOpenFilePicker" in window && "showSaveFilePicker" in window;


  const root = document.documentElement;

  const easyMDE = new EasyMDE({
    element: document.getElementById("editor"),
    autoDownloadFontAwesome: false,
    spellChecker: true,
    status: false,
    maxHeight: "calc(100% - 4em)",
    placeholder: "Start writing…",
    toolbar: [
      "preview", "side-by-side", "fullscreen"
    ],
  });

  if (!hasFSAccess) {
    const warning=document.querySelector("#nonChromiumWarning")
    warning.showModal();
    const header = document.querySelector("header")
    header.style.display="none"
    const footer = document.querySelector("footer")
    footer.style.justifyContent = "center";
    const nfooter = document.querySelector(".normalFooter")
	nfooter.style.display="none"
   return
  }
    const wfooter = document.querySelector(".warnFooter")
	wfooter.style.display="none"
  
 let fileHandle = null;   
  let dirty = false;
  let lastSavedValue = "";

  const filenameEl = document.getElementById("filename");
  const saveDot = document.getElementById("saveDot");
  const saveStateEl = document.getElementById("saveState");
  const countsEl = document.getElementById("counts");
  const toastEl = document.getElementById("toast");

  filenameEl.value = localStorage.getItem(NAME_KEY) || "untitled.md";
  const draft = localStorage.getItem(DRAFT_KEY);
  if (draft !== null) {
    easyMDE.value(draft);
    lastSavedValue = draft;
  }

  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => toastEl.classList.remove("show"), 1800);
  }

  function setDirty(v) {
    dirty = v;
    saveDot.classList.toggle("dirty", dirty);
    saveDot.title = dirty ? "Unsaved changes" : "All changes saved";
    saveStateEl.textContent = dirty ? "unsaved" : "saved";
  }

  function markSaved(pulse) {
    lastSavedValue = easyMDE.value();
    setDirty(false);
    if (pulse) {
      saveDot.classList.remove("pulse");
      void saveDot.offsetWidth; 
      saveDot.classList.add("pulse");
    }
  }

  function updateCounts() {
    const text = easyMDE.value();
    const words = text.trim().length ? text.trim().split(/\s+/).length : 0;
    countsEl.textContent = `${words} word${words === 1 ? "" : "s"} · ${text.length} character${text.length === 1 ? "" : "s"}`;
  }

  easyMDE.codemirror.on("change", () => {
    updateCounts();
    setDirty(easyMDE.value() !== lastSavedValue);
    localStorage.setItem(DRAFT_KEY, easyMDE.value());
  });
  updateCounts();
  setDirty(false);

  filenameEl.addEventListener("input", () => {
    localStorage.setItem(NAME_KEY, filenameEl.value);
  });
  filenameEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") filenameEl.blur();
  });

  window.addEventListener("beforeunload", (e) => {
    if (dirty) {
      e.preventDefault();
      e.returnValue = "";
    }
  });

  /* ----------------------------------------------------------
     New
     ---------------------------------------------------------- */
  function doNew() {
    if (dirty && !confirm("Discard unsaved changes and start a new file?")) return;
    easyMDE.value("");
    fileHandle = null;
    filenameEl.value = "untitled.md";
    localStorage.setItem(NAME_KEY, filenameEl.value);
    localStorage.removeItem(DRAFT_KEY);
    markSaved(false);
    updateCounts();
    toast("New file");
  }
  document.getElementById("btnNew").addEventListener("click", doNew);

  /* ----------------------------------------------------------
     Open
     ---------------------------------------------------------- */
  async function doOpen() {
    if (dirty && !confirm("Discard unsaved changes and open a different file?")) return;

      try {
        const [handle] = await window.showOpenFilePicker({
          types: [{
            description: "Markdown / text",
            accept: { "text/markdown": [".md", ".markdown"], "text/plain": [".txt"] },
          }],
          excludeAcceptAllOption: false,
          multiple: false,
        });
        const file = await handle.getFile();
        const text = await file.text();
        fileHandle = handle;
        easyMDE.value(text);
        filenameEl.value = file.name;
        localStorage.setItem(NAME_KEY, file.name);
        localStorage.setItem(DRAFT_KEY, text);
        markSaved(false);
        updateCounts();
        toast(`Opened ${file.name}`);
      } catch (err) {
        if (err && err.name !== "AbortError") console.error(err);
      }
      return;
  }
  
 document.getElementById("btnOpen").addEventListener("click", doOpen);

  document.getElementById("fileInput").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    const text = await file.text();
    fileHandle = null;
    easyMDE.value(text);
    filenameEl.value = file.name;
    localStorage.setItem(NAME_KEY, file.name);
    localStorage.setItem(DRAFT_KEY, text);
    markSaved(false);
    updateCounts();
    toast(`Opened ${file.name}`);
  });

/* ----------------------------------------------------------
   File Handling API (OS "Open With")
   ---------------------------------------------------------- */
if ("launchQueue" in window) {
  window.launchQueue.setConsumer(async (launchParams) => {
    if (!launchParams.files || !launchParams.files.length) return;

    const handle = launchParams.files[0];
    const file = await handle.getFile();
    const text = await file.text();

    if (dirty && !confirm(`Discard unsaved changes and open ${file.name}?`)) return;

    fileHandle = handle; // reuse it so Ctrl+S saves back to this file
    easyMDE.value(text);
    filenameEl.value = file.name;
    localStorage.setItem(NAME_KEY, file.name);
    localStorage.setItem(DRAFT_KEY, text);
    markSaved(false);
    updateCounts();
    toast(`Opened ${file.name}`);
  });
}

  /* ----------------------------------------------------------
     Save / Save As
     ---------------------------------------------------------- */

  async function writeToHandle(handle) {
    const writable = await handle.createWritable();
    await writable.write(easyMDE.value());
    await writable.close();
  }

  async function doSave() {
    const name = filenameEl.value.trim() || "untitled.md";


    if (fileHandle) {
      try {
        await writeToHandle(fileHandle);
        markSaved(true);
        toast(`Saved ${name}`);
      } catch (err) {
        console.error(err);
        toast("Couldn't save — try Save as");
      }
      return;
    }

    await doSaveAs();
  }

  async function doSaveAs() {
    const name = filenameEl.value.trim() || "untitled.md";


    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: name,
        types: [{
          description: "Markdown",
          accept: { "text/markdown": [".md"] },
        }],
      });
      fileHandle = handle;
      await writeToHandle(handle);
      filenameEl.value = handle.name;
      localStorage.setItem(NAME_KEY, handle.name);
      markSaved(true);
      toast(`Saved ${handle.name}`);
    } catch (err) {
      if (err && err.name !== "AbortError") console.error(err);
    }
  }

  document.getElementById("btnSave").addEventListener("click", doSave);
  document.getElementById("btnSaveAs").addEventListener("click", doSaveAs);

/* ----------------------------------------------------------
   Autosave 
   ---------------------------------------------------------- */
const AUTOSAVE_INTERVAL = 30000; // 30s

setInterval(async () => {
  if (!dirty || !fileHandle) return;
  try {
    await writeToHandle(fileHandle);
    markSaved(true);
    toast("Autosaved");
  } catch (err) {
    console.error(err);
  }
}, AUTOSAVE_INTERVAL);

  /* ----------------------------------------------------------
     Keyboard shortcuts
     ---------------------------------------------------------- */
  window.addEventListener("keydown", (e) => {
    const mod = e.ctrlKey || e.metaKey;
    if (!mod) return;
    const key = e.key.toLowerCase();
    if (key === "s" && e.shiftKey) { e.preventDefault(); doSaveAs(); }
    else if (key === "s") { e.preventDefault(); doSave(); }
    else if (key === "o") { e.preventDefault(); doOpen(); }
    else if (key === "n") { e.preventDefault(); doNew(); }
  });

  /* ----------------------------------------------------------
     Toggle Spellcheck
	 (spell checking is always on. What this does is show/hide
	 highlighting of errors)
     ---------------------------------------------------------- */

const spTgl = document.getElementById("spellToggle")
if (!spTgl) {
 console.log("not found")
}
if (spTgl) {
spTgl.addEventListener("click", toggleSpellcheck)
}
function toggleSpellcheck(e) {
 e.preventDefault();
 const css = document.getElementById("spellstyle")
 css.disabled = !css.disabled

 if (css.disabled) {
  spTgl.innerHTML="Spellcheck: on"
 } else {
  spTgl.innerHTML="Spellcheck: off"
}
}
  /* ----------------------------------------------------------
     Service worker
     ---------------------------------------------------------- */

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register('sw.js').then((registration) => {
    
    if (registration.waiting) {
      notifyUserOfUpdate(registration.waiting);
    }

    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          notifyUserOfUpdate(newWorker);
        }
      });
    });
  });

  navigator.serviceWorker.addEventListener('controllerchange', () => {
      refreshing = true;
      window.location.reload();
  });
}

function notifyUserOfUpdate(worker) {
  const updateBanner = document.getElementById('updateNotice');
  updateBanner.style.display = "inline";

  document.getElementById('reloadBtn').onclick = () => {
    worker.postMessage({ type: 'SKIP_WAITING' });
  };
}
})();
