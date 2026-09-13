#!/usr/bin/env node
// CI check:
// 1. Every locale in i18n.js's `translations` must have the exact same key
//    set. Catches a typo'd/missing/extra key that the runtime console.warn
//    in setLanguage() would otherwise only surface to a real user of that
//    locale.
// 2. Every data-i18n*/data-i18n-placeholder/-alt/-aria-label key referenced
//    in index.html must exist in translations (checked against DEFAULT_LANG,
//    the base locale) — catches a typo'd key in the markup itself. The set
//    of supported data-i18n* attribute suffixes is read directly off
//    i18n.js's own I18N_ATTRS constant (not hand-duplicated or regex-
//    scraped here), so adding a new attribute type to setLanguage() extends
//    this check automatically. For data-i18n-placeholder/-alt/-aria-label
//    specifically (setLanguage() requires these to be strings, unlike
//    data-i18n which also allows arrays), also checks the value is actually
//    a string in every locale that has the key — key existence alone isn't
//    enough, since a wrong-typed value passes "k in baseLocale" but still
//    breaks at runtime.
// 3. index.html's static no-JS <option value="..."> fallback list must list
//    exactly the same language codes AND display text as translations/
//    LANG_LABELS — populateLangSelect() rebuilds the select for JS users,
//    but this static list is a separate, hand-maintained fallback nothing
//    else keeps in sync.
// 4. i18n.js's LANG_LABELS object must have exactly the same locale keys as
//    translations — a 3rd hand-maintained list (display names) that nothing
//    else keeps in sync.
// 5. Runtime smoke test: actually fire i18n.js's DOMContentLoaded listener
//    and call setLanguage() for every locale against a minimal fake DOM
//    carrying every attribute from the same selector part 2 derived, so
//    a throwing bug in populateLangSelect()/initLanguage()/setLanguage()
//    itself is caught too — parts 1-4 only validate the static data.
// 6. i18n.js's DEFAULT_LANG must itself be a real key in translations —
//    initLanguage()'s final fallback is setLanguage(DEFAULT_LANG); if that
//    constant and the translations key ever drift apart, every visitor
//    who falls through to the fallback hits a throw.
// 7. Every data-i18n* attribute actually used in index.html must be one
//    setLanguage() knows about (the reverse of part 2) — catches a typo'd
//    attribute name (e.g. data-i18n-arialabel) that matches neither side
//    and so silently does nothing at runtime.
// 8. Every var(--foo) referenced in index.html or styles.css must be
//    defined in styles.css's :root block — catches a typo'd/renamed CSS
//    custom property, including the inline-SVG color tokens that have no
//    other runtime signal when broken (they just silently fall back to
//    the CSS-wide initial value).
// 9. index.html's <link rel="alternate" hreflang="..."> tags must be just
//    DEFAULT_LANG + x-default (the page is one URL with client-side
//    language switching, not real per-language documents, so hreflang only
//    self-references it). The JSON-LD @graph's WebSite.inLanguage array
//    still must list exactly translations' locales (run through
//    toHtmlLang(), same as document.documentElement.lang) — a hand-
//    maintained locale list (structured data) nothing else keeps in sync.
// 10. i18n.js's hero.subtitle-en key must be byte-identical across every
//     locale — it's documented as a persistent tagline, not a per-locale
//     gloss, and nothing previously enforced that invariant.

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const repoRoot = path.join(__dirname, "..");
const i18nPath = path.join(repoRoot, "i18n.js");
const htmlPath = path.join(repoRoot, "index.html");
const cssPath = path.join(repoRoot, "styles.css");
const code = fs.readFileSync(i18nPath, "utf8");
// Comments stripped once, up front, so no regex scan below can be tripped
// up by markup/declarations mentioned inside an explanatory comment rather
// than live in the page/stylesheet.
const css = fs.readFileSync(cssPath, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
const html = fs.readFileSync(htmlPath, "utf8").replace(/<!--[\s\S]*?-->/g, "");

let failed = false;

function diffSets(label, actual, expected) {
  const actualSet = new Set(actual);
  const expectedSet = new Set(expected);
  const missing = [...expectedSet].filter((x) => !actualSet.has(x));
  const extra = [...actualSet].filter((x) => !expectedSet.has(x));
  if (missing.length) {
    failed = true;
    console.error(`${label} is missing: ${missing.join(", ")}`);
  }
  if (extra.length) {
    failed = true;
    console.error(`${label} has unexpected: ${extra.join(", ")}`);
  }
}

// One sandbox, one execution: a fake DOM rich enough to both read back the
// static translations/LANG_LABELS objects AND, later, actually drive
// setLanguage() end to end (part 5). Previously this ran two separate
// vm.runInContext passes with two independently-stubbed sandboxes, which
// was redundant work and its own source of drift.
let fakeElements = [];
let capturedListener = null;
const fakeSelect = { value: "", innerHTML: "", appendChild: () => {}, addEventListener: () => {} };
const sandbox = {
  console,
  document: {
    addEventListener: (evt, cb) => { if (evt === "DOMContentLoaded") capturedListener = cb; },
    getElementById: (id) => (id === "langSelect" ? fakeSelect : null),
    querySelectorAll: () => fakeElements,
    createElement: () => ({ setAttribute: () => {}, appendChild: () => {} }),
    createTextNode: () => ({}),
    documentElement: {},
  },
  localStorage: (() => {
    const store = {};
    return { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = v; } };
  })(),
  navigator: { language: "en-US" },
};
vm.createContext(sandbox);
vm.runInContext(
  code + "\n;globalThis.translations = translations; globalThis.LANG_LABELS = LANG_LABELS; globalThis.setLanguage = setLanguage; globalThis.DEFAULT_LANG = DEFAULT_LANG; globalThis.I18N_ATTRS = I18N_ATTRS; globalThis.toHtmlLang = toHtmlLang;",
  sandbox,
  { filename: i18nPath }
);

