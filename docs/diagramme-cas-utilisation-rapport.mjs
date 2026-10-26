// Génère le diagramme de cas d'utilisation cohérent avec le vrai projet.
// Même style que l'image d'origine : fond bleu, ellipses crème, acteurs bâton, «include» en pointillés.
// Sortie : docs/diagramme-cas-utilisation-rapport.png
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const puppeteer = require('puppeteer-core')

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const CHROME = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
].find((p) => fs.existsSync(p))

// ─── Dimensions ──────────────────────────────────────────────────────────────
const W = 2000, H = 1640
const RX = 148, RY = 52   // demi-axes des ellipses

// ─── Palette (style original) ────────────────────────────────────────────────
const SYS_FILL   = '#e8f0fb'  // fond bleu clair du système
const SYS_BORDER = '#4a7aaf'  // bordure bleue
const UC_FILL    = '#fefde8'  // fond crème des ellipses
const UC_BORDER  = '#b89a0a'  // bordure dorée
const INK        = '#1a1a1a'  // texte
const LINE_C     = '#2a2a2a'  // lignes acteur→UC
const DASH_C     = '#333333'  // flèches «include»

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// ─── Cas d'utilisation ───────────────────────────────────────────────────────
// Colonne gauche (Gestionnaire) : 7 UCs, cx=450, de cy=430 à cy=1468 (pas=173)
// Colonne droite  (Technicien)  : 6 UCs, cx=1550, de cy=430 à cy=1295 (pas=173)
// Partagé en haut au centre     : S'authentifier cx=1000, cy=260
const ucs = {
  AUTH:    { cx: 1000, cy: 260,  lines: ["S'authentifier"] },

  // Gestionnaire
  G_DASH:  { cx: 450,  cy: 430,  lines: ['Consulter le', 'tableau de bord'] },
  G_RES:   { cx: 450,  cy: 603,  lines: ['Gérer les techniciens', 'et projets'] },
  G_PLAN:  { cx: 450,  cy: 776,  lines: ['Gérer le planning', '(drag-and-drop)'] },
  G_VFRA:  { cx: 450,  cy: 949,  lines: ['Valider / Refuser', 'une demande de frais'] },
  G_VRAP:  { cx: 450,  cy: 1122, lines: ['Valider les rapports', "d'intervention"] },
  G_MAT:   { cx: 450,  cy: 1295, lines: ['Gérer les', 'matériaux'] },
  G_RESET: { cx: 450,  cy: 1468, lines: ['Réinitialiser le mot', "de passe d'un technicien"] },

  // Technicien
  T_PLAN:  { cx: 1550, cy: 430,  lines: ['Consulter', 'son planning'] },
  T_RAP:   { cx: 1550, cy: 603,  lines: ['Saisir un rapport', "d'intervention"] },
  T_FRAIS: { cx: 1550, cy: 776,  lines: ['Soumettre une', 'demande de frais'] },
  T_JUST:  { cx: 1550, cy: 949,  lines: ['Joindre un', 'justificatif'] },
  T_HIST:  { cx: 1550, cy: 1122, lines: ["Consulter l'historique", 'de frais'] },
  T_MDP:   { cx: 1550, cy: 1295, lines: ['Changer son', 'mot de passe'] },
}

// ─── Acteurs ─────────────────────────────────────────────────────────────────
const gestActor = { x: 80,   y: 870, label: 'Gestionnaire' }
const techActor = { x: 1920, y: 870, label: 'Technicien'  }

// ─── Helpers ─────────────────────────────────────────────────────────────────
function anchor(key, side) {
  const u = ucs[key]
  if (side === 'L') return { x: u.cx - RX, y: u.cy }
  if (side === 'R') return { x: u.cx + RX, y: u.cy }
  if (side === 'T') return { x: u.cx, y: u.cy - RY }
  return { x: u.cx, y: u.cy + RY }  // 'B'
}

function ellipseText(uc) {
  const { cx, cy, lines } = uc
  const lh = 30
  const startY = cy - ((lines.length - 1) * lh) / 2 + 9
  return lines
    .map((l, i) =>
      `<text x="${cx}" y="${startY + i * lh}" text-anchor="middle" `+
      `font-size="22" font-weight="600" fill="${INK}" font-family="Arial,sans-serif">${esc(l)}</text>`
    ).join('')
}

