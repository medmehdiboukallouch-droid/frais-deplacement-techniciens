// Génère la présentation de soutenance PPTX
// Usage : node docs/build_pptx.mjs
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const pptxgen = require('pptxgenjs')

// ─── Chemins images ───────────────────────────────────────────────────────────
const IMG_UC    = 'C:/Users/mehdi/prjt2/frais-deplacement-techniciens/docs/diagramme-cas-utilisation-rapport.png'
const IMG_CLASS = 'C:/Users/mehdi/prjt2/frais-deplacement-techniciens/docs/diagramme-classe-rapport.png'
const OUT       = 'C:/Users/mehdi/Downloads/Soutenance_Gestion_Frais.pptx'

// ─── Palette ──────────────────────────────────────────────────────────────────
const G_DK   = '166534'   // vert foncé (titres, fonds)
const G_MD   = '15803D'   // vert principal
const G_LT   = 'DCFCE7'   // vert clair (texte sur fond vert)
const G_FILL = 'F0FDF4'   // fond card vert clair
const B_DK   = '0369A1'   // bleu foncé (backend)
const B_FILL = 'F0F9FF'   // fond card bleu clair
const INK    = '1F2937'   // texte corps
const MUTED  = '6B7280'   // texte secondaire
const WHITE  = 'FFFFFF'
const LGRAY  = 'F9FAFB'
const BORDER = 'E5E7EB'
const FONT   = 'Calibri'
const W = 10, H = 5.625
const TOTAL = 14

const pres = new pptxgen()
pres.layout = 'LAYOUT_16x9'
pres.title  = 'Gestion des Frais de Déplacement des Techniciens'

// ─── Helpers ─────────────────────────────────────────────────────────────────
function addTitle(slide, text) {
  slide.addText(text, {
    x: 0.5, y: 0.2, w: 9, h: 0.72,
    fontSize: 30, bold: true, color: G_DK,
    fontFace: FONT, align: 'left', valign: 'top'
  })
}

function addNum(slide, n, dark = false) {
  slide.addText(`${n} / ${TOTAL}`, {
    x: 9.1, y: 5.22, w: 0.75, h: 0.28,
    fontSize: 11, color: dark ? G_LT : MUTED,
    fontFace: FONT, align: 'right'
  })
}

// ─── SLIDE 1 — Titre ─────────────────────────────────────────────────────────
{
  const s = pres.addSlide()
  s.background = { color: G_DK }

  s.addText('Application de Gestion des\nFrais de Déplacement\ndes Techniciens', {
    x: 0.7, y: 0.7, w: 8.6, h: 3.0,
    fontSize: 40, bold: true, color: WHITE,
    fontFace: FONT, align: 'left', valign: 'middle'
  })

  s.addText('Projet de fin d\'études — Soutenance', {
    x: 0.7, y: 3.85, w: 7, h: 0.55,
    fontSize: 20, color: G_LT, fontFace: FONT, align: 'left'
  })

  addNum(s, 1, true)
}

// ─── SLIDE 2 — Contexte & Problématique ──────────────────────────────────────
{
  const s = pres.addSlide()
  s.background = { color: WHITE }
  addTitle(s, 'Contexte & Problématique')
  addNum(s, 2)

  s.addText([
    { text: 'Les entreprises gérant des techniciens terrain font face à une gestion manuelle et inefficace des frais de déplacement', options: { bullet: true, breakLine: true } },
    { text: 'Perte de justificatifs, erreurs de calcul, délais de remboursement longs', options: { bullet: true, breakLine: true } },
    { text: 'Absence de visibilité sur les interventions planifiées et leur avancement', options: { bullet: true, breakLine: true } },
    { text: 'Besoin d\'un outil centralisé, sécurisé et accessible à tous les acteurs', options: { bullet: true } },
  ], {
    x: 0.6, y: 1.1, w: 8.8, h: 4.0,
    fontSize: 18, color: INK, fontFace: FONT,
    paraSpaceAfter: 14, valign: 'top'
  })
}