const translations = sandbox.translations;
const langLabels = sandbox.LANG_LABELS;
const locales = Object.keys(translations);

// --- 6. DEFAULT_LANG is a real translations key ---
if (!(sandbox.DEFAULT_LANG in translations)) {
  failed = true;
  console.error(`i18n.js's DEFAULT_LANG ("${sandbox.DEFAULT_LANG}") is not a key in translations — initLanguage()'s fallback would throw.`);
}
const keysets = {};
locales.forEach((locale) => {
  keysets[locale] = new Set(Object.keys(translations[locale]));
});

const allKeys = new Set();
locales.forEach((locale) => keysets[locale].forEach((k) => allKeys.add(k)));

// --- 1. cross-locale key parity ---
locales.forEach((locale) => {
  diffSets(`[${locale}]`, keysets[locale], allKeys);
});

// --- 2 & 7. index.html's data-i18n* attributes: values exist in translations
//            (2), and attribute names are ones setLanguage() knows about (7) —
//            one pass over the markup captures both name and value, instead
//            of two separately-anchored regexes that could drift apart.
const baseLocale = translations[sandbox.DEFAULT_LANG] || translations[locales[0]];
const attrNames = Array.isArray(sandbox.I18N_ATTRS) ? sandbox.I18N_ATTRS : [];
if (attrNames.length === 0) {
  failed = true;
  console.error("i18n.js's I18N_ATTRS was empty or missing — refusing to run a degenerate check.");
}
const attrValuePattern = /\s(data-i18n[a-z-]*)="([^"]*)"/g;
const usedAttrs = new Set();
const htmlKeys = new Set();
const keysByAttr = {};
attrNames.forEach((a) => { keysByAttr[a] = new Set(); });
let m;
while ((m = attrValuePattern.exec(html))) {
  usedAttrs.add(m[1]);
  if (attrNames.includes(m[1])) {
    htmlKeys.add(m[2]);
    keysByAttr[m[1]].add(m[2]);
  }
}
const missingFromTranslations = [...htmlKeys].filter((k) => !(k in baseLocale));
if (missingFromTranslations.length) {
  failed = true;
  console.error(`index.html references key(s) not in translations: ${missingFromTranslations.join(", ")}`);
}
const unknownAttrs = [...usedAttrs].filter((a) => !attrNames.includes(a));
if (unknownAttrs.length) {
  failed = true;
  console.error(`index.html uses data-i18n* attribute(s) setLanguage() doesn't select for (typo?): ${unknownAttrs.join(", ")}`);
}