function actorSvg({ x, y, label }) {
  return `
    <g stroke="${INK}" stroke-width="3.5" fill="none">
      <circle cx="${x}" cy="${y - 75}" r="26" fill="#fff" stroke="${INK}"/>
      <line x1="${x}"     y1="${y - 49}" x2="${x}"     y2="${y + 28}"/>
      <line x1="${x - 40}" y1="${y - 20}" x2="${x + 40}" y2="${y - 20}"/>
      <line x1="${x}"     y1="${y + 28}" x2="${x - 34}" y2="${y + 88}"/>
      <line x1="${x}"     y1="${y + 28}" x2="${x + 34}" y2="${y + 88}"/>
    </g>
    <text x="${x}" y="${y + 128}" text-anchor="middle"
          font-size="28" font-weight="700" fill="${INK}" font-family="Arial,sans-serif">${esc(label)}</text>`
}

// ─── Lignes acteur → cas d'utilisation ───────────────────────────────────────
const gestKeys = ['AUTH','G_DASH','G_RES','G_PLAN','G_VFRA','G_VRAP','G_MAT','G_RESET']
const techKeys = ['AUTH','T_PLAN','T_RAP','T_FRAIS','T_HIST','T_MDP']

let connLines = ''
for (const k of gestKeys) {
  const p = anchor(k, 'L')
  connLines += `<line x1="${gestActor.x + 26}" y1="${gestActor.y - 20}" x2="${p.x}" y2="${p.y}" stroke="${LINE_C}" stroke-width="2"/>\n`
}
for (const k of techKeys) {
  const p = anchor(k, 'R')
  connLines += `<line x1="${techActor.x - 26}" y1="${techActor.y - 20}" x2="${p.x}" y2="${p.y}" stroke="${LINE_C}" stroke-width="2"/>\n`
}

// ─── Flèches «include» ───────────────────────────────────────────────────────
// 1) Soumettre une demande de frais  ──«include»──▶  Joindre un justificatif
const iF = anchor('T_FRAIS', 'B')
const iT = anchor('T_JUST',  'T')
const midInclude1 = { x: (iF.x + iT.x) / 2, y: (iF.y + iT.y) / 2 }

// 2) Valider/Refuser demande de frais  ──«include»──▶  S'authentifier
const iF2 = anchor('G_VFRA', 'T')
const iT2 = anchor('AUTH', 'L')
const midInclude2 = { x: (iF2.x + iT2.x) / 2 - 30, y: (iF2.y + iT2.y) / 2 }

// 3) Consulter l'historique  ──«include»──▶  S'authentifier
const iF3 = anchor('T_HIST', 'T')
const iT3 = anchor('AUTH', 'R')
const midInclude3 = { x: (iF3.x + iT3.x) / 2 + 20, y: (iF3.y + iT3.y) / 2 }

const includeArrows = `
  <!-- include 1 : Soumettre → Joindre justificatif -->
  <line x1="${iF.x}" y1="${iF.y}" x2="${iT.x}" y2="${iT.y + 4}"
        stroke="${DASH_C}" stroke-width="2.5" stroke-dasharray="10 6" marker-end="url(#arr)"/>
  <rect x="${midInclude1.x - 62}" y="${midInclude1.y - 16}" width="128" height="24" rx="3" fill="${SYS_FILL}"/>
  <text x="${midInclude1.x}" y="${midInclude1.y + 3}" text-anchor="middle"
        font-size="20" font-style="italic" fill="${DASH_C}" font-family="Arial,sans-serif">&#171;include&#187;</text>

  <!-- include 2 : Valider/Refuser → S'authentifier -->
  <line x1="${iF2.x}" y1="${iF2.y}" x2="${iT2.x + 4}" y2="${iT2.y}"
        stroke="${DASH_C}" stroke-width="2.5" stroke-dasharray="10 6" marker-end="url(#arr)"/>
  <rect x="${midInclude2.x - 62}" y="${midInclude2.y - 16}" width="128" height="24" rx="3" fill="${SYS_FILL}"/>
  <text x="${midInclude2.x}" y="${midInclude2.y + 3}" text-anchor="middle"
        font-size="20" font-style="italic" fill="${DASH_C}" font-family="Arial,sans-serif">&#171;include&#187;</text>

  <!-- include 3 : Consulter historique → S'authentifier -->
  <line x1="${iF3.x}" y1="${iF3.y}" x2="${iT3.x - 4}" y2="${iT3.y}"
        stroke="${DASH_C}" stroke-width="2.5" stroke-dasharray="10 6" marker-end="url(#arr)"/>
  <rect x="${midInclude3.x - 62}" y="${midInclude3.y - 16}" width="128" height="24" rx="3" fill="${SYS_FILL}"/>
  <text x="${midInclude3.x}" y="${midInclude3.y + 3}" text-anchor="middle"
        font-size="20" font-style="italic" fill="${DASH_C}" font-family="Arial,sans-serif">&#171;include&#187;</text>`