// ─── SLIDE 3 — Objectifs ──────────────────────────────────────────────────────
{
  const s = pres.addSlide()
  s.background = { color: WHITE }
  addTitle(s, 'Objectifs du projet')
  addNum(s, 3)

  s.addText([
    { text: 'Permettre aux techniciens de soumettre leurs demandes de frais avec justificatifs obligatoires', options: { bullet: true, breakLine: true } },
    { text: 'Donner aux gestionnaires un espace de validation et de suivi complet', options: { bullet: true, breakLine: true } },
    { text: 'Gérer le planning des interventions avec drag-and-drop multi-jours', options: { bullet: true, breakLine: true } },
    { text: 'Centraliser la gestion des techniciens, projets et matériaux', options: { bullet: true, breakLine: true } },
    { text: 'Garantir la sécurité par authentification JWT et contrôle des rôles (RBAC)', options: { bullet: true } },
  ], {
    x: 0.6, y: 1.1, w: 8.8, h: 4.0,
    fontSize: 18, color: INK, fontFace: FONT,
    paraSpaceAfter: 12, valign: 'top'
  })
}

// ─── SLIDE 4 — Stack Technique ────────────────────────────────────────────────
{
  const s = pres.addSlide()
  s.background = { color: WHITE }
  addTitle(s, 'Stack Technique')
  addNum(s, 4)

  // Card Frontend
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.4, y: 1.1, w: 4.3, h: 4.1,
    fill: { color: G_FILL }, line: { color: G_MD, width: 2 }
  })
  s.addText('Frontend', {
    x: 0.5, y: 1.2, w: 4.1, h: 0.5,
    fontSize: 20, bold: true, color: G_DK, fontFace: FONT, align: 'center'
  })
  s.addText([
    { text: 'React 19', options: { bullet: true, breakLine: true } },
    { text: 'TypeScript', options: { bullet: true, breakLine: true } },
    { text: 'Vite', options: { bullet: true, breakLine: true } },
    { text: 'Tailwind CSS 4', options: { bullet: true, breakLine: true } },
    { text: 'Radix UI', options: { bullet: true, breakLine: true } },
    { text: 'react-dnd (drag-and-drop)', options: { bullet: true } },
  ], {
    x: 0.55, y: 1.8, w: 4.0, h: 3.2,
    fontSize: 15, color: INK, fontFace: FONT,
    paraSpaceAfter: 6, valign: 'top'
  })

  // Card Backend
  s.addShape(pres.shapes.RECTANGLE, {
    x: 5.3, y: 1.1, w: 4.3, h: 4.1,
    fill: { color: B_FILL }, line: { color: B_DK, width: 2 }
  })
  s.addText('Backend & Outils', {
    x: 5.4, y: 1.2, w: 4.1, h: 0.5,
    fontSize: 20, bold: true, color: B_DK, fontFace: FONT, align: 'center'
  })
  s.addText([
    { text: 'Node.js + Express 5', options: { bullet: true, breakLine: true } },
    { text: 'PostgreSQL', options: { bullet: true, breakLine: true } },
    { text: 'JWT (authentification)', options: { bullet: true, breakLine: true } },
    { text: 'bcrypt (hachage mots de passe)', options: { bullet: true, breakLine: true } },
    { text: 'Base64 (upload fichiers)', options: { bullet: true, breakLine: true } },
    { text: 'Git · Postman · pgAdmin · VS Code', options: { bullet: true } },
  ], {
    x: 5.45, y: 1.8, w: 4.0, h: 3.2,
    fontSize: 15, color: INK, fontFace: FONT,
    paraSpaceAfter: 6, valign: 'top'
  })
}

// ─── SLIDE 5 — Architecture 3-Tiers ──────────────────────────────────────────
{
  const s = pres.addSlide()
  s.background = { color: WHITE }
  addTitle(s, 'Architecture 3-Tiers')
  addNum(s, 5)

  const tiers = [
    { x: 0.4,  bg: G_FILL,  border: G_MD,  titleCol: G_DK,  label: 'Présentation',  sub: 'React 19 · TypeScript\nVite · Tailwind CSS\nRoutage protégé par rôle\nJWT → sessionStorage' },
    { x: 3.65, bg: B_FILL,  border: B_DK,  titleCol: B_DK,  label: 'Métier / API',  sub: 'Node.js · Express 5\nMiddleware requireRole()\nRoutes REST sécurisées\nTransactions SQL atomiques' },
    { x: 6.9,  bg: 'F5F3FF', border: '7C3AED', titleCol: '5B21B6', label: 'Données',  sub: 'PostgreSQL\n9 tables relationnelles\nRequêtes paramétrées\nContraintes d\'intégrité' },
  ]

  for (const t of tiers) {
    s.addShape(pres.shapes.RECTANGLE, {
      x: t.x, y: 1.1, w: 2.85, h: 4.1,
      fill: { color: t.bg }, line: { color: t.border, width: 2 }
    })
    s.addText(t.label, {
      x: t.x + 0.05, y: 1.18, w: 2.75, h: 0.5,
      fontSize: 17, bold: true, color: t.titleCol, fontFace: FONT, align: 'center'
    })
    s.addText(t.sub, {
      x: t.x + 0.1, y: 1.78, w: 2.65, h: 3.2,
      fontSize: 13, color: INK, fontFace: FONT, align: 'center', valign: 'top',
      paraSpaceAfter: 4
    })
  }

  // Flèches entre les boîtes
  for (const ax of [3.25, 6.5]) {
    s.addShape(pres.shapes.LINE, {
      x: ax, y: 3.15, w: 0.4, h: 0,
      line: { color: '9CA3AF', width: 2.5, endArrowType: 'open', beginArrowType: 'open' }
    })
  }
}