// data-i18n itself may hold a string or an array (<br>-joined heading);
// every other data-i18n-* attribute (placeholder/alt/aria-label) requires
// a string in every locale, since setLanguage() checks `typeof === "string"`
// and silently clears the attribute otherwise — a value that's merely
// present but non-string in one locale would pass part 2's `k in baseLocale`
// check yet still break at runtime for that locale.
attrNames.filter((a) => a !== "data-i18n").forEach((attr) => {
  keysByAttr[attr].forEach((key) => {
    locales.forEach((locale) => {
      if (Object.prototype.hasOwnProperty.call(translations[locale], key) && typeof translations[locale][key] !== "string") {
        failed = true;
        console.error(`translations["${locale}"]["${key}"] is not a string, but is used via ${attr} in index.html`);
      }
    });
  });
});

// --- 3. static no-JS <option> fallback matches translations' languages + labels ---
const selectMatch = html.match(/<select[^>]*\bid="langSelect"[^>]*>([\s\S]*?)<\/select>/);
if (selectMatch) {
  const options = [...selectMatch[1].matchAll(/<option[^>]*\bvalue="([^"]+)"[^>]*>([^<]*)<\/option>/g)];
  diffSets("#langSelect's static <option> fallback", options.map((mm) => mm[1]), locales);
  options.forEach(([, lang, text]) => {
    if (langLabels[lang] !== undefined && langLabels[lang] !== text) {
      failed = true;
      console.error(`#langSelect's static <option> text for "${lang}" is "${text}" but LANG_LABELS["${lang}"] is "${langLabels[lang]}"`);
    }
  });
} else {
  failed = true;
  console.error("Could not find <select id=\"langSelect\"> in index.html");
}

// --- 4. LANG_LABELS keys match translations' locales ---
diffSets("LANG_LABELS", Object.keys(langLabels), locales);

// --- 5. runtime smoke test: actually run setLanguage() for every locale ---
// Fake elements carrying each data-i18n* attribute (same list part 2 derived,
// so a new attribute type is covered here too), wired to real keys, so
// setLanguage()'s per-element branches (textContent/array-<br>-join/
// placeholder/alt/aria-label/unknown-key-warn) all actually execute.
const stringKey = Object.keys(baseLocale).find((k) => typeof baseLocale[k] === "string");
const arrayKey = Object.keys(baseLocale).find((k) => Array.isArray(baseLocale[k]));
function makeEl(attrs) {
  return {
    style: {},
    firstChild: null,
    getAttribute: (name) => (name in attrs ? attrs[name] : null),
    setAttribute: () => {},
    appendChild: () => {},
    removeChild: () => {},
  };
}
if (attrNames.length) {
  fakeElements = attrNames.flatMap((attr) =>
    attr === "data-i18n" ? [makeEl({ [attr]: stringKey }), makeEl({ [attr]: arrayKey })] : [makeEl({ [attr]: stringKey })]
  );
}
try {
  if (typeof capturedListener !== "function") throw new Error("DOMContentLoaded listener was never registered");
  capturedListener();
  locales.forEach((locale) => sandbox.setLanguage(locale));
} catch (e) {
  failed = true;
  console.error(`Runtime smoke test threw: ${e.stack || e}`);
}

