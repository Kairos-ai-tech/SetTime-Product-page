#!/usr/bin/env node
// Prerenders one static page per non-default locale (/en/, /ja/, ...) from
// index.html + i18n.js so each language has its own crawlable URL, then
// keeps the hreflang block, sitemap.xml and sitemap.txt in step.
//
//   node scripts/build-locales.mjs          write files
//   node scripts/build-locales.mjs --check  exit 1 if any file is stale (CI)
//
// index.html stays the single source of truth (zh-Hant, at "/"); the
// generated <lang>/index.html files are committed because the site is served
// as-is from GitHub Pages with no build step.

import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SITE = "https://settime.kairosaitech.com";
const check = process.argv.includes("--check");

const read = (f) => fs.readFileSync(path.join(root, f), "utf8");
const { translations, DEFAULT_LANG } = vm.runInNewContext(
  read("i18n.js") + "\n;({ translations, DEFAULT_LANG })",
  { document: { addEventListener() {} }, navigator: {}, console }
);

const LOCALES = Object.keys(translations).filter((l) => l !== DEFAULT_LANG);
const OG_LOCALE = { en: "en_US", ja: "ja_JP", es: "es_ES", fr: "fr_FR", de: "de_DE", it: "it_IT", pt: "pt_BR" };

const META = {
  en: {
    title: "SetTime | AI Preconstruction: Rebar, Concrete & Formwork",
    description: "SetTime is AI preconstruction software for fabricators: from months to minutes. Rebar takeoff, bar schedule (.xlsm) and shop drawings (.dwg/DXF) are shipping via an AutoCAD 2021 plugin and desktop app; concrete and formwork quantities are in development; MEP and HVAC are planned. Built by Kairos.ai. Send one drawing for a free takeoff within 24 hours.",
  },
  ja: {
    title: "SetTime | AI プレコンストラクション：鉄筋・コンクリート・型枠",
    description: "SetTime は加工会社向けの AI プレコンストラクション・ソフトウェアで、数か月から数分へ。鉄筋の積算、加工表（.xlsm）、加工図（.dwg/DXF）は AutoCAD 2021 プラグインとデスクトップ版で提供中、コンクリート・型枠の数量は開発中、設備（MEP）と空調（HVAC）は計画中。Kairos.ai 開発。図面を 1 枚送るだけで、24 時間以内に無料で積算します。",
  },
  es: {
    title: "SetTime | Preconstrucción con IA: armaduras, hormigón y encofrado",
    description: "SetTime es software de preconstrucción con IA para fabricantes: de meses a minutos. El cómputo de armaduras, la lista (.xlsm) y los planos de taller (.dwg/DXF) ya están disponibles con plugin de AutoCAD 2021 y app de escritorio; hormigón y encofrado están en desarrollo; instalaciones (MEP) y climatización (HVAC) están planificadas. Desarrollado por Kairos.ai. Envíe un plano y reciba el cómputo gratis en 24 horas.",
  },
  fr: {
    title: "SetTime | Préconstruction par IA : armatures, béton et coffrage",
    description: "SetTime est un logiciel de préconstruction par IA pour les fabricants : des mois aux minutes. Le métré d'armatures, la nomenclature (.xlsm) et les plans d'atelier (.dwg/DXF) sont disponibles via un plugin AutoCAD 2021 et une application de bureau ; béton et coffrage sont en développement ; lots techniques (MEP) et CVC (HVAC) sont prévus. Développé par Kairos.ai. Envoyez un plan, métré gratuit sous 24 heures.",
  },
  de: {
    title: "SetTime | KI-Bauvorbereitung: Bewehrung, Beton und Schalung",
    description: "SetTime ist KI-Software für die Bauvorbereitung (Preconstruction) in Betrieben: von Monaten auf Minuten. Bewehrungsermittlung, Liste (.xlsm) und Werkstattzeichnungen (.dwg/DXF) sind per AutoCAD-2021-Plugin und Desktop-App verfügbar; Beton und Schalung sind in Entwicklung; MEP und HVAC sind geplant. Entwickelt von Kairos.ai. Einen Plan senden, kostenlose Ermittlung binnen 24 Stunden.",
  },
  it: {
    title: "SetTime | Precostruzione con IA: armature, calcestruzzo e casseratura",
    description: "SetTime è software di precostruzione con IA per le officine: da mesi a minuti. Computo armature, distinta (.xlsm) e disegni di officina (.dwg/DXF) sono disponibili con plugin AutoCAD 2021 e app desktop; calcestruzzo e casseratura sono in sviluppo; impianti (MEP) e climatizzazione (HVAC) sono pianificati. Sviluppato da Kairos.ai. Invii un disegno, computo gratuito entro 24 ore.",
  },
  pt: {
    title: "SetTime | Pré-construção com IA: armaduras, concreto e fôrmas",
    description: "O SetTime é software de pré-construção com IA para fabricantes: de meses a minutos. O levantamento de armaduras, a lista (.xlsm) e os desenhos de oficina (.dwg/DXF) já estão disponíveis com plugin AutoCAD 2021 e app desktop; concreto e fôrmas estão em desenvolvimento; instalações (MEP) e climatização (HVAC) estão planejadas. Desenvolvido pela Kairos.ai. Envie um desenho e receba o levantamento grátis em 24 horas.",
  },
};