// ─── SLIDE 6 — Diagramme de cas d'utilisation ─────────────────────────────────
{
  const s = pres.addSlide()
  s.background = { color: WHITE }
  addTitle(s, "Diagramme de cas d'utilisation")
  addNum(s, 6)

  // Ratio image : 2000 × 1640 = 1.2195
  const imgH = 4.1
  const imgW = imgH * (2000 / 1640)
  const imgX = (W - imgW) / 2
  s.addImage({ path: IMG_UC, x: imgX, y: 1.05, w: imgW, h: imgH })
}

// ─── SLIDE 7 — Diagramme de classes ───────────────────────────────────────────
{
  const s = pres.addSlide()
  s.background = { color: WHITE }
  addTitle(s, 'Diagramme de classes')
  addNum(s, 7)

  // Ratio image : 8956 × 3912 = 2.289
  const imgW = 9.0
  const imgH = imgW / (8956 / 3912)
  const imgY = 1.0 + (4.35 - imgH) / 2
  s.addImage({ path: IMG_CLASS, x: 0.5, y: imgY, w: imgW, h: imgH })
}

// ─── SLIDE 8 — Espace Technicien ──────────────────────────────────────────────
{
  const s = pres.addSlide()
  s.background = { color: WHITE }
  addTitle(s, 'Fonctionnalités — Espace Technicien')
  addNum(s, 8)

  const items = [
    'Consulter son planning d\'interventions (vue semaine)',
    'Saisir un rapport d\'intervention (présence, matériel utilisé, temps passé)',
    'Soumettre une demande de frais avec justificatif obligatoire (PDF ou image)',
    'Consulter l\'historique de ses demandes et leur statut de validation',
    'Changer son propre mot de passe',
  ]

  items.forEach((txt, i) => {
    const y = 1.08 + i * 0.84
    s.addShape(pres.shapes.OVAL, {
      x: 0.45, y: y + 0.02, w: 0.48, h: 0.48,
      fill: { color: G_MD }, line: { color: G_MD }
    })
    s.addText(String(i + 1), {
      x: 0.45, y: y + 0.02, w: 0.48, h: 0.48,
      fontSize: 15, bold: true, color: WHITE,
      fontFace: FONT, align: 'center', valign: 'middle', margin: 0
    })
    s.addText(txt, {
      x: 1.1, y: y, w: 8.5, h: 0.54,
      fontSize: 16, color: INK, fontFace: FONT, valign: 'middle'
    })
  })
}

// ─── SLIDE 9 — Espace Gestionnaire ────────────────────────────────────────────
{
  const s = pres.addSlide()
  s.background = { color: WHITE }
  addTitle(s, 'Fonctionnalités — Espace Gestionnaire')
  addNum(s, 9)

  const items = [
    'Tableau de bord : statistiques globales (frais en attente, techniciens, interventions)',
    'Gérer les techniciens et projets (CRUD complet)',
    'Gérer le planning des interventions avec drag-and-drop (multi-jours)',
    'Valider ou refuser les demandes de frais (avec consultation du justificatif)',
    'Valider les rapports d\'intervention',
    'Gérer le catalogue de matériaux (stock, prix, catégorie)',
    'Réinitialiser le mot de passe d\'un technicien (mot de passe temporaire)',
  ]

  const spacing = 4.05 / items.length
  items.forEach((txt, i) => {
    const y = 1.08 + i * spacing
    s.addShape(pres.shapes.OVAL, {
      x: 0.45, y: y + 0.02, w: 0.44, h: 0.44,
      fill: { color: G_MD }, line: { color: G_MD }
    })
    s.addText(String(i + 1), {
      x: 0.45, y: y + 0.02, w: 0.44, h: 0.44,
      fontSize: 14, bold: true, color: WHITE,
      fontFace: FONT, align: 'center', valign: 'middle', margin: 0
    })
    s.addText(txt, {
      x: 1.08, y: y, w: 8.5, h: spacing - 0.05,
      fontSize: 14.5, color: INK, fontFace: FONT, valign: 'middle'
    })
  })
}

