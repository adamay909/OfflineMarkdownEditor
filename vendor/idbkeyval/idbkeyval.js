/**
 * Bundled by jsDelivr using Rollup v4.62.2 and esbuild v0.28.1.
 * Original file: /npm/idb-keyval@6.3.0/dist/index.js
 *
 * Do NOT use SRI with dynamically generated files! More information: https://www.jsdelivr.com/using-sri-with-dynamic-files
 */
function u(t) {
  return new Promise((e, n) => {
    ((t.oncomplete = t.onsuccess = () => e(t.result)),
      (t.onabort = t.onerror = () => n(t.error)));
  });
}
function f(t, e) {
  let n;
  const r = () => {
    if (n) return n;
    const o = indexedDB.open(t);
    return (
      (o.onupgradeneeded = () => o.result.createObjectStore(e)),
      (n = u(o)),
      n.then(
        (a) => {
          a.onclose = () => (n = void 0);
        },
        () => {
          n = void 0;
        },
      ),
      n
    );
  };
  return (o, a) => r().then((c) => a(c.transaction(e, o).objectStore(e)));
}
let l;
function i() {
  return (l || (l = f("keyval-store", "keyval")), l);
}
function y(t, e = i()) {
  return e("readonly", (n) => u(n.get(t)));
}
function h(t, e, n = i()) {
  return n("readwrite", (r) => (r.put(e, t), u(r.transaction)));
}
function p(t, e = i()) {
  return e(
    "readwrite",
    (n) => (t.forEach((r) => n.put(r[1], r[0])), u(n.transaction)),
  );
}
function g(t, e = i()) {
  return e("readonly", (n) => Promise.all(t.map((r) => u(n.get(r)))));
}
function m(t, e, n = i()) {
  return n(
    "readwrite",
    (r) =>
      new Promise((o, a) => {
        const c = r.get(t);
        ((c.onsuccess = function () {
          try {
            (r.put(e(c.result), t), o(u(r.transaction)));
          } catch (d) {
            a(d);
          }
        }),
          (c.onerror = () => a(c.error)));
      }),
  );
}
function w(t, e = i()) {
  return e("readwrite", (n) => (n.delete(t), u(n.transaction)));
}
function A(t, e = i()) {
  return e(
    "readwrite",
    (n) => (t.forEach((r) => n.delete(r)), u(n.transaction)),
  );
}
function v(t = i()) {
  return t("readwrite", (e) => (e.clear(), u(e.transaction)));
}
function s(t, e) {
  return (
    (t.openCursor().onsuccess = function () {
      this.result && (e(this.result), this.result.continue());
    }),
    u(t.transaction)
  );
}
function S(t = i()) {
  return t("readonly", (e) => {
    if (e.getAllKeys) return u(e.getAllKeys());
    const n = [];
    return s(e, (r) => n.push(r.key)).then(() => n);
  });
}
function b(t = i()) {
  return t("readonly", (e) => {
    if (e.getAll) return u(e.getAll());
    const n = [];
    return s(e, (r) => n.push(r.value)).then(() => n);
  });
}
function k(t = i()) {
  return t("readonly", (e) => {
    if (e.getAll && e.getAllKeys)
      return Promise.all([u(e.getAllKeys()), u(e.getAll())]).then(([r, o]) =>
        r.map((a, c) => [a, o[c]]),
      );
    const n = [];
    return s(e, (r) => n.push([r.key, r.value])).then(() => n);
  });
}
export {
  v as clear,
  f as createStore,
  w as del,
  A as delMany,
  k as entries,
  y as get,
  g as getMany,
  S as keys,
  u as promisifyRequest,
  h as set,
  p as setMany,
  m as update,
  b as values,
};
//# sourceMappingURL=/sm/1d6a86c53a3dc3c070ad7d6184ae675bad7e5dcbaac0adb2b2f79404ada88677.map
