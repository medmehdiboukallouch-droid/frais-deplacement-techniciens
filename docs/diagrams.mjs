// Génère deux images PNG haute résolution :
//   - docs/diagramme-classe.png            (via Mermaid, classDiagram)
//   - docs/diagramme-cas-utilisation.png   (SVG fait main : acteurs + cas d'utilisation)
// Usage : node docs/diagrams.mjs
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const puppeteer = require('puppeteer-core')

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const mermaidJs = require.resolve('mermaid/dist/mermaid.min.js')

const CHROME = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
].find((p) => fs.existsSync(p))

// ───────────────────────────────────────────────────────────────────────────
// 1) DIAGRAMME DE CLASSES (Mermaid)
// ───────────────────────────────────────────────────────────────────────────
const classDef = `
classDiagram
direction LR

class User {
  +int id
  +string nom
  +string prenom
  +string email
  +string motDePasse
  +string role
  +bool actif
}
class Technicien {
  +int id
  +string matricule
  +string telephone
  +string service
  +string ville
}
class Gestionnaire {
  +int id
  +string departement
}
class Intervention {
  +int id
  +string titre
  +string lieuDepart
  +string lieuArrivee
  +datetime dateDebut
  +datetime dateFin
  +string statut
}
class Rapport {
  +int id
  +date date
  +bool presenceConfirmee
  +json materielUtilise
  +string tempsPasse
  +string statut
}
class FraisDeplacement {
  +int id
  +string typeFrais
  +decimal montant
  +string devise
  +date dateFrais
  +string justificatifUrl
  +string statutValidation
}
class Validation {
  +int id
  +string decision
  +string commentaire
  +datetime dateDecision
}
class Projet {
  +int id
  +string nom
  +string client
  +string localisation
  +string statut
}
class Materiau {
  +int id
  +string reference
  +string nom
  +string categorie
  +int quantiteStock
  +decimal prixUnitaire
}

User "1" --> "0..1" Technicien : possède
User "1" --> "0..1" Gestionnaire : possède
User "1" --> "0..*" Projet : crée
Technicien "1" --> "0..*" Intervention : réalise
Technicien "1" --> "0..*" Rapport : rédige
Intervention "1" --> "0..*" Rapport : génère
Intervention "1" --> "0..*" FraisDeplacement : engendre
FraisDeplacement "1" --> "0..*" Validation : reçoit
Gestionnaire "1" --> "0..*" Validation : effectue
Gestionnaire "1" ..> "0..*" Materiau : gère
`

// ───────────────────────────────────────────────────────────────────────────
// 2) DIAGRAMME DE CAS D'UTILISATION (SVG fait main)
// ───────────────────────────────────────────────────────────────────────────
const W = 1960, H = 1340
const RX = 175, RY = 48
const GREEN = '#15803d', FILL = '#ecfdf5', INK = '#0f172a', LINE = '#475569'

const ucs = {
  AUTH:    { cx: 980, cy: 205, lines: ["S'authentifier"] },
  // Technicien (colonne gauche)
  T_PLAN:  { cx: 650, cy: 425, lines: ['Consulter mon planning'] },
  T_RAP:   { cx: 650, cy: 565, lines: ['Saisir un rapport', "d'intervention"] },
  T_FRAIS: { cx: 650, cy: 725, lines: ['Demander un', 'remboursement de frais'] },
  T_JUST:  { cx: 650, cy: 885, lines: ['Joindre un justificatif'] },
  T_MDP:   { cx: 650, cy: 1045, lines: ['Changer mon', 'mot de passe'] },
  // Gestionnaire (colonne droite)
  G_DASH:  { cx: 1310, cy: 380, lines: ['Consulter le', 'tableau de bord'] },
  G_RES:   { cx: 1310, cy: 498, lines: ['Gérer les techniciens', '& projets'] },
  G_MAT:   { cx: 1310, cy: 616, lines: ['Gérer les matériaux'] },
  G_PLAN:  { cx: 1310, cy: 734, lines: ['Gérer le planning', 'des interventions'] },
  G_VRAP:  { cx: 1310, cy: 852, lines: ['Valider les rapports'] },
  G_VFR:   { cx: 1310, cy: 970, lines: ['Valider les', 'notes de frais'] },
  G_PAY:   { cx: 1310, cy: 1088, lines: ['Rembourser les', 'frais validés'] },
  // Centre bas
  G_RESET: { cx: 980, cy: 1190, lines: ['Réinitialiser le mot de', "passe d'un technicien"] },
}