// ─── SLIDE 10 — Modèle de données ─────────────────────────────────────────────
{
  const s = pres.addSlide()
  s.background = { color: WHITE }
  addTitle(s, 'Modèle de données — Base PostgreSQL')
  addNum(s, 10)

  const tables = [
    ['users',              'Authentification, rôle (TECHNICIEN / GESTIONNAIRE), actif'],
    ['techniciens',        'Profil technicien (matricule, service, ville)'],
    ['gestionnaires',      'Profil gestionnaire (département)'],
    ['projets',            'Projets clients (nom, localisation, statut)'],
    ['interventions',      'Planification multi-jours (date_depart, date_retour, statut)'],
    ['rapports',           'Rapports d\'intervention (présence, matériel, temps passé)'],
    ['frais_deplacement',  'Demandes de frais (montant, justificatif, statut_validation)'],
    ['validations',        'Historique des décisions gestionnaire (approuvé / rejeté)'],
    ['materiaux',          'Catalogue matériaux (stock, prix unitaire, catégorie)'],
  ]

  const tableData = [
    [
      { text: 'Table', options: { bold: true, color: WHITE, fill: { color: G_DK }, align: 'center', fontSize: 14 } },
      { text: 'Description', options: { bold: true, color: WHITE, fill: { color: G_DK }, align: 'center', fontSize: 14 } },
    ],
    ...tables.map(([t, d], i) => [
      { text: t, options: { bold: true, color: G_DK, fill: { color: i % 2 === 0 ? G_FILL : WHITE }, fontSize: 13 } },
      { text: d, options: { fill: { color: i % 2 === 0 ? G_FILL : WHITE }, fontSize: 13 } },
    ]),
  ]

  s.addTable(tableData, {
    x: 0.5, y: 1.05, w: 9, colW: [2.5, 6.5],
    border: { pt: 1, color: BORDER },
    fontFace: FONT,
    rowH: 0.40,
  })
}

// ─── SLIDE 11 — Sécurité ──────────────────────────────────────────────────────
{
  const s = pres.addSlide()
  s.background = { color: WHITE }
  addTitle(s, 'Sécurité')
  addNum(s, 11)

  s.addText([
    { text: 'Authentification par JWT (JSON Web Token) — stocké en sessionStorage', options: { bullet: true, breakLine: true } },
    { text: 'Mots de passe hachés avec bcrypt (salage automatique)', options: { bullet: true, breakLine: true } },
    { text: 'Contrôle d\'accès par rôle (RBAC) : middleware requireRole() sur chaque route sensible', options: { bullet: true, breakLine: true } },
    { text: 'Requêtes paramétrées ($1, $2…) — protection contre les injections SQL', options: { bullet: true, breakLine: true } },
    { text: 'Transactions atomiques pour les opérations multi-tables', options: { bullet: true, breakLine: true } },
    { text: 'Upload de fichiers limité à 5 Mo côté client et 15 Mo côté serveur', options: { bullet: true } },
  ], {
    x: 0.6, y: 1.1, w: 8.8, h: 4.1,
    fontSize: 18, color: INK, fontFace: FONT,
    paraSpaceAfter: 10, valign: 'top'
  })
}