// ─── Ellipses + labels ───────────────────────────────────────────────────────
let ellipseSvg = '', labelSvg = ''
for (const uc of Object.values(ucs)) {
  ellipseSvg += `<ellipse cx="${uc.cx}" cy="${uc.cy}" rx="${RX}" ry="${RY}" fill="${UC_FILL}" stroke="${UC_BORDER}" stroke-width="2.5"/>\n`
  labelSvg   += ellipseText(uc)
}

// ─── Légende ─────────────────────────────────────────────────────────────────
const legendSvg = `
  <rect x="1645" y="1530" width="310" height="86" rx="8" fill="#fff" stroke="#aaa" stroke-width="1.5"/>
  <line x1="1665" y1="1558" x2="1710" y2="1558" stroke="${LINE_C}" stroke-width="2"/>
  <text x="1720" y="1563" font-size="21" fill="${INK}" font-family="Arial,sans-serif">association</text>
  <line x1="1665" y1="1591" x2="1710" y2="1591" stroke="${DASH_C}" stroke-width="2"
        stroke-dasharray="8 5" marker-end="url(#arr)"/>
  <text x="1720" y="1596" font-size="21" fill="${INK}" font-family="Arial,sans-serif">&#171;include&#187;</text>`

// ─── SVG final ───────────────────────────────────────────────────────────────
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <marker id="arr" markerWidth="12" markerHeight="10" refX="10" refY="5" orient="auto">
      <path d="M0,0 L11,5 L0,10 Z" fill="${DASH_C}"/>
    </marker>
  </defs>
  <rect width="${W}" height="${H}" fill="#ffffff"/>

  <!-- Frontière du système -->
  <rect x="215" y="90" width="1570" height="1510" rx="18"
        fill="${SYS_FILL}" stroke="${SYS_BORDER}" stroke-width="3"/>
  <text x="1000" y="150" text-anchor="middle" font-size="30" font-weight="700"
        fill="#1e3a5f" font-family="Arial,sans-serif">Système : Application de Gestion des Frais de Déplacement</text>

  ${connLines}
  ${ellipseSvg}
  ${labelSvg}
  ${includeArrows}
  ${actorSvg(gestActor)}
  ${actorSvg(techActor)}
  ${legendSvg}
</svg>`

// ─── Rendu PNG via Chrome ─────────────────────────────────────────────────────
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] })
try {
  const page = await browser.newPage()
  await page.setViewport({ width: W, height: H, deviceScaleFactor: 2 })
  await page.setContent(
    `<!DOCTYPE html><html><head><meta charset="utf-8">
     <style>body{margin:0;background:#fff}</style></head>
     <body>${svgContent}</body></html>`,
    { waitUntil: 'load' }
  )
  await new Promise((r) => setTimeout(r, 300))
  const el = await page.$('svg')
  const outPath = path.join(__dirname, 'diagramme-cas-utilisation-rapport.png')
  await el.screenshot({ path: outPath })
  console.log('OK diagramme-cas-utilisation-rapport.png')
} finally {
  await browser.close()
}