const techActor = { x: 150, y: 640, label: 'Technicien' }
const gestActor = { x: 1810, y: 640, label: 'Gestionnaire' }

// Liens acteur -> cas d'utilisation (on relie au sommet de l'ellipse face à l'acteur)
const techLinks = ['AUTH', 'T_PLAN', 'T_RAP', 'T_FRAIS', 'T_MDP']
const gestLinks = ['AUTH', 'G_DASH', 'G_RES', 'G_MAT', 'G_PLAN', 'G_VRAP', 'G_VFR', 'G_PAY', 'G_RESET']

function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') }

function ellipseText(uc) {
  const { cx, cy, lines } = uc
  const lh = 30
  const startY = cy - ((lines.length - 1) * lh) / 2 + 8
  return lines
    .map((l, i) => `<text x="${cx}" y="${startY + i * lh}" text-anchor="middle" font-size="23" font-weight="600" fill="${INK}">${esc(l)}</text>`)
    .join('')
}

function actorSvg(a) {
  const { x, y, label } = a
  return `
    <g stroke="${GREEN}" stroke-width="4" fill="none">
      <circle cx="${x}" cy="${y - 70}" r="24" fill="#fff"/>
      <line x1="${x}" y1="${y - 46}" x2="${x}" y2="${y + 30}"/>
      <line x1="${x - 38}" y1="${y - 18}" x2="${x + 38}" y2="${y - 18}"/>
      <line x1="${x}" y1="${y + 30}" x2="${x - 32}" y2="${y + 86}"/>
      <line x1="${x}" y1="${y + 30}" x2="${x + 32}" y2="${y + 86}"/>
    </g>
    <text x="${x}" y="${y + 122}" text-anchor="middle" font-size="27" font-weight="700" fill="${INK}">${esc(label)}</text>`
}

// point de l'ellipse face à l'acteur (sommet gauche ou droit)
function anchorOf(key, side) {
  const uc = ucs[key]
  return side === 'left' ? { x: uc.cx - RX, y: uc.cy } : { x: uc.cx + RX, y: uc.cy }
}

let links = ''
for (const k of techLinks) {
  const p = anchorOf(k, 'left')
  links += `<line x1="${techActor.x + 24}" y1="${techActor.y - 18}" x2="${p.x}" y2="${p.y}" stroke="${LINE}" stroke-width="2.5"/>`
}
for (const k of gestLinks) {
  const p = anchorOf(k, 'right')
  links += `<line x1="${gestActor.x - 24}" y1="${gestActor.y - 18}" x2="${p.x}" y2="${p.y}" stroke="${LINE}" stroke-width="2.5"/>`
}

let ellipses = '', labels = ''
for (const uc of Object.values(ucs)) {
  ellipses += `<ellipse cx="${uc.cx}" cy="${uc.cy}" rx="${RX}" ry="${RY}" fill="${FILL}" stroke="${GREEN}" stroke-width="3"/>`
  labels += ellipseText(uc)
}

// flèche «include» : Demander un remboursement -> Joindre un justificatif
const incFrom = { x: ucs.T_FRAIS.cx, y: ucs.T_FRAIS.cy + RY }
const incTo = { x: ucs.T_JUST.cx, y: ucs.T_JUST.cy - RY }
const includeArrow = `
  <line x1="${incFrom.x}" y1="${incFrom.y}" x2="${incTo.x}" y2="${incTo.y - 4}"
        stroke="${GREEN}" stroke-width="2.5" stroke-dasharray="8 6" marker-end="url(#arrow)"/>
  <text x="${incFrom.x + 14}" y="${(incFrom.y + incTo.y) / 2}" font-size="20" font-style="italic" fill="${GREEN}">&#171;include&#187;</text>`

const useCaseSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="Segoe UI, Arial, sans-serif">
  <defs>
    <marker id="arrow" markerWidth="12" markerHeight="12" refX="9" refY="5" orient="auto">
      <path d="M0,0 L10,5 L0,10 Z" fill="${GREEN}"/>
    </marker>
  </defs>
  <rect x="0" y="0" width="${W}" height="${H}" fill="#ffffff"/>
  <text x="${W / 2}" y="70" text-anchor="middle" font-size="40" font-weight="800" fill="${GREEN}">Diagramme de cas d'utilisation</text>

  <!-- frontière du système -->
  <rect x="370" y="110" width="1220" height="1170" rx="22" fill="none" stroke="#94a3b8" stroke-width="3"/>
  <text x="980" y="150" text-anchor="middle" font-size="25" font-weight="700" fill="#334155">Système — Gestion des interventions &amp; frais</text>

  ${links}
  ${ellipses}
  ${labels}
  ${includeArrow}
  ${actorSvg(techActor)}
  ${actorSvg(gestActor)}
</svg>`

// ───────────────────────────────────────────────────────────────────────────
// Rendu PNG via Chrome (puppeteer-core)
// ───────────────────────────────────────────────────────────────────────────
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--force-device-scale-factor=2'] })
try {
  // --- Diagramme de classes (Mermaid) ---
  {
    const page = await browser.newPage()
    await page.setViewport({ width: 2400, height: 1700, deviceScaleFactor: 2 })
    await page.setContent(`<!DOCTYPE html><html><head><meta charset="utf-8">
      <style>
        body { margin:0; background:#fff; font-family:'Segoe UI',Arial,sans-serif; }
        #wrap { padding: 28px; display:inline-block; }
        h1 { color:#15803d; font-size:54px; font-weight:800; margin:0 0 22px; text-align:center; }
        /* On NE force PAS la taille de police ici : Mermaid calcule la taille des
           boîtes d'après themeVariables.fontSize. La piloter uniquement là évite
           tout chevauchement. La haute résolution (2x) garde le texte net. */
      </style></head>
      <body><div id="wrap">
        <h1>Diagramme de classes</h1>
        <div class="mermaid" id="m">${classDef}</div>
      </div></body></html>`, { waitUntil: 'load' })

    await page.addScriptTag({ path: mermaidJs })
    await page.evaluate(async (def) => {
      // eslint-disable-next-line no-undef
      window.mermaid.initialize({
        startOnLoad: false,
        theme: 'base',
        fontFamily: 'Segoe UI, Arial, sans-serif',
        themeVariables: {
          fontSize: '20px',
          primaryColor: '#ecfdf5',
          primaryBorderColor: '#15803d',
          primaryTextColor: '#0f172a',
          lineColor: '#475569',
          classText: '#0f172a',
        },
      })
      // eslint-disable-next-line no-undef
      const { svg } = await window.mermaid.render('graph', def)
      const host = document.getElementById('m')
      host.innerHTML = svg
      // Zoom uniforme du SVG : agrandit boîtes ET texte sans risque de chevauchement.
      const el = host.querySelector('svg')
      const vb = el.viewBox.baseVal
      const scale = 1.6
      el.style.maxWidth = 'none'
      el.style.width = (vb.width * scale) + 'px'
      el.style.height = (vb.height * scale) + 'px'
    }, classDef)

    await new Promise((r) => setTimeout(r, 400))
    const el = await page.$('#wrap')
    await el.screenshot({ path: path.join(__dirname, 'diagramme-classe.png') })
    console.log('OK diagramme-classe.png')
    await page.close()
  }

  // --- Diagramme de cas d'utilisation (SVG) ---
  {
    const page = await browser.newPage()
    await page.setViewport({ width: W, height: H, deviceScaleFactor: 2 })
    await page.setContent(`<!DOCTYPE html><html><head><meta charset="utf-8">
      <style>body{margin:0;background:#fff}</style></head><body>${useCaseSvg}</body></html>`, { waitUntil: 'load' })
    await new Promise((r) => setTimeout(r, 200))
    const el = await page.$('svg')
    await el.screenshot({ path: path.join(__dirname, 'diagramme-cas-utilisation.png') })
    console.log('OK diagramme-cas-utilisation.png')
    await page.close()
  }
} finally {
  await browser.close()
}
