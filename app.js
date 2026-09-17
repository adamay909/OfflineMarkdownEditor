import {
  get,
  set as idbSet,
  del as idbDel,
} from "./vendor/idbkeyval/idbkeyval.js";

(async function () {
  "use strict";

  const DRAFT_KEY = "mdeditor:draft";
  const NAME_KEY = "mdeditor:filename";
  const FILE_HANDLE = "mdeditor:filehandle";

  const hasFSAccess =
    "showOpenFilePicker" in window && "showSaveFilePicker" in window;

  const root = document.documentElement;

  const easyMDE = new EasyMDE({
    element: document.getElementById("editor"),
    autoDownloadFontAwesome: false,
    spellChecker: true,
    status: false,
    maxHeight: "calc(100% - 4em)",
    placeholder: "Start writing…",
    toolbar: ["preview", "side-by-side", "fullscreen"],
  });

  if (!hasFSAccess) {
    setupSimple();
    return;
  }

  const wfooter = document.querySelector(".warnFooter");
  wfooter.style.display = "none";

  let fileHandle = null;
  let dirty = false;
  let lastSavedValue = "";

  fileHandle = await idbGet(FILE_HANDLE);
  if (!fileHandle) {
    fileHandle = null;
  }

  const filenameEl = document.getElementById("filename");
  const saveDot = document.getElementById("saveDot");
  const saveStateEl = document.getElementById("saveState");
  const countsEl = document.getElementById("counts");
  const toastEl = document.getElementById("toast");

  let name = await idbGet(NAME_KEY)
 if (name === undefined) {
  name = "untitled.md"
 }
  filenameEl.innerText = name;


  const draft = await idbGet(DRAFT_KEY);
  if (draft !== undefined) {
    easyMDE.value(draft);
    lastSavedValue = draft;
  }

  let lastSavedTime = performance.now();

  setupEventListeners();

  updateCounts();
  setDirty(false);

  setupSW();

  /* ----------------------------------------------------------
     EventListeners
---------------------------------------------------------- */
  function setupEventListeners() {
  
   let saveCurrent = null
    easyMDE.codemirror.on("change", () => {
      clearTimeout(saveCurrent)
      saveCurrent = setTimeout(updateUI, 300)
    });



    window.addEventListener("beforeunload", (e) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    });

    document.getElementById("btnNew").addEventListener("click", doNew);

    document.getElementById("btnOpen").addEventListener("click", doOpen);

    document.getElementById("btnSave").addEventListener("click", doSave);

    document.getElementById("btnSaveAs").addEventListener("click", doSaveAs);


    window.addEventListener("keydown", (e) => {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      const key = e.key.toLowerCase();
      if (key === "s" && e.shiftKey) {
        e.preventDefault();
        doSaveAs();
      } else if (key === "s") {
        e.preventDefault();
        doSave();
      } else if (key === "o") {
        e.preventDefault();
        doOpen();
      } else if (key === "n") {
        e.preventDefault();
        doNew();
      }
    });

    const spTgl = document.getElementById("spellToggle");

    if (spTgl) {
      spTgl.addEventListener("click", (e) => {
        e.preventDefault();
        const css = document.getElementById("spellstyle");
        css.disabled = !css.disabled;

        if (css.disabled) {
          spTgl.innerHTML = "Spellcheck: on";
        } else {
          spTgl.innerHTML = "Spellcheck: off";
        }
      });
    }
  }
    

    window.addEventListener("beforeunload", (e) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    });
  /* ----------------------------------------------------------
     Editor
     ---------------------------------------------------------- */

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

  async function updateCounts() {
    const text = easyMDE.value();
    const words = text.trim().length ? text.trim().split(/\s+/).length : 0;
    countsEl.textContent = `${words} word${words === 1 ? "" : "s"} · ${text.length} character${text.length === 1 ? "" : "s"}`;
  }


  function updateUI() {
      updateCounts();
      setDirty(easyMDE.value() !== lastSavedValue);
      idbSet(DRAFT_KEY, easyMDE.value());
      lastSavedTime = performance.now();
    }

  /* ----------------------------------------------------------
     New
     ---------------------------------------------------------- */
  function doNew() {
    if (dirty && !confirm("Discard unsaved changes and start a new file?"))
      return;
    easyMDE.value("");
    fileHandle = null;
    filenameEl.innerText = "untitled.md";
    idbSet(NAME_KEY, filenameEl.innerText);
    localStorage.removeItem(DRAFT_KEY);
    idbDel(FILE_HANDLE);
    markSaved(false);
    updateCounts();
    toast("New file");
  }

  /* ----------------------------------------------------------
     Open
     ---------------------------------------------------------- */
  async function doOpen() {
    if (dirty && !confirm("Discard unsaved changes and open a different file?"))
      return;

    try {
      const [handle] = await window.showOpenFilePicker({
        types: [
          {
            description: "Markdown / text",
            accept: {
              "text/markdown": [".md", ".markdown"],
              "text/plain": [".txt"],
            },
          },
        ],
        excludeAcceptAllOption: false,
        multiple: false,
      });
      const file = await handle.getFile();
      const text = await file.text();
      fileHandle = handle;
      easyMDE.value(text);
      filenameEl.innerText = file.name;
      idbSet(NAME_KEY, file.name);
      idbSet(DRAFT_KEY, text);
	  idbSet(FILE_HANDLE, flieHandle)
      markSaved(false);
      updateCounts();
      toast(`Opened ${file.name}`);
    } catch (err) {
      if (err && err.name !== "AbortError") console.error(err);
    }
    return;
  }

  /* ----------------------------------------------------------
   File Handling API (OS "Open With")
   ---------------------------------------------------------- */
  if ("launchQueue" in window) {
    window.launchQueue.setConsumer(async (launchParams) => {
      if (!launchParams.files || !launchParams.files.length) return;

      const handle = launchParams.files[0];
      const file = await handle.getFile();
      const text = await file.text();

      if (dirty && !confirm(`Discard unsaved changes and open ${file.name}?`))
        return;

      fileHandle = handle; // reuse it so Ctrl+S saves back to this file
      easyMDE.value(text);
      filenameEl.innerText = file.name;
      idbSet(NAME_KEY, file.name);
      idbSet(DRAFT_KEY, text);
	  idbSet(FILE_HANDLE, fileHandle);
      markSaved(false);
      updateCounts();
      toast(`Opened ${file.name}`);
    });
  }

  /* ----------------------------------------------------------
     Save / Save As
     ---------------------------------------------------------- */

  async function writeToHandle(handle) {
    if (!handle) {
      return;
    }
    const writable = await handle.createWritable();
    await writable.write(easyMDE.value());
    await writable.close();
	idbSet(FILE_HANDLE, handle);
  }

  async function doSave() {
    const name = filenameEl.innerText.trim() || "untitled.md";

    if (!fileHandle) {
	 return
	}
      try {
        await writeToHandle(fileHandle);
        markSaved(true);
        toast(`Saved ${name}`);
      } catch (_) {
        toast("Couldn't save — try Save as");
      }
    await doSaveAs();
  }

  async function doSaveAs() {
    const name = filenameEl.innerText.trim() || "untitled.md";

    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: name,
        types: [
          {
            description: "Markdown",
            accept: { "text/markdown": [".md"] },
          },
        ],
      });
      fileHandle = handle;
      await writeToHandle(handle);
      filenameEl.innerText = handle.name;
      idbSet(NAME_KEY, handle.name);
      markSaved(true);
      toast(`Saved ${handle.name}`);
    } catch (err) {
      if (err && err.name !== "AbortError") console.error(err);
    }
  }

  /* ----------------------------------------------------------
   Autosave 
   ---------------------------------------------------------- */
  const AUTOSAVE_INTERVAL = 30000; // 30s

  setInterval(async () => {
    if (!dirty || !fileHandle) return;
    try {
      await writeToHandle(fileHandle);
      markSaved(false);
    } catch (err) {
      console.error(err);
    }
  }, AUTOSAVE_INTERVAL);

  /* ----------------------------------------------------------
 For browsers without file system access API
---------------------------------------------------------- */

  function setupSimple() {
    const warning = document.querySelector("#nonChromiumWarning");
    warning.showModal();
    const header = document.querySelector("header");
    header.style.display = "none";
    const footer = document.querySelector("footer");
    footer.style.justifyContent = "center";
    const nfooter = document.querySelector(".normalFooter");
    nfooter.style.display = "none";
  }

 /*------------------------------------------------------------
   IndexedDB
  -----------------------------------------------------------*/

  async function idbGet(key) {
    let val = await get(key);
    return val;
  }

  /* ----------------------------------------------------------
   Service Workers 
   ---------------------------------------------------------- */

  function setupSW() {
    const hasSW = "serviceWorker" in navigator;

    if (!hasSW) {
      return;
    }

    navigator.serviceWorker.register("sw.js").then((registration) => {
      if (registration.waiting) {
        notifyUserOfUpdate(registration.waiting);
      }

      registration.addEventListener("updatefound", () => {
        const newWorker = registration.installing;

        newWorker.addEventListener("statechange", () => {
          if (
            newWorker.state === "installed" &&
            navigator.serviceWorker.controller
          ) {
            notifyUserOfUpdate(newWorker);
          }
        });
      });
    });

    navigator.serviceWorker.addEventListener("controllerchange", () => {
      window.location.reload();
    });

    function notifyUserOfUpdate(worker) {
      const updateBanner = document.getElementById("updateNotice");
      updateBanner.style.display = "inline";

      document.getElementById("reloadBtn").onclick = () => {
        worker.postMessage({ type: "SKIP_WAITING" });
      };
    }
  }
})();