const htmlLang = (l) => (l === DEFAULT_LANG ? "zh-Hant" : l);
const urlFor = (l) => (l === DEFAULT_LANG ? `${SITE}/` : `${SITE}/${l}/`);
const escText = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const escAttr = (s) => escText(s).replace(/"/g, "&quot;");

const ALTERNATES = [
  ...Object.keys(translations).map((l) => ({ hreflang: htmlLang(l), href: urlFor(l) })),
  { hreflang: "x-default", href: urlFor(DEFAULT_LANG) },
];

const hreflangLinks = (indent, tag) =>
  ALTERNATES.map((a) =>
    tag === "html"
      ? `${indent}<link rel="alternate" hreflang="${a.hreflang}" href="${a.href}">`
      : `${indent}<xhtml:link rel="alternate" hreflang="${a.hreflang}" href="${a.href}"/>`
  ).join("\n");

const HREFLANG_RE = /(?:[ \t]*<link rel="alternate" hreflang="[^"]*" href="[^"]*">\n)+/;

function setAttr(tag, name, value) {
  const re = new RegExp(`(\\s${name}=")[^"]*(")`);
  if (re.test(tag)) return tag.replace(re, (_, a, b) => a + escAttr(value) + b);
  return tag.replace(/\s*(\/?)>$/, ` ${name}="${escAttr(value)}"$1>`);
}

function setMeta(html, attr, key, value) {
  const re = new RegExp(`(<meta ${attr}="${key}" content=")[^"]*(")`);
  if (!re.test(html)) throw new Error(`meta ${attr}=${key} not found`);
  return html.replace(re, (_, a, b) => a + escAttr(value) + b);
}

function translateJsonLd(json, lang) {
  const t = translations[lang];
  const url = urlFor(lang);
  const keyOf = new Map(Object.entries(translations[DEFAULT_LANG]).filter(([, v]) => typeof v === "string" && v).map(([k, v]) => [v, k]));
  const walk = (n, key) => {
    if (typeof n === "string") {
      if (key === "inLanguage" && n === htmlLang(DEFAULT_LANG)) return htmlLang(lang);
      if (n.startsWith(`${SITE}/#`)) return url + n.slice(SITE.length + 1);
      const k = keyOf.get(n);
      return k && typeof t[k] === "string" && t[k] ? t[k] : n;
    }
    if (Array.isArray(n)) return n.map((v) => walk(v, key));
    if (n && typeof n === "object") {
      const o = Object.fromEntries(Object.entries(n).map(([k, v]) => [k, walk(v, k)]));
      if (o["@type"] === "WebPage") Object.assign(o, { url, description: META[lang].description });
      if (o["@type"] === "HowTo") Object.assign(o, { name: [].concat(t["howto.heading"]).join(" "), description: t["howto.lead"] });
      return o;
    }
    return n;
  };
  return walk(json);
}

function renderLocale(src, lang) {
  const t = translations[lang];
  let html = src;

  html = html.replace(/<html lang="[^"]*"/, `<html lang="${htmlLang(lang)}" data-pinned-lang="${lang}"`);

  html = html.replace(
    /<(\w+)([^>]*?)\sdata-i18n="([^"]+)"([^>]*)>([\s\S]*?)<\/\1>/g,
    (_full, tag, pre, key, post) => {
      const val = t[key];
      if (val === undefined) throw new Error(`missing key ${key} for ${lang}`);
      let attrs = `${pre} data-i18n="${key}"${post}`;
      if (val === "") attrs = attrs.replace(/\sstyle="[^"]*"/, "") + ' style="display:none"';
      const inner = Array.isArray(val) ? val.map(escText).join("<br>") : escText(val);
      return `<${tag}${attrs}>${inner}</${tag}>`;
    }
  );

  const simple = [
    ["data-i18n-placeholder", "placeholder"],
    ["data-i18n-alt", "alt"],
    ["data-i18n-aria-label", "aria-label"],
  ];
  html = html.replace(/<\w+\s[^>]*\bdata-i18n-(?:placeholder|alt|aria-label)="[^"]*"[^>]*>/g, (tag) => {
    for (const [dataAttr, attr] of simple) {
      const m = tag.match(new RegExp(`\\s${dataAttr}="([^"]*)"`));
      if (!m) continue;
      if (typeof t[m[1]] !== "string") throw new Error(`bad key ${m[1]} for ${lang}`);
      tag = setAttr(tag, attr, t[m[1]]);
    }
    return tag;
  });

  const meta = META[lang];
  const url = urlFor(lang);
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${escText(meta.title)}</title>`);
  html = setMeta(html, "name", "description", meta.description);
  html = setMeta(html, "property", "og:title", meta.title);
  html = setMeta(html, "property", "og:description", meta.description);
  html = setMeta(html, "property", "og:url", url);
  html = setMeta(html, "property", "og:locale", OG_LOCALE[lang]);
  html = setMeta(html, "name", "twitter:title", meta.title);
  html = setMeta(html, "name", "twitter:description", meta.description);
  html = html.replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${url}$2`);

  html = html.replace(
    /(<script type="application\/ld\+json">)([\s\S]*?)(<\/script>)/,
    (_, a, body, c) => a + "\n" + JSON.stringify(translateJsonLd(JSON.parse(body), lang), null, 2).replace(/^/gm, "  ") + "\n  " + c
  );

  html = html.replace(/(\b(?:src|href|poster)=")(?!https?:|\/|#|mailto:|data:)/g, "$1/");
  html = html.replace(/"\.\/vendor\//g, '"/vendor/');

  return html;
}

const out = new Map();
const index = read("index.html");

if (!HREFLANG_RE.test(index)) throw new Error("hreflang block not found in index.html");
const rootIndex = index.replace(HREFLANG_RE, () => hreflangLinks("  ", "html") + "\n");
out.set("index.html", rootIndex);
for (const lang of LOCALES) out.set(`${lang}/index.html`, renderLocale(rootIndex, lang));

const sitemap = read("sitemap.xml");
const firstUrl = sitemap.match(/  <url>[\s\S]*?<\/url>\n/)[0];
const rootBlock = firstUrl.replace(/(?:\s*<xhtml:link [^>]*\/>)+/, "\n" + hreflangLinks("    ", "xml"));
const lastmod = rootBlock.match(/<lastmod>([^<]+)</)[1];
const localeBlocks = LOCALES.map(
  (l) => `  <url>
    <loc>${urlFor(l)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
${hreflangLinks("    ", "xml")}
  </url>
`
).join("");
const pageUrls = new Set([DEFAULT_LANG, ...LOCALES].map((l) => urlFor(l)));
const extraBlocks = (sitemap.match(/  <url>[\s\S]*?<\/url>\n/g) || []).filter((b) => !pageUrls.has(b.match(/<loc>([^<]+)</)[1]));
const extraLocs = extraBlocks.map((b) => b.match(/<loc>([^<]+)</)[1]);
out.set("sitemap.xml", sitemap.slice(0, sitemap.indexOf(firstUrl)) + rootBlock + localeBlocks + extraBlocks.join("") + "</urlset>\n");
out.set("sitemap.txt", [...Object.keys(translations).map(urlFor), ...extraLocs].join("\n") + "\n");

let stale = 0;
for (const [file, content] of out) {
  const full = path.join(root, file);
  const current = fs.existsSync(full) ? fs.readFileSync(full, "utf8") : null;
  if (current === content) continue;
  stale++;
  if (check) {
    console.error(`stale: ${file}`);
  } else {
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content);
    console.log(`wrote ${file}`);
  }
}
if (check && stale) {
  console.error("run: node scripts/build-locales.mjs");
  process.exit(1);
}
if (!stale) console.log("up to date");
