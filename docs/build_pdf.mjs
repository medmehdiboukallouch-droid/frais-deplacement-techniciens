// Génère docs/gestionnaire.html PUIS docs/Espace-Gestionnaire-Documentation.pdf
//   - markdown-it          : rendu Markdown -> HTML
//   - highlight.js         : coloration syntaxique du code
//   - markdown-it-anchor   : ajoute un id sur chaque titre (pour la TOC cliquable)
//   - puppeteer-core       : pilote Chrome headless pour imprimer en PDF (pied de page + n° de page)
//
// Usage : node docs/build_pdf.mjs
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const MarkdownIt = require('markdown-it')
const anchor = require('markdown-it-anchor')
const hljs = require('highlight.js')
const puppeteer = require('puppeteer-core')

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const mdPath = path.join(__dirname, 'gestionnaire.md')
const htmlPath = path.join(__dirname, 'gestionnaire.html')
const pdfPath = path.join(__dirname, 'Espace-Gestionnaire-Documentation.pdf')

// Identifiant d'ancre propre (ASCII, sans accent) — utilisé pour les titres ET la TOC.
function slugify(s) {
  return String(s)
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // retire les accents
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

const md = new MarkdownIt({
  html: false,
  linkify: true,
  highlight(str, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return '<pre class="hljs"><code>' + hljs.highlight(str, { language: lang, ignoreIllegals: true }).value + '</code></pre>'
      } catch { /* ignore */ }
    }
    return '<pre class="hljs"><code>' + md.utils.escapeHtml(str) + '</code></pre>'
  },
}).use(anchor, { slugify, tabIndex: false })

const markdown = fs.readFileSync(mdPath, 'utf8')

// Construit la table des matières à partir des titres de niveau 1 (# ...),
// en sautant le tout premier (le titre du document).
const h1s = []
for (const line of markdown.split('\n')) {
  const m = /^#\s+(.+?)\s*$/.exec(line)
  if (m) h1s.push(m[1])
}
const tocItems = h1s.slice(1) // on saute le titre du document
const tocHtml =
  '<nav class="toc"><ol>' +
  tocItems.map((t) => `<li><a href="#${slugify(t)}">${md.utils.escapeHtml(t)}</a></li>`).join('') +
  '</ol></nav>'

let body = md.render(markdown)
body = body.replace('<p>%%TOC%%</p>', tocHtml) // injecte la TOC à la place du marqueur

let hljsCss = ''
try { hljsCss = fs.readFileSync(require.resolve('highlight.js/styles/github.css'), 'utf8') } catch { /* optionnel */ }