// --- 8. every var(--foo) reference resolves to a defined custom property ---
// Scans the whole stylesheet, not just :root, since some custom properties
// (e.g. --mask-pos) are intentionally scoped to a single selector rather
// than declared globally.
const definedProps = new Set([...css.matchAll(/--[\w-]+(?=\s*:)/g)].map((mm) => mm[0]));
const usedProps = new Set(
  [...html.matchAll(/var\((--[\w-]+)/g), ...css.matchAll(/var\((--[\w-]+)/g)].map((mm) => mm[1])
);
const undefinedProps = [...usedProps].filter((p) => !definedProps.has(p));
if (undefinedProps.length) {
  failed = true;
  console.error(`var() reference(s) to custom propert(y/ies) not defined in styles.css's :root: ${undefinedProps.join(", ")}`);
}

// --- 9. hreflang <link> tags and JSON-LD inLanguage match translations ---
const expectedHtmlLangs = locales.map((l) => sandbox.toHtmlLang(l));

// The page is a single URL with client-side JS language switching, not
// separate per-language documents — so hreflang only self-references the
// one real document (zh-Hant, the DEFAULT_LANG) plus x-default, rather than
// one entry per UI locale pointing at the same URL (which Google can't
// verify as distinct language versions and may ignore the whole set).
const expectedHreflangs = [sandbox.toHtmlLang(sandbox.DEFAULT_LANG)];

// Attribute order within the tag isn't fixed by HTML, so match the whole
// <link> tag first and require rel="alternate" and hreflang="..." to both
// appear somewhere inside it, rather than anchoring on which comes first.
const hreflangs = [...html.matchAll(/<link\b[^>]*>/g)]
  .map((mm) => mm[0])
  .filter((tag) => /\brel="alternate"/.test(tag))
  .map((tag) => tag.match(/\bhreflang="([^"]+)"/))
  .filter(Boolean)
  .map((mm) => mm[1])
  .filter((h) => h !== "x-default");
diffSets("index.html's hreflang tags", hreflangs, expectedHreflangs);

const jsonLdMatch = html.match(/"inLanguage":\s*(\[[^\]]*\])/);
if (jsonLdMatch) {
  diffSets("JSON-LD inLanguage", JSON.parse(jsonLdMatch[1]), expectedHtmlLangs);
} else {
  failed = true;
  console.error("Could not find JSON-LD inLanguage array in index.html");
}

// --- 10. hero.subtitle-en is byte-identical across every locale ---
// i18n.js's header comment documents it as the one .en/-en key that's a
// persistent tagline rather than a per-locale gloss, and calls out that it
// must stay identical everywhere — nothing previously enforced that.
const heroSubtitleEnValues = new Set(locales.map((l) => translations[l]["hero.subtitle-en"]));
if (heroSubtitleEnValues.size > 1) {
  failed = true;
  console.error(`hero.subtitle-en differs across locales (should be identical everywhere): ${[...heroSubtitleEnValues].map((v) => JSON.stringify(v)).join(" vs ")}`);
}

// --- 11. index.html's static data-i18n fallback text matches translations[DEFAULT_LANG] ---
// setLanguage() only overwrites an element's content once DOMContentLoaded
// fires (or once a user picks a non-default language), so index.html's own
// hardcoded markup IS the DEFAULT_LANG content for a no-JS client, most
// non-JS-executing crawlers, and the flash-of-content before JS runs. A
// content rewrite that only touched translations[DEFAULT_LANG] and forgot
// the matching HTML would leave the real page showing stale text while this
// script's other checks (which only look at key names, not content) still
// pass — this check closes that gap for the common case: a leaf element
// (no nested tags besides <br>, used for the handful of two-line headings)
// whose data-i18n value is a plain string or array. Elements with richer
// nested markup are skipped rather than risking a false positive from a
// naive regex tag-matcher.
const dataI18nTagPattern = /<([a-z0-9]+)([^>]*?)\sdata-i18n="([^"]+)"([^>]*)>([^<]*(?:<br\s*\/?>[^<]*)*)<\/\1>/gi;
// The regex reads raw markup, so a literal &, <, > in the fallback text
// necessarily appears entity-escaped in index.html even though
// translations holds the plain character — decode the handful of entities
// actually used on this page before comparing, not a full HTML-entity table.
// &amp; must decode LAST — decoding it first would turn a literal "&amp;lt;"
// (the escaped form of the visible text "&lt;") into "&lt;" and then, on the
// next replace, into "<" — silently corrupting doubly-escaped text instead
// of leaving it alone.
const decodeEntities = (s) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");
let dm;
while ((dm = dataI18nTagPattern.exec(html))) {
  const key = dm[3];
  const rawContent = dm[5];
  const expected = baseLocale[key];
  if (expected === undefined) continue; // already reported by part 2
  const actualLines = rawContent.split(/<br\s*\/?>/i).map((s) => decodeEntities(s.trim()));
  if (Array.isArray(expected)) {
    const expectedLines = expected.map((s) => s.trim());
    if (actualLines.join("\n") !== expectedLines.join("\n")) {
      failed = true;
      console.error(`index.html's static content for data-i18n="${key}" is ${JSON.stringify(actualLines)} but translations["${sandbox.DEFAULT_LANG}"]["${key}"] is ${JSON.stringify(expected)}`);
    }
  } else if (typeof expected === "string") {
    if (actualLines.length > 1) continue; // a <br> where a plain string was expected — shape mismatch, not this check's job
    if (actualLines[0] !== expected.trim()) {
      failed = true;
      console.error(`index.html's static content for data-i18n="${key}" is ${JSON.stringify(actualLines[0])} but translations["${sandbox.DEFAULT_LANG}"]["${key}"] is ${JSON.stringify(expected)}`);
    }
  }
}

if (failed) {
  console.error("\ni18n check FAILED — see errors above.");
  process.exit(1);
}

console.log(`i18n check OK — ${locales.length} locales, ${allKeys.size} keys each, index.html and #langSelect in sync.`);