// ─── SLIDE 12 — Défis & Solutions ─────────────────────────────────────────────
{
  const s = pres.addSlide()
  s.background = { color: WHITE }
  addTitle(s, 'Défis techniques & Solutions')
  addNum(s, 12)

  const rows = [
    [
      { text: 'Défi', options: { bold: true, color: WHITE, fill: { color: G_DK }, align: 'center', fontSize: 15 } },
      { text: 'Solution', options: { bold: true, color: WHITE, fill: { color: G_DK }, align: 'center', fontSize: 15 } },
    ],
    [
      { text: 'Upload de fichiers sans multer', options: { bold: true, color: G_DK, fill: { color: G_FILL }, fontSize: 14 } },
      { text: 'Encodage base64 en JSON — FileReader API côté client, Buffer.from() côté serveur', options: { fill: { color: G_FILL }, fontSize: 14 } },
    ],
    [
      { text: 'Planning multi-jours', options: { bold: true, color: G_DK, fill: { color: WHITE }, fontSize: 14 } },
      { text: 'Fonction interventionCoversDay() : affiche la carte sur chaque jour de la plage de dates', options: { fill: { color: WHITE }, fontSize: 14 } },
    ],
    [
      { text: 'Drag-and-drop avec durée préservée', options: { bold: true, color: G_DK, fill: { color: G_FILL }, fontSize: 14 } },
      { text: 'Calcul de durationDays puis décalage proportionnel de la date de fin lors du drop', options: { fill: { color: G_FILL }, fontSize: 14 } },
    ],
    [
      { text: 'Gestion sécurisée des mots de passe', options: { bold: true, color: G_DK, fill: { color: WHITE }, fontSize: 14 } },
      { text: 'Technicien change le sien ; Gestionnaire génère un mot de passe temporaire à usage unique', options: { fill: { color: WHITE }, fontSize: 14 } },
    ],
  ]

  s.addTable(rows, {
    x: 0.5, y: 1.05, w: 9, colW: [2.8, 6.2],
    border: { pt: 1, color: BORDER },
    fontFace: FONT,
    rowH: [0.45, 0.92, 0.92, 0.92, 0.92],
  })
}

// ─── SLIDE 13 — Conclusion & Perspectives ─────────────────────────────────────
{
  const s = pres.addSlide()
  s.background = { color: LGRAY }
  addTitle(s, 'Conclusion & Perspectives')
  addNum(s, 13)

  // Colonne Réalisations
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.4, y: 1.05, w: 4.25, h: 4.25,
    fill: { color: G_FILL }, line: { color: G_MD, width: 2 }
  })
  s.addText('Réalisations', {
    x: 0.5, y: 1.15, w: 4.05, h: 0.45,
    fontSize: 18, bold: true, color: G_DK, fontFace: FONT, align: 'center'
  })
  s.addText([
    { text: 'Application complète couvrant l\'intégralité du cycle de gestion des frais', options: { bullet: true, breakLine: true } },
    { text: 'Sécurité robuste : JWT + bcrypt + RBAC + SQL paramétré', options: { bullet: true, breakLine: true } },
    { text: 'Interface moderne et réactive (React 19 + Tailwind CSS 4)', options: { bullet: true, breakLine: true } },
    { text: 'Architecture maintenable : API REST + séparation frontend / backend', options: { bullet: true } },
  ], {
    x: 0.5, y: 1.68, w: 4.05, h: 3.4,
    fontSize: 14, color: INK, fontFace: FONT, valign: 'top', paraSpaceAfter: 10
  })

  // Colonne Perspectives
  s.addShape(pres.shapes.RECTANGLE, {
    x: 5.35, y: 1.05, w: 4.25, h: 4.25,
    fill: { color: B_FILL }, line: { color: B_DK, width: 2 }
  })
  s.addText('Perspectives', {
    x: 5.45, y: 1.15, w: 4.05, h: 0.45,
    fontSize: 18, bold: true, color: B_DK, fontFace: FONT, align: 'center'
  })
  s.addText([
    { text: 'Notifications email automatiques (validation, rejet)', options: { bullet: true, breakLine: true } },
    { text: 'Export des rapports en PDF', options: { bullet: true, breakLine: true } },
    { text: 'Application mobile (React Native)', options: { bullet: true, breakLine: true } },
    { text: 'Tableau de bord analytique avancé', options: { bullet: true } },
  ], {
    x: 5.45, y: 1.68, w: 4.05, h: 3.4,
    fontSize: 14, color: INK, fontFace: FONT, valign: 'top', paraSpaceAfter: 10
  })
}

// ─── SLIDE 14 — Merci ─────────────────────────────────────────────────────────
{
  const s = pres.addSlide()
  s.background = { color: G_DK }

  s.addText('Merci pour votre attention', {
    x: 0.7, y: 1.2, w: 8.6, h: 1.6,
    fontSize: 46, bold: true, color: WHITE,
    fontFace: FONT, align: 'left', valign: 'middle'
  })

  s.addText('Questions ?', {
    x: 0.7, y: 3.1, w: 8.6, h: 0.9,
    fontSize: 28, color: G_LT, fontFace: FONT, align: 'left'
  })

  addNum(s, 14, true)
}

// ─── Sauvegarde ───────────────────────────────────────────────────────────────
await pres.writeFile({ fileName: OUT })
console.log('OK:', OUT)