const today = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>Espace Gestionnaire — Documentation technique</title>
<style>
  ${hljsCss}

  :root {
    --green: #15803d; --green-dark: #166534; --ink: #1f2937;
    --muted: #6b7280; --border: #e5e7eb; --code-bg: #f6f8fa;
  }
  * { box-sizing: border-box; }
  @page { size: A4; margin: 0; }            /* les marges réelles sont gérées par Puppeteer */

  body {
    font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif;
    color: var(--ink); line-height: 1.55; font-size: 10.5pt; margin: 0;
  }

  /* ---- Page de garde ---- */
  .cover {
    min-height: 235mm; display: flex; flex-direction: column;
    justify-content: center; align-items: center;
    page-break-after: always; text-align: center;
  }
  .cover .badge { background: var(--green); color: #fff; border-radius: 999px;
    padding: 6px 18px; font-size: 11pt; letter-spacing: .5px; margin-bottom: 28px; }
  .cover h1 { font-size: 30pt; color: var(--green-dark); margin: 0 0 14px; border: none; padding: 0; }
  .cover .sub { font-size: 14pt; color: var(--muted); margin-bottom: 40px; }
  .cover .meta { font-size: 10.5pt; color: var(--muted); }
  .cover .rule { width: 80px; height: 4px; background: var(--green); margin: 18px 0; border-radius: 2px; }

  /* ---- Table des matières (le numéro est déjà dans le texte du titre) ---- */
  nav.toc ol { list-style: none; margin: 0; padding: 0; }
  nav.toc li { margin: 8px 0; font-size: 11.5pt; padding-left: 4px; }
  nav.toc a { color: var(--ink); border-bottom: 1px dotted var(--border); padding-bottom: 1px; }

  /* ---- Titres ---- */
  h1 { color: var(--green-dark); font-size: 19pt; border-bottom: 3px solid var(--green);
    padding-bottom: 6px; margin: 0 0 16px; page-break-before: always; }
  h2 { color: var(--green-dark); font-size: 14pt; margin: 22px 0 10px;
    border-bottom: 1px solid var(--border); padding-bottom: 4px; }
  h3 { color: var(--ink); font-size: 12pt; margin: 16px 0 8px; }
  h1, h2, h3 { page-break-after: avoid; }
  /* l'ancre d'en-tête de markdown-it-anchor ne doit pas s'afficher */
  .header-anchor { display: none; }

  p { margin: 8px 0; }
  ul, ol { margin: 8px 0 8px 22px; }
  li { margin: 3px 0; }
  strong { color: #111827; }
  a { color: var(--green-dark); text-decoration: none; }

  /* ---- Code ---- */
  code { font-family: "Cascadia Code", "Consolas", monospace; font-size: 9pt;
    background: var(--code-bg); padding: 1px 5px; border-radius: 4px; border: 1px solid var(--border); }
  pre.hljs, pre { background: var(--code-bg); border: 1px solid var(--border);
    border-left: 4px solid var(--green); border-radius: 6px; padding: 10px 12px;
    overflow-x: auto; page-break-inside: avoid; margin: 10px 0; }
  pre code { background: none; border: none; padding: 0; font-size: 8.6pt; line-height: 1.45;
    white-space: pre-wrap; word-break: break-word; }

  /* ---- Tableaux ---- */
  table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 9.2pt; page-break-inside: avoid; }
  th, td { border: 1px solid var(--border); padding: 6px 8px; text-align: left; vertical-align: top; }
  th { background: #f0fdf4; color: var(--green-dark); }
  tr:nth-child(even) td { background: #fafafa; }

  /* ---- Encadrés ---- */
  blockquote { margin: 12px 0; padding: 10px 14px; background: #f0fdf4; border-left: 4px solid var(--green);
    border-radius: 0 6px 6px 0; color: #14532d; page-break-inside: avoid; }
  blockquote p { margin: 4px 0; }
  hr { border: none; border-top: 1px solid var(--border); margin: 20px 0; }
</style>
</head>
<body>
  <section class="cover">
    <span class="badge">DOCUMENTATION TECHNIQUE</span>
    <h1>Espace Gestionnaire</h1>
    <div class="rule"></div>
    <div class="sub">Application de gestion d'interventions, missions &amp; frais de déplacement</div>
    <div class="meta">
      Backend (Express / PostgreSQL) · Routes API · Frontend (React)<br>
      Projet <strong>frais-deplacement-techniciens</strong> — ${today}
    </div>
  </section>
  ${body}
</body>
</html>`

fs.writeFileSync(htmlPath, html, 'utf8')
console.log('HTML généré :', path.basename(htmlPath), `(${(html.length / 1024).toFixed(0)} Ko)`)

// ---- Impression PDF via Chrome (puppeteer-core) ----
const CHROME_CANDIDATES = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
]
const executablePath = CHROME_CANDIDATES.find((p) => fs.existsSync(p))
if (!executablePath) { console.error('Aucun navigateur Chrome/Edge trouvé'); process.exit(1) }

const footer = `
  <div style="font-size:8px; width:100%; padding:0 16mm; color:#6b7280; display:flex; justify-content:space-between; align-items:center;">
    <span>Espace Gestionnaire — Documentation technique</span>
    <span>Page <span class="pageNumber"></span> / <span class="totalPages"></span></span>
  </div>`

const browser = await puppeteer.launch({ executablePath, headless: 'new', args: ['--no-sandbox', '--disable-gpu'] })
try {
  const page = await browser.newPage()
  await page.goto('file://' + htmlPath.replace(/\\/g, '/'), { waitUntil: 'networkidle0' })
  await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: '<div></div>',
    footerTemplate: footer,
    margin: { top: '16mm', bottom: '18mm', left: '15mm', right: '15mm' },
  })
  const kb = (fs.statSync(pdfPath).size / 1024).toFixed(0)
  console.log('PDF généré :', path.basename(pdfPath), `(${kb} Ko)`)
} finally {
  await browser.close()
}
