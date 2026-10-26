/**
 * Génération de la présentation premium :
 *   « Béni Mellal-Khénifra : Entre patrimoine, nature et authenticité »
 *
 *  Design : style cinématique, palette nature marocaine,
 *  typographie premium (Georgia + Calibri Light),
 *  mises en page dynamiques, transitions élégantes.
 */
const path = require('path');
const fs = require('fs');
const PptxGenJS = require('pptxgenjs');

const IMG = JSON.parse(fs.readFileSync(path.join(__dirname, 'images-manifest.json'), 'utf8'));

// --- Palette ----------------------------------------------------------------
const C = {
  ATLAS_DARK: '1D3A1A',     // Vert Atlas profond
  ATLAS:      '2D4F2A',     // Vert Atlas
  ATLAS_MID:  '5A7A3D',     // Vert sauge
  OCHRE_DARK: 'A45A2C',
  OCHRE:      'C97B3C',     // Terre ocre signature
  OCHRE_LT:   'E3A977',
  CASCADE_DK: '1A4660',
  CASCADE:    '2A6F8C',     // Bleu cascade
  SAND:       'F4E8D7',     // Beige sahara
  IVORY:      'FAF7F2',     // Blanc cassé
  CHARCOAL:   '1A1A1A',
  GRAPHITE:   '2B2B2B',
  GOLD:       'C9A961',     // Or doux
  BROWN:      '5C2C18',
  RUST:       '8B3A1A',
  GREY:       '6E6E6E',
  GREY_LT:    'B8B0A4',
};

// --- Typographie -------------------------------------------------------------
const F = {
  DISPLAY:  'Georgia',                  // titres principaux (serif élégant)
  HEADING:  'Calibri Light',            // titres secondaires
  SUBTLE:   'Segoe UI Light',           // accents légers
  BODY:     'Calibri',                  // corps de texte
  CAPS:     'Segoe UI Semibold',        // petites capitales / labels
  NUMERIC:  'Georgia',                  // chiffres clés
};

// --- Helpers -----------------------------------------------------------------
const SLIDE_W = 13.333;
const SLIDE_H = 7.5;

const pptx = new PptxGenJS();
pptx.layout = 'LAYOUT_WIDE';
pptx.title  = 'Béni Mellal-Khénifra — Entre patrimoine, nature et authenticité';
pptx.author = 'Présentation régionale';
pptx.company = 'Région Béni Mellal-Khénifra';
pptx.subject = 'Patrimoine, culture, économie et potentiel de développement';

// Transitions élégantes (PowerPoint natif via OOXML — pptxgenjs supporte .transition)
const FADE = { type: 'fade', duration: 1.2 };

// -- Helpers de dessin --------------------------------------------------------
function rect(slide, opts) {
  slide.addShape(pptx.ShapeType.rect, opts);
}
function band(slide, x, y, w, h, color, opacity = 1) {
  rect(slide, { x, y, w, h, fill: { color, transparency: (1 - opacity) * 100 }, line: { type: 'none' } });
}
function line(slide, x, y, w, color = C.GOLD, weight = 1) {
  slide.addShape(pptx.ShapeType.line, { x, y, w, h: 0, line: { color, width: weight } });
}
function vline(slide, x, y, h, color = C.GOLD, weight = 1) {
  slide.addShape(pptx.ShapeType.line, { x, y, w: 0, h, line: { color, width: weight } });
}
function chip(slide, x, y, w, h, label, color = C.OCHRE) {
  slide.addShape(pptx.ShapeType.roundRect, {
    x, y, w, h, rectRadius: 0.06,
    fill: { color }, line: { type: 'none' },
  });
  slide.addText(label, {
    x, y, w, h,
    fontFace: F.CAPS, fontSize: 9, color: C.IVORY,
    align: 'center', valign: 'middle', charSpacing: 4, bold: true,
  });
}
function label(slide, x, y, w, h, text, color = C.OCHRE) {
  slide.addText(text, {
    x, y, w, h,
    fontFace: F.CAPS, fontSize: 9.5, color,
    align: 'left', valign: 'middle', charSpacing: 6, bold: true,
  });
}
function pageNum(slide, n, total) {
  slide.addText(String(n).padStart(2, '0') + '  /  ' + String(total).padStart(2, '0'), {
    x: 11.9, y: 7.1, w: 1.2, h: 0.3,
    fontFace: F.CAPS, fontSize: 9, color: C.GREY,
    align: 'right', valign: 'middle', charSpacing: 4,
  });
}
function brand(slide, color = C.GREY) {
  slide.addText('BÉNI MELLAL-KHÉNIFRA', {
    x: 0.45, y: 7.1, w: 4, h: 0.3,
    fontFace: F.CAPS, fontSize: 9, color, charSpacing: 6, bold: true,
    align: 'left', valign: 'middle',
  });
  // petit accent doré
  slide.addShape(pptx.ShapeType.rect, {
    x: 0.45, y: 7.05, w: 0.25, h: 0.04,
    fill: { color: C.GOLD }, line: { type: 'none' },
  });
}

// Image safe : accepte .jpg ou .svg
function img(slide, key, opts) {
  const p = IMG[key];
  if (!p) throw new Error('Image missing: ' + key);
  slide.addImage({ path: p, ...opts });
}

// =============================================================================
//  S L I D E S
// =============================================================================
const TOTAL = 17;

// -- 01 : COUVERTURE ---------------------------------------------------------
{
  const s = pptx.addSlide();
  s.background = { color: C.CHARCOAL };
  s.transition = FADE;

  img(s, 'cover', { x: 0, y: 0, w: SLIDE_W, h: SLIDE_H, sizing: { type: 'cover', w: SLIDE_W, h: SLIDE_H } });

  // Voile dégradé sombre pour lisibilité du texte
  band(s, 0, 0, SLIDE_W, SLIDE_H, C.CHARCOAL, 0.45);
  band(s, 0, 4.2, SLIDE_W, 3.3, C.CHARCOAL, 0.65);
  // Bandeau latéral ocre fin
  band(s, 0, 0, 0.12, SLIDE_H, C.OCHRE, 1);

  // Étiquette supérieure
  s.addText('RÉGION DU MAROC  ·  MOYEN ATLAS', {
    x: 0.8, y: 0.6, w: 8, h: 0.4,
    fontFace: F.CAPS, fontSize: 11, color: C.GOLD,
    charSpacing: 12, bold: true,
  });
  // Filet doré
  rect(s, { x: 0.8, y: 1.05, w: 0.6, h: 0.04, fill: { color: C.GOLD }, line: { type: 'none' } });

  // Titre principal
  s.addText('Béni Mellal-Khénifra', {
    x: 0.8, y: 4.4, w: 11.5, h: 1.4,
    fontFace: F.DISPLAY, fontSize: 60, color: C.IVORY,
    italic: false, bold: false, charSpacing: 1,
  });
  // Sous-titre
  s.addText('Entre patrimoine, nature et authenticité', {
    x: 0.8, y: 5.85, w: 11.5, h: 0.6,
    fontFace: F.DISPLAY, fontSize: 22, color: C.OCHRE_LT,
    italic: true, charSpacing: 1,
  });

  // Filet inférieur + meta
  rect(s, { x: 0.8, y: 6.65, w: 1.2, h: 0.03, fill: { color: C.GOLD }, line: { type: 'none' } });
  s.addText('UNE INVITATION AU CŒUR DU MAROC', {
    x: 0.8, y: 6.75, w: 8, h: 0.35,
    fontFace: F.CAPS, fontSize: 10.5, color: C.SAND,
    charSpacing: 10, bold: true,
  });
  s.addText('2026', {
    x: 11.2, y: 6.65, w: 1.5, h: 0.45,
    fontFace: F.DISPLAY, fontSize: 14, color: C.GOLD,
    align: 'right', italic: true,
  });
}

// -- 02 : SOMMAIRE -----------------------------------------------------------
{
  const s = pptx.addSlide();
  s.background = { color: C.IVORY };
  s.transition = FADE;

  // Colonne image gauche
  img(s, 'atlas', { x: 0, y: 0, w: 5.2, h: SLIDE_H, sizing: { type: 'cover', w: 5.2, h: SLIDE_H } });
  band(s, 0, 0, 5.2, SLIDE_H, C.ATLAS_DARK, 0.45);
  band(s, 0, 4.5, 5.2, 3.0, C.ATLAS_DARK, 0.55);

  // Étiquette sur l'image
  s.addText('SOMMAIRE', {
    x: 0.45, y: 0.55, w: 4, h: 0.4,
    fontFace: F.CAPS, fontSize: 11, color: C.GOLD,
    charSpacing: 14, bold: true,
  });
  rect(s, { x: 0.45, y: 0.95, w: 0.4, h: 0.03, fill: { color: C.GOLD }, line: { type: 'none' } });
  s.addText('Un voyage\nau cœur du\nMaroc', {
    x: 0.45, y: 5.0, w: 4.5, h: 2,
    fontFace: F.DISPLAY, fontSize: 36, color: C.IVORY, charSpacing: 1, lineSpacingMultiple: 1.05,
  });

  // Colonne droite : liste élégante
  const items = [
    ['01', 'Introduction',                'Géographie & importance stratégique'],
    ['02', 'Histoire & identité',         'Origines et héritage amazigh'],
    ['03', 'Patrimoine architectural',    'Kasbahs, médinas et mosquées'],
    ['04', 'Patrimoine naturel',          'Cascades, montagnes, biodiversité'],
    ['05', 'Artisanat & savoir-faire',    'Tapis, poterie, tissage, terroir'],
    ['06', 'Gastronomie',                 'Saveurs et produits emblématiques'],
    ['07', 'Tourisme & économie',         'Écotourisme et opportunités'],
    ['08', 'Vision d\'avenir',            'Développement durable & inspiration'],
  ];

  const startX = 5.85;
  const startY = 0.95;
  const lineH  = 0.75;
  items.forEach((it, i) => {
    const y = startY + i * lineH;
    s.addText(it[0], {
      x: startX, y, w: 0.7, h: lineH - 0.05,
      fontFace: F.DISPLAY, fontSize: 22, color: C.OCHRE, italic: true, valign: 'middle',
    });
    vline(s, startX + 0.8, y + 0.1, lineH - 0.25, C.GOLD, 0.75);
    s.addText(it[1], {
      x: startX + 0.95, y, w: 4.8, h: 0.4,
      fontFace: F.DISPLAY, fontSize: 17, color: C.GRAPHITE, valign: 'middle',
    });
    s.addText(it[2], {
      x: startX + 0.95, y: y + 0.36, w: 5.5, h: 0.32,
      fontFace: F.SUBTLE, fontSize: 11, color: C.GREY, valign: 'middle',
    });
  });

  brand(s);
  pageNum(s, 2, TOTAL);
}

// -- 03 : INTRODUCTION GEOGRAPHIQUE ------------------------------------------
{
  const s = pptx.addSlide();
  s.background = { color: C.IVORY };
  s.transition = FADE;

  // Image plein cadre à droite
  img(s, 'valley', { x: 6.3, y: 0.6, w: 6.5, h: 6.3, sizing: { type: 'cover', w: 6.5, h: 6.3 } });
  rect(s, { x: 6.18, y: 0.6, w: 0.08, h: 6.3, fill: { color: C.OCHRE }, line: { type: 'none' } });

  // En-tête
  label(s, 0.6, 0.55, 4, 0.35, 'CHAPITRE 01  ·  INTRODUCTION', C.OCHRE);
  s.addText('Au cœur du Maroc,\nentre Atlas et plaines', {
    x: 0.6, y: 1.0, w: 5.6, h: 1.7,
    fontFace: F.DISPLAY, fontSize: 32, color: C.CHARCOAL, lineSpacingMultiple: 1.05,
  });
  line(s, 0.6, 2.75, 0.6, C.GOLD, 1.5);

  s.addText([
    { text: 'Située au centre du Royaume, la région de ', options: { fontSize: 14, color: C.GRAPHITE, fontFace: F.BODY } },
    { text: 'Béni Mellal-Khénifra', options: { fontSize: 14, color: C.ATLAS, fontFace: F.BODY, bold: true } },
    { text: ' s\'étend des plaines fertiles du Tadla aux hauts sommets du Moyen Atlas. Carrefour stratégique entre le nord et le sud, elle relie Casablanca, Marrakech et Fès.', options: { fontSize: 14, color: C.GRAPHITE, fontFace: F.BODY } },
  ], {
    x: 0.6, y: 2.95, w: 5.5, h: 1.7, lineSpacingMultiple: 1.35, valign: 'top',
  });

  // Chiffres clés (3 colonnes)
  const stats = [
    { v: '5',         u: 'Provinces',        d: 'Béni Mellal · Azilal\nFquih Ben Salah · Khénifra · Khouribga' },
    { v: '28 374',    u: 'km² de territoire', d: 'Environ 4 % du Maroc' },
    { v: '2,5 M',     u: 'd\'habitants',     d: 'Population régionale' },
  ];
  stats.forEach((st, i) => {
    const x = 0.6 + i * 1.95;
    s.addText(st.v, { x, y: 4.85, w: 1.9, h: 0.85, fontFace: F.NUMERIC, fontSize: 38, color: C.ATLAS, bold: false });
    rect(s, { x, y: 5.75, w: 0.3, h: 0.03, fill: { color: C.GOLD }, line: { type: 'none' } });
    s.addText(st.u, { x, y: 5.82, w: 1.9, h: 0.3, fontFace: F.CAPS, fontSize: 10, color: C.OCHRE, charSpacing: 4, bold: true });
    s.addText(st.d, { x, y: 6.15, w: 1.9, h: 0.7, fontFace: F.SUBTLE, fontSize: 9.5, color: C.GREY, lineSpacingMultiple: 1.2 });
  });

  brand(s);
  pageNum(s, 3, TOTAL);
}

// -- 04 : CARTE DE LA REGION -------------------------------------------------
{
  const s = pptx.addSlide();
  s.background = { color: C.SAND };
  s.transition = FADE;

  // Bandeau supérieur sombre
  band(s, 0, 0, SLIDE_W, 1.5, C.ATLAS_DARK, 1);
  s.addText('UNE GÉOGRAPHIE GÉNÉREUSE', {
    x: 0.6, y: 0.4, w: 8, h: 0.35,
    fontFace: F.CAPS, fontSize: 11, color: C.GOLD, charSpacing: 12, bold: true,
  });
  s.addText('Cinq provinces, mille visages', {
    x: 0.6, y: 0.75, w: 11, h: 0.7,
    fontFace: F.DISPLAY, fontSize: 26, color: C.IVORY,
  });

  // Carte stylisée — bloc gauche
  const mapX = 0.6, mapY = 2.0, mapW = 6.5, mapH = 5.0;
  rect(s, { x: mapX, y: mapY, w: mapW, h: mapH, fill: { color: C.IVORY }, line: { color: C.OCHRE_LT, width: 0.75 } });
  // Tracé stylisé des provinces (formes décoratives)
  const blobs = [
    { x: mapX + 0.6, y: mapY + 0.7,  w: 2.4, h: 1.6, col: C.ATLAS_MID, name: 'KHÉNIFRA' },
    { x: mapX + 2.7, y: mapY + 0.5,  w: 2.0, h: 1.4, col: C.OCHRE,     name: 'KHOURIBGA' },
    { x: mapX + 0.9, y: mapY + 2.1,  w: 2.2, h: 1.4, col: C.OCHRE_LT,  name: 'F. BEN SALAH' },
    { x: mapX + 2.9, y: mapY + 1.9,  w: 2.1, h: 1.6, col: C.ATLAS,     name: 'BÉNI MELLAL' },
    { x: mapX + 1.8, y: mapY + 3.2,  w: 3.0, h: 1.5, col: C.CASCADE,   name: 'AZILAL' },
  ];
  blobs.forEach(b => {
    s.addShape(pptx.ShapeType.roundRect, {
      x: b.x, y: b.y, w: b.w, h: b.h, rectRadius: 0.18,
      fill: { color: b.col, transparency: 12 },
      line: { color: C.IVORY, width: 2 },
    });
    s.addText(b.name, {
      x: b.x, y: b.y, w: b.w, h: b.h,
      fontFace: F.CAPS, fontSize: 10, color: C.IVORY, bold: true,
      align: 'center', valign: 'middle', charSpacing: 4,
    });
  });
  // Capitale = étoile dorée sur Béni Mellal
  s.addShape(pptx.ShapeType.star5, {
    x: mapX + 3.7, y: mapY + 2.5, w: 0.35, h: 0.35,
    fill: { color: C.GOLD }, line: { color: C.BROWN, width: 1 },
  });
  s.addText('Chef-lieu : Béni Mellal', {
    x: mapX, y: mapY + mapH - 0.5, w: mapW, h: 0.35,
    fontFace: F.SUBTLE, fontSize: 11, color: C.GRAPHITE, italic: true, align: 'center',
  });

  // Bloc droit : descriptif
  const tx = 7.5, tw = 5.3;
  label(s, tx, mapY, tw, 0.35, 'POSITION STRATÉGIQUE', C.OCHRE);
  s.addText('Un carrefour\nentre les mondes', {
    x: tx, y: mapY + 0.35, w: tw, h: 1.2,
    fontFace: F.DISPLAY, fontSize: 24, color: C.CHARCOAL, lineSpacingMultiple: 1.05,
  });
  line(s, tx, mapY + 1.65, 0.5, C.GOLD, 1.5);
  s.addText([
    { text: 'À équidistance des grandes métropoles, la région est ', options: { fontSize: 13, color: C.GRAPHITE, fontFace: F.BODY } },
    { text: 'irriguée par l\'Oum Er-Rbia', options: { fontSize: 13, color: C.CASCADE, fontFace: F.BODY, bold: true } },
    { text: ', plus long fleuve du Maroc, et bordée par les sommets du Moyen Atlas culminant à plus de 3 700 m.', options: { fontSize: 13, color: C.GRAPHITE, fontFace: F.BODY } },
  ], { x: tx, y: mapY + 1.85, w: tw, h: 2.2, lineSpacingMultiple: 1.4 });

  // Mini chiffres
  const m = [
    ['3 757 m', 'Sommet : Jbel Ghat'],
    ['Oum Er-Rbia', 'Fleuve nourricier'],
    ['200 km', 'De Casablanca'],
  ];
  m.forEach((mm, i) => {
    const y = mapY + 3.85 + i * 0.45;
    s.addShape(pptx.ShapeType.rect, { x: tx, y, w: 0.05, h: 0.3, fill: { color: C.GOLD }, line: { type: 'none' } });
    s.addText(mm[0], { x: tx + 0.2, y, w: 2.4, h: 0.3, fontFace: F.DISPLAY, fontSize: 14, color: C.ATLAS, bold: true, valign: 'middle' });
    s.addText(mm[1], { x: tx + 2.4, y, w: 2.9, h: 0.3, fontFace: F.SUBTLE, fontSize: 11, color: C.GREY, valign: 'middle' });
  });

  brand(s);
  pageNum(s, 4, TOTAL);
}

// -- 05 : HISTOIRE & IDENTITE ------------------------------------------------
{
  const s = pptx.addSlide();
  s.background = { color: C.IVORY };
  s.transition = FADE;

  // Bandeau image en haut
  img(s, 'medina', { x: 0, y: 0, w: SLIDE_W, h: 2.4, sizing: { type: 'cover', w: SLIDE_W, h: 2.4 } });
  band(s, 0, 0, SLIDE_W, 2.4, C.CHARCOAL, 0.55);
  band(s, 0, 1.2, SLIDE_W, 1.2, C.ATLAS_DARK, 0.45);

  s.addText('CHAPITRE 02  ·  HISTOIRE & IDENTITÉ', {
    x: 0.6, y: 0.5, w: 8, h: 0.35,
    fontFace: F.CAPS, fontSize: 11, color: C.GOLD, charSpacing: 12, bold: true,
  });
  s.addText('Un héritage millénaire\nau pays des Zayanes', {
    x: 0.6, y: 0.9, w: 11, h: 1.4,
    fontFace: F.DISPLAY, fontSize: 30, color: C.IVORY, lineSpacingMultiple: 1.05,
  });

  // Chronologie horizontale
  const tlY = 4.1;
  line(s, 0.7, tlY, 11.9, C.GOLD, 1.5);

  const events = [
    { date: 'Antiquité',    title: 'Civilisations amazighes',  desc: 'Présence millénaire des tribus berbères Sanhaja et Zayane.' },
    { date: 'XIᵉ siècle',    title: 'Dynastie almoravide',     desc: 'Intégration au royaume chérifien et essor des routes commerciales.' },
    { date: 'XVIIIᵉ siècle', title: 'Confédération zayane',     desc: 'Khénifra devient le bastion de la résistance amazighe.' },
    { date: '1914',          title: 'Bataille d\'El Herri',     desc: 'Page glorieuse de la résistance dirigée par Moha ou Hammou Zayani.' },
    { date: '2015',          title: 'Création de la région',    desc: 'Nouveau découpage administratif du Maroc.' },
  ];
  const colW = 11.9 / 5;
  events.forEach((e, i) => {
    const x = 0.7 + i * colW;
    // pastille
    s.addShape(pptx.ShapeType.ellipse, {
      x: x + colW / 2 - 0.12, y: tlY - 0.12, w: 0.24, h: 0.24,
      fill: { color: C.OCHRE }, line: { color: C.IVORY, width: 2 },
    });
    s.addText(e.date, {
      x: x + 0.1, y: tlY - 0.95, w: colW - 0.2, h: 0.35,
      fontFace: F.CAPS, fontSize: 10, color: C.OCHRE, bold: true, align: 'center', charSpacing: 4,
    });
    s.addText(e.title, {
      x: x + 0.1, y: tlY + 0.25, w: colW - 0.2, h: 0.45,
      fontFace: F.DISPLAY, fontSize: 14, color: C.CHARCOAL, bold: true, align: 'center',
    });
    s.addText(e.desc, {
      x: x + 0.1, y: tlY + 0.8, w: colW - 0.2, h: 1.6,
      fontFace: F.SUBTLE, fontSize: 10.5, color: C.GRAPHITE, align: 'center', lineSpacingMultiple: 1.35,
    });
  });

  brand(s);
  pageNum(s, 5, TOTAL);
}

// -- 06 : INFLUENCE AMAZIGHE -------------------------------------------------
{
  const s = pptx.addSlide();
  s.background = { color: C.SAND };
  s.transition = FADE;

  // Image décorative gauche (porte traditionnelle)
  img(s, 'door', { x: 0, y: 0, w: 5, h: SLIDE_H, sizing: { type: 'cover', w: 5, h: SLIDE_H } });
  band(s, 0, 0, 5, SLIDE_H, C.BROWN, 0.35);
  band(s, 0, 5.5, 5, 2, C.BROWN, 0.6);

  // Citation amazighe sur l'image
  s.addText('« ⵎⴰⵣⵉⵖ »', {
    x: 0.4, y: 0.5, w: 4.5, h: 0.7,
    fontFace: F.DISPLAY, fontSize: 32, color: C.GOLD, italic: true,
  });
  s.addText('« L\'homme libre »', {
    x: 0.4, y: 1.15, w: 4.5, h: 0.4,
    fontFace: F.DISPLAY, fontSize: 14, color: C.IVORY, italic: true,
  });

  s.addText('Une âme amazighe\nvivante et fière', {
    x: 0.4, y: 5.6, w: 4.5, h: 1.6,
    fontFace: F.DISPLAY, fontSize: 24, color: C.IVORY, lineSpacingMultiple: 1.05,
  });

  // Bloc droit : 3 cartes
  label(s, 5.5, 0.55, 6, 0.35, 'CHAPITRE 02 BIS  ·  CULTURE & TRADITIONS', C.OCHRE);
  s.addText('L\'âme amazighe', {
    x: 5.5, y: 0.95, w: 7, h: 0.9,
    fontFace: F.DISPLAY, fontSize: 30, color: C.CHARCOAL,
  });
  line(s, 5.5, 1.95, 0.6, C.GOLD, 1.5);

  s.addText('La culture amazighe imprègne chaque pierre, chaque chant et chaque geste. La langue Tamazight, les rites ancestraux et l\'art de vivre tribal font de cette région un sanctuaire vivant de l\'identité berbère.', {
    x: 5.5, y: 2.1, w: 7.3, h: 1.4,
    fontFace: F.BODY, fontSize: 13, color: C.GRAPHITE, lineSpacingMultiple: 1.45,
  });

  const cards = [
    { t: 'Langue',        i: 'ⵜ',  desc: 'Tamazight, langue officielle du Maroc, parlée par une grande partie de la population locale.' },
    { t: 'Folklore',      i: '♫',  desc: 'Ahidous, danses collectives, chants poétiques et tambours bendir rythment chaque fête.' },
    { t: 'Moussems',      i: '✦',  desc: 'Imilchil, célèbre moussem des fiançailles, et nombreuses fêtes saisonnières.' },
  ];
  cards.forEach((c, i) => {
    const x = 5.5 + i * 2.5;
    s.addShape(pptx.ShapeType.roundRect, {
      x, y: 3.75, w: 2.3, h: 3.2, rectRadius: 0.08,
      fill: { color: C.IVORY }, line: { color: C.OCHRE_LT, width: 0.75 },
    });
    s.addText(c.i, {
      x, y: 3.9, w: 2.3, h: 0.9,
      fontFace: F.DISPLAY, fontSize: 38, color: C.OCHRE, align: 'center', bold: true,
    });
    s.addText(c.t, {
      x, y: 4.9, w: 2.3, h: 0.4,
      fontFace: F.CAPS, fontSize: 11, color: C.ATLAS, charSpacing: 6, bold: true, align: 'center',
    });
    s.addText(c.desc, {
      x: x + 0.2, y: 5.3, w: 1.9, h: 1.6,
      fontFace: F.SUBTLE, fontSize: 10.5, color: C.GREY, align: 'center', lineSpacingMultiple: 1.3,
    });
  });

  brand(s);
  pageNum(s, 6, TOTAL);
}

// -- 07 : PATRIMOINE ARCHITECTURAL -------------------------------------------
{
  const s = pptx.addSlide();
  s.background = { color: C.IVORY };
  s.transition = FADE;

  // En-tête
  label(s, 0.6, 0.55, 6, 0.35, 'CHAPITRE 03  ·  PATRIMOINE ARCHITECTURAL', C.OCHRE);
  s.addText('Pierres anciennes,\nhistoires éternelles', {
    x: 0.6, y: 0.9, w: 7.5, h: 1.4,
    fontFace: F.DISPLAY, fontSize: 30, color: C.CHARCOAL, lineSpacingMultiple: 1.05,
  });
  line(s, 0.6, 2.35, 0.6, C.GOLD, 1.5);

  s.addText('De la médina ocre de Béni Mellal aux kasbahs perchées des montagnes, le patrimoine bâti raconte une histoire de résilience, d\'élégance et d\'identité.', {
    x: 0.6, y: 2.5, w: 7, h: 0.9,
    fontFace: F.BODY, fontSize: 13, color: C.GRAPHITE, italic: true, lineSpacingMultiple: 1.4,
  });

  // 4 cartes images
  const sites = [
    { k: 'kasbah',  t: 'Kasbah Bel Kouch',      d: 'Citadelle du XVIIIᵉ siècle dominant Béni Mellal.' },
    { k: 'medina',  t: 'Médinas anciennes',     d: 'Souks vivants et ruelles aux portes sculptées.' },
    { k: 'door',    t: 'Architecture amazighe', d: 'Maisons en pisé aux motifs ancestraux.' },
    { k: 'mountains', t: 'Villages perchés',    d: 'Aït Bouguemez, la « vallée heureuse ».' },
  ];
  sites.forEach((site, i) => {
    const x = 0.6 + i * 3.05;
    const y = 3.7;
    img(s, site.k, { x, y, w: 2.85, h: 2.1, sizing: { type: 'cover', w: 2.85, h: 2.1 } });
    rect(s, { x, y: 5.75, w: 2.85, h: 1.3, fill: { color: C.ATLAS }, line: { type: 'none' } });
    rect(s, { x, y: 5.75, w: 0.08, h: 1.3, fill: { color: C.GOLD }, line: { type: 'none' } });
    s.addText(site.t, {
      x: x + 0.18, y: 5.82, w: 2.6, h: 0.45,
      fontFace: F.DISPLAY, fontSize: 14, color: C.IVORY, bold: true,
    });
    s.addText(site.d, {
      x: x + 0.18, y: 6.25, w: 2.6, h: 0.8,
      fontFace: F.SUBTLE, fontSize: 10, color: C.SAND, lineSpacingMultiple: 1.3,
    });
  });

  brand(s);
  pageNum(s, 7, TOTAL);
}

// -- 08 : CASCADES D'OUZOUD (IMMERSIVE) --------------------------------------
{
  const s = pptx.addSlide();
  s.background = { color: C.CASCADE_DK };
  s.transition = FADE;

  img(s, 'waterfall', { x: 0, y: 0, w: SLIDE_W, h: SLIDE_H, sizing: { type: 'cover', w: SLIDE_W, h: SLIDE_H } });
  // Voile dégradé
  band(s, 0, 0, SLIDE_W, SLIDE_H, C.CASCADE_DK, 0.30);
  band(s, 7.5, 0, 5.8, SLIDE_H, C.CHARCOAL, 0.62);
  // Filet doré vertical
  rect(s, { x: 7.5, y: 0, w: 0.06, h: SLIDE_H, fill: { color: C.GOLD }, line: { type: 'none' } });

  // Texte zone droite
  s.addText('CHAPITRE 04  ·  PATRIMOINE NATUREL', {
    x: 7.85, y: 0.7, w: 5.3, h: 0.35,
    fontFace: F.CAPS, fontSize: 10.5, color: C.GOLD, charSpacing: 10, bold: true,
  });
  s.addText('Cascades\nd\'Ouzoud', {
    x: 7.85, y: 1.1, w: 5.3, h: 1.9,
    fontFace: F.DISPLAY, fontSize: 44, color: C.IVORY, lineSpacingMultiple: 1.0,
  });
  rect(s, { x: 7.85, y: 3.1, w: 0.6, h: 0.04, fill: { color: C.GOLD }, line: { type: 'none' } });
  s.addText('Trois chutes spectaculaires plongeant de 110 m au cœur du Moyen Atlas, parmi les plus belles cascades d\'Afrique du Nord.', {
    x: 7.85, y: 3.3, w: 5.2, h: 1.6,
    fontFace: F.BODY, fontSize: 13.5, color: C.SAND, italic: true, lineSpacingMultiple: 1.45,
  });

  // Stats verticales
  const sv = [
    ['110 m', 'Hauteur des chutes'],
    ['600 k', 'Visiteurs / an'],
    ['Magot', 'Singes endémiques'],
  ];
  sv.forEach((v, i) => {
    const y = 5.05 + i * 0.65;
    s.addText(v[0], { x: 7.85, y, w: 2, h: 0.5, fontFace: F.DISPLAY, fontSize: 22, color: C.GOLD, bold: true });
    s.addText(v[1], { x: 9.9, y: y + 0.1, w: 3.1, h: 0.4, fontFace: F.SUBTLE, fontSize: 11, color: C.SAND });
  });

  // Étiquette plein cadre gauche
  s.addText('SITE EMBLÉMATIQUE', {
    x: 0.5, y: 6.5, w: 4, h: 0.4,
    fontFace: F.CAPS, fontSize: 10, color: C.IVORY, charSpacing: 10, bold: true,
  });
  rect(s, { x: 0.5, y: 6.95, w: 0.5, h: 0.04, fill: { color: C.GOLD }, line: { type: 'none' } });

  brand(s, C.SAND);
  pageNum(s, 8, TOTAL);
}

// -- 09 : MOYEN ATLAS & BIODIVERSITE -----------------------------------------
{
  const s = pptx.addSlide();
  s.background = { color: C.IVORY };
  s.transition = FADE;

  // Image immersive gauche
  img(s, 'mountains', { x: 0, y: 0, w: 7.5, h: SLIDE_H, sizing: { type: 'cover', w: 7.5, h: SLIDE_H } });
  band(s, 0, 6.0, 7.5, 1.5, C.CHARCOAL, 0.5);
  s.addText('Moyen Atlas — Aït Bouguemez', {
    x: 0.5, y: 6.55, w: 6, h: 0.5,
    fontFace: F.DISPLAY, fontSize: 16, color: C.IVORY, italic: true,
  });

  // Bloc droit
  label(s, 8.0, 0.55, 5, 0.35, 'CHAPITRE 04 BIS  ·  BIODIVERSITÉ', C.OCHRE);
  s.addText('Un sanctuaire\nnaturel vivant', {
    x: 8.0, y: 0.95, w: 5, h: 1.5,
    fontFace: F.DISPLAY, fontSize: 26, color: C.CHARCOAL, lineSpacingMultiple: 1.05,
  });
  line(s, 8.0, 2.5, 0.5, C.GOLD, 1.5);
  s.addText('Forêts de cèdres millénaires, lacs cristallins, sources thermales et faune protégée : le Moyen Atlas est l\'un des écosystèmes les plus riches du Maghreb.', {
    x: 8.0, y: 2.7, w: 5, h: 1.5,
    fontFace: F.BODY, fontSize: 12.5, color: C.GRAPHITE, lineSpacingMultiple: 1.4,
  });

  // Liste à puces élégantes
  const bio = [
    'Cèdres de l\'Atlas, espèce emblématique',
    'Lac Bin El Ouidane, joyau aquatique',
    'Source d\'Aïn Asserdoun à Béni Mellal',
    'Grottes d\'Imi n\'Ifri (Azilal)',
    'Magot de Barbarie, singe protégé',
  ];
  bio.forEach((b, i) => {
    const y = 4.25 + i * 0.5;
    s.addShape(pptx.ShapeType.ellipse, {
      x: 8.0, y: y + 0.13, w: 0.14, h: 0.14,
      fill: { color: C.OCHRE }, line: { type: 'none' },
    });
    s.addText(b, {
      x: 8.25, y, w: 4.85, h: 0.4,
      fontFace: F.BODY, fontSize: 12, color: C.GRAPHITE, valign: 'middle',
    });
  });

  brand(s);
  pageNum(s, 9, TOTAL);
}

// -- 10 : ARTISANAT ----------------------------------------------------------
{
  const s = pptx.addSlide();
  s.background = { color: C.SAND };
  s.transition = FADE;

  // En-tête sombre fin
  band(s, 0, 0, SLIDE_W, 1.7, C.BROWN, 1);
  rect(s, { x: 0, y: 1.7, w: SLIDE_W, h: 0.04, fill: { color: C.GOLD }, line: { type: 'none' } });

  s.addText('CHAPITRE 05  ·  ARTISANAT & SAVOIR-FAIRE', {
    x: 0.6, y: 0.45, w: 8, h: 0.35,
    fontFace: F.CAPS, fontSize: 11, color: C.GOLD, charSpacing: 12, bold: true,
  });
  s.addText('Des mains qui parlent\nle langage des siècles', {
    x: 0.6, y: 0.85, w: 11, h: 0.9,
    fontFace: F.DISPLAY, fontSize: 24, color: C.IVORY, lineSpacingMultiple: 1.0,
  });

  // 4 cartes en grille
  const arts = [
    { k: 'rug',       t: 'Tapis berbères',       d: 'Tissages aux motifs ancestraux des tribus zayanes.' },
    { k: 'pottery',   t: 'Poterie',              d: 'Terres cuites façonnées à la main, héritage millénaire.' },
    { k: 'craftsman', t: 'Tissage & broderie',   d: 'Burnous, haïks et djellabas brodés au fil de soie.' },
    { k: 'olives',    t: 'Produits du terroir',  d: 'Huile d\'olive, miel d\'Azilal, safran et amandes.' },
  ];
  arts.forEach((a, i) => {
    const x = 0.6 + i * 3.05;
    const y = 2.1;
    img(s, a.k, { x, y, w: 2.85, h: 2.85, sizing: { type: 'cover', w: 2.85, h: 2.85 } });
    rect(s, { x, y: y + 2.85, w: 2.85, h: 1.95, fill: { color: C.IVORY }, line: { color: C.OCHRE_LT, width: 0.5 } });
    rect(s, { x, y: y + 2.85, w: 0.08, h: 1.95, fill: { color: C.OCHRE }, line: { type: 'none' } });
    s.addText('0' + (i + 1), {
      x: x + 0.2, y: y + 2.95, w: 0.6, h: 0.35,
      fontFace: F.CAPS, fontSize: 10, color: C.OCHRE, bold: true, charSpacing: 4,
    });
    s.addText(a.t, {
      x: x + 0.2, y: y + 3.3, w: 2.6, h: 0.45,
      fontFace: F.DISPLAY, fontSize: 15, color: C.CHARCOAL, bold: true,
    });
    s.addText(a.d, {
      x: x + 0.2, y: y + 3.8, w: 2.55, h: 0.9,
      fontFace: F.SUBTLE, fontSize: 10.5, color: C.GREY, lineSpacingMultiple: 1.35,
    });
  });

  brand(s);
  pageNum(s, 10, TOTAL);
}

// -- 11 : GASTRONOMIE --------------------------------------------------------
{
  const s = pptx.addSlide();
  s.background = { color: C.IVORY };
  s.transition = FADE;

  // Image immersive plein cadre droite
  img(s, 'tagine', { x: 6.5, y: 0, w: 6.83, h: SLIDE_H, sizing: { type: 'cover', w: 6.83, h: SLIDE_H } });
  // Voile vertical à gauche image pour fondu
  band(s, 6.5, 0, 1.5, SLIDE_H, C.IVORY, 0.35);

  // Bloc texte gauche
  label(s, 0.6, 0.55, 6, 0.35, 'CHAPITRE 06  ·  GASTRONOMIE', C.OCHRE);
  s.addText('Les saveurs d\'une\nterre généreuse', {
    x: 0.6, y: 0.95, w: 6, h: 1.6,
    fontFace: F.DISPLAY, fontSize: 30, color: C.CHARCOAL, lineSpacingMultiple: 1.05,
  });
  line(s, 0.6, 2.6, 0.6, C.GOLD, 1.5);
  s.addText('De la table familiale aux moussems festifs, la cuisine régionale célèbre l\'huile d\'olive, le miel parfumé et les épices envoûtantes.', {
    x: 0.6, y: 2.8, w: 5.6, h: 1.0,
    fontFace: F.BODY, fontSize: 13, color: C.GRAPHITE, italic: true, lineSpacingMultiple: 1.4,
  });

  // Cartes plats / produits avec micro-vignettes
  const dishes = [
    { k: 'tagine',  t: 'Tagine berbère',       d: 'Mijoté aux légumes et viandes de l\'Atlas.' },
    { k: 'tea',     t: 'Thé à la menthe',      d: 'Symbole sacré de l\'hospitalité.' },
    { k: 'spices',  t: 'Épices & ras el-hanout', d: 'Trésors aromatiques du souk.' },
    { k: 'olives',  t: 'Huile d\'olive',       d: 'Or vert du Tadla, label régional.' },
  ];
  dishes.forEach((d, i) => {
    const y = 4.0 + i * 0.75;
    img(s, d.k, { x: 0.6, y, w: 0.7, h: 0.7, sizing: { type: 'cover', w: 0.7, h: 0.7 } });
    rect(s, { x: 0.6, y, w: 0.05, h: 0.7, fill: { color: C.OCHRE }, line: { type: 'none' } });
    s.addText(d.t, {
      x: 1.45, y, w: 5, h: 0.35,
      fontFace: F.DISPLAY, fontSize: 14, color: C.ATLAS, bold: true,
    });
    s.addText(d.d, {
      x: 1.45, y: y + 0.35, w: 5, h: 0.35,
      fontFace: F.SUBTLE, fontSize: 11, color: C.GREY,
    });
  });

  brand(s);
  pageNum(s, 11, TOTAL);
}

// -- 12 : TOURISME & ECOTOURISME ---------------------------------------------
{
  const s = pptx.addSlide();
  s.background = { color: C.IVORY };
  s.transition = FADE;

  label(s, 0.6, 0.55, 8, 0.35, 'CHAPITRE 07  ·  TOURISME & ÉCOTOURISME', C.OCHRE);
  s.addText('Une destination\nd\'expérience authentique', {
    x: 0.6, y: 0.95, w: 11, h: 1.4,
    fontFace: F.DISPLAY, fontSize: 30, color: C.CHARCOAL, lineSpacingMultiple: 1.05,
  });
  line(s, 0.6, 2.45, 0.6, C.GOLD, 1.5);

  // Bandeau images horizontal panoramique
  const tiles = ['waterfall', 'mountains', 'valley', 'sunset'];
  const tw = 3.0, th = 2.0;
  tiles.forEach((k, i) => {
    const x = 0.6 + i * (tw + 0.1);
    const y = 2.85;
    img(s, k, { x, y, w: tw, h: th, sizing: { type: 'cover', w: tw, h: th } });
  });

  // 3 axes en bas
  const axes = [
    { ic: '◈', t: 'Écotourisme',        d: 'Randonnées dans l\'Atlas, observation faune & flore, séjours en gîtes ruraux.' },
    { ic: '◇', t: 'Tourisme culturel',  d: 'Moussems, médinas, artisanat vivant et patrimoine amazigh.' },
    { ic: '◉', t: 'Tourisme d\'aventure', d: 'Vol parapente à Béni Mellal, trekking, canyoning, sports d\'eau.' },
  ];
  const cw = 4.0;
  axes.forEach((a, i) => {
    const x = 0.6 + i * (cw + 0.1);
    const y = 5.15;
    rect(s, { x, y, w: cw, h: 1.9, fill: { color: C.ATLAS_DARK }, line: { type: 'none' } });
    rect(s, { x, y, w: cw, h: 0.06, fill: { color: C.GOLD }, line: { type: 'none' } });
    s.addText(a.ic, { x: x + 0.25, y: y + 0.2, w: 0.6, h: 0.7, fontFace: F.DISPLAY, fontSize: 28, color: C.GOLD });
    s.addText(a.t, {
      x: x + 0.95, y: y + 0.25, w: cw - 1.1, h: 0.5,
      fontFace: F.DISPLAY, fontSize: 16, color: C.IVORY, bold: true,
    });
    s.addText(a.d, {
      x: x + 0.95, y: y + 0.78, w: cw - 1.1, h: 1.1,
      fontFace: F.SUBTLE, fontSize: 10.5, color: C.SAND, lineSpacingMultiple: 1.35,
    });
  });

  brand(s);
  pageNum(s, 12, TOTAL);
}

// -- 13 : ECONOMIE REGIONALE (CHIFFRES CLES) ---------------------------------
{
  const s = pptx.addSlide();
  s.background = { color: C.SAND };
  s.transition = FADE;

  // Bandeau supérieur
  band(s, 0, 0, SLIDE_W, 1.4, C.ATLAS, 1);
  s.addText('CHAPITRE 08  ·  ÉCONOMIE & RESSOURCES', {
    x: 0.6, y: 0.35, w: 8, h: 0.35,
    fontFace: F.CAPS, fontSize: 11, color: C.GOLD, charSpacing: 12, bold: true,
  });
  s.addText('Une économie ancrée, des perspectives infinies', {
    x: 0.6, y: 0.75, w: 12, h: 0.5,
    fontFace: F.DISPLAY, fontSize: 22, color: C.IVORY,
  });

  // 4 grandes cartes (statistiques)
  const stats = [
    { v: '38 %',  l: 'Agriculture',      d: 'Du PIB régional — céréales, betteraves, oliviers, agrumes.', col: C.ATLAS },
    { v: '75 %',  l: 'Phosphate',        d: 'Khouribga produit ~75 % du phosphate marocain.',              col: C.OCHRE },
    { v: '+12 %', l: 'Tourisme',         d: 'Croissance annuelle des nuitées dans la région.',             col: C.CASCADE },
    { v: '6 000+', l: 'Coopératives',    d: 'Tissu artisanal et agricole structuré et féminin.',           col: C.BROWN },
  ];
  const cw = (SLIDE_W - 1.2 - 0.45) / 4;
  stats.forEach((st, i) => {
    const x = 0.6 + i * (cw + 0.15);
    const y = 1.95;
    rect(s, { x, y, w: cw, h: 3.7, fill: { color: C.IVORY }, line: { color: C.OCHRE_LT, width: 0.5 } });
    rect(s, { x, y, w: cw, h: 0.12, fill: { color: st.col }, line: { type: 'none' } });
    s.addText(st.v, {
      x, y: y + 0.4, w: cw, h: 1.5,
      fontFace: F.NUMERIC, fontSize: 56, color: st.col, align: 'center', bold: false,
    });
    rect(s, { x: x + cw / 2 - 0.2, y: y + 1.95, w: 0.4, h: 0.04, fill: { color: C.GOLD }, line: { type: 'none' } });
    s.addText(st.l, {
      x, y: y + 2.05, w: cw, h: 0.4,
      fontFace: F.CAPS, fontSize: 12, color: C.OCHRE, charSpacing: 6, bold: true, align: 'center',
    });
    s.addText(st.d, {
      x: x + 0.2, y: y + 2.55, w: cw - 0.4, h: 1.0,
      fontFace: F.SUBTLE, fontSize: 11, color: C.GRAPHITE, align: 'center', lineSpacingMultiple: 1.35,
    });
  });

  // Bandeau bas info
  band(s, 0, 5.85, SLIDE_W, 1.65, C.IVORY, 1);
  s.addText('SECTEURS PORTEURS', {
    x: 0.6, y: 6.0, w: 4, h: 0.35,
    fontFace: F.CAPS, fontSize: 10, color: C.OCHRE, charSpacing: 6, bold: true,
  });
  const sectors = ['Agro-industrie', 'Mines & phosphate', 'Tourisme rural', 'Énergies renouvelables', 'Industries du terroir'];
  sectors.forEach((sec, i) => {
    const x = 0.6 + i * 2.5;
    chip(s, x, 6.5, 2.2, 0.45, sec, C.ATLAS);
  });

  brand(s);
  pageNum(s, 13, TOTAL);
}

// -- 14 : POTENTIEL DE DEVELOPPEMENT -----------------------------------------
{
  const s = pptx.addSlide();
  s.background = { color: C.IVORY };
  s.transition = FADE;

  // Image gauche immersive
  img(s, 'sheep', { x: 0, y: 0, w: 4.8, h: SLIDE_H, sizing: { type: 'cover', w: 4.8, h: SLIDE_H } });
  band(s, 0, 0, 4.8, SLIDE_H, C.ATLAS_DARK, 0.35);
  band(s, 0, 5.5, 4.8, 2, C.ATLAS_DARK, 0.55);
  s.addText('« Une terre\nqui prépare\ndemain. »', {
    x: 0.4, y: 4.9, w: 4.3, h: 2.0,
    fontFace: F.DISPLAY, fontSize: 22, color: C.IVORY, italic: true, lineSpacingMultiple: 1.05,
  });
  s.addText('— Vision régionale 2030', {
    x: 0.4, y: 6.6, w: 4.3, h: 0.35,
    fontFace: F.SUBTLE, fontSize: 11, color: C.GOLD,
  });

  // Bloc droit
  label(s, 5.3, 0.55, 7, 0.35, 'CHAPITRE 08 BIS  ·  POTENTIEL DE DÉVELOPPEMENT', C.OCHRE);
  s.addText('Quatre axes pour\nl\'avenir', {
    x: 5.3, y: 0.95, w: 7.5, h: 1.4,
    fontFace: F.DISPLAY, fontSize: 28, color: C.CHARCOAL, lineSpacingMultiple: 1.05,
  });
  line(s, 5.3, 2.5, 0.6, C.GOLD, 1.5);

  const pillars = [
    { n: '01', t: 'Agriculture moderne',  d: 'Valorisation des produits du terroir, irrigation efficiente, labels qualité (huile, miel, safran).' },
    { n: '02', t: 'Tourisme durable',     d: 'Écolodges, circuits authentiques, formation des guides locaux et préservation des sites.' },
    { n: '03', t: 'Infrastructures',      d: 'Connectivité autoroutière, énergies vertes, plateformes logistiques et industrielles.' },
    { n: '04', t: 'Capital humain',       d: 'Formation, entrepreneuriat féminin, coopératives et innovation rurale.' },
  ];
  pillars.forEach((p, i) => {
    const y = 2.85 + i * 1.05;
    rect(s, { x: 5.3, y, w: 0.06, h: 0.85, fill: { color: C.GOLD }, line: { type: 'none' } });
    s.addText(p.n, { x: 5.5, y, w: 0.7, h: 0.45, fontFace: F.DISPLAY, fontSize: 18, color: C.OCHRE, italic: true });
    s.addText(p.t, { x: 6.2, y, w: 6.5, h: 0.4, fontFace: F.DISPLAY, fontSize: 15, color: C.CHARCOAL, bold: true });
    s.addText(p.d, { x: 6.2, y: y + 0.4, w: 6.7, h: 0.55, fontFace: F.SUBTLE, fontSize: 11, color: C.GREY, lineSpacingMultiple: 1.35 });
  });

  brand(s);
  pageNum(s, 14, TOTAL);
}

// -- 15 : POURQUOI UNIQUE ----------------------------------------------------
{
  const s = pptx.addSlide();
  s.background = { color: C.IVORY };
  s.transition = FADE;

  // Bandeau supérieur image
  img(s, 'sunset', { x: 0, y: 0, w: SLIDE_W, h: 3.2, sizing: { type: 'cover', w: SLIDE_W, h: 3.2 } });
  band(s, 0, 0, SLIDE_W, 3.2, C.CHARCOAL, 0.40);
  band(s, 0, 1.8, SLIDE_W, 1.4, C.CHARCOAL, 0.45);

  s.addText('CHAPITRE 09  ·  MISE EN VALEUR', {
    x: 0.6, y: 0.55, w: 8, h: 0.35,
    fontFace: F.CAPS, fontSize: 11, color: C.GOLD, charSpacing: 12, bold: true,
  });
  s.addText('Pourquoi Béni Mellal-Khénifra\nest unique', {
    x: 0.6, y: 1.05, w: 12, h: 1.7,
    fontFace: F.DISPLAY, fontSize: 32, color: C.IVORY, lineSpacingMultiple: 1.05,
  });
  rect(s, { x: 0.6, y: 2.95, w: 0.6, h: 0.04, fill: { color: C.GOLD }, line: { type: 'none' } });

  // Trois colonnes
  const cols = [
    {
      t: 'Atouts humains',
      lines: [
        'Population accueillante et fière',
        'Identité amazighe vivante',
        'Esprit communautaire des moussems',
        'Savoir-faire ancestraux transmis',
      ],
      col: C.ATLAS,
    },
    {
      t: 'Atouts naturels',
      lines: [
        'Diversité unique des paysages',
        'Eau abondante (Oum Er-Rbia)',
        'Cascades, lacs, forêts, sommets',
        'Climat tempéré et favorable',
      ],
      col: C.CASCADE,
    },
    {
      t: 'Vision durable',
      lines: [
        'Tourisme responsable',
        'Économie circulaire & terroir',
        'Valorisation du patrimoine bâti',
        'Inclusion et innovation',
      ],
      col: C.OCHRE,
    },
  ];
  cols.forEach((c, i) => {
    const x = 0.6 + i * 4.15;
    const y = 3.65;
    rect(s, { x, y, w: 4, h: 3.3, fill: { color: C.IVORY }, line: { color: C.OCHRE_LT, width: 0.5 } });
    rect(s, { x, y, w: 4, h: 0.12, fill: { color: c.col }, line: { type: 'none' } });
    s.addText(c.t, {
      x: x + 0.3, y: y + 0.3, w: 3.4, h: 0.5,
      fontFace: F.DISPLAY, fontSize: 18, color: C.CHARCOAL, bold: true,
    });
    rect(s, { x: x + 0.3, y: y + 0.9, w: 0.3, h: 0.03, fill: { color: C.GOLD }, line: { type: 'none' } });
    c.lines.forEach((l, j) => {
      const yy = y + 1.05 + j * 0.5;
      s.addShape(pptx.ShapeType.ellipse, {
        x: x + 0.3, y: yy + 0.13, w: 0.12, h: 0.12,
        fill: { color: c.col }, line: { type: 'none' },
      });
      s.addText(l, {
        x: x + 0.55, y: yy, w: 3.3, h: 0.4,
        fontFace: F.BODY, fontSize: 11.5, color: C.GRAPHITE, valign: 'middle',
      });
    });
  });

  brand(s);
  pageNum(s, 15, TOTAL);
}

// -- 16 : CITATION IMMERSIVE -------------------------------------------------
{
  const s = pptx.addSlide();
  s.background = { color: C.CHARCOAL };
  s.transition = FADE;

  img(s, 'atlas', { x: 0, y: 0, w: SLIDE_W, h: SLIDE_H, sizing: { type: 'cover', w: SLIDE_W, h: SLIDE_H } });
  band(s, 0, 0, SLIDE_W, SLIDE_H, C.ATLAS_DARK, 0.55);
  band(s, 0, 2.4, SLIDE_W, 3.0, C.CHARCOAL, 0.45);

  // Grand guillemet
  s.addText('“', {
    x: 0.6, y: 1.3, w: 3, h: 2.8,
    fontFace: F.DISPLAY, fontSize: 220, color: C.GOLD, italic: true,
  });

  // Citation
  s.addText('Le patrimoine est ce que nous transmettons\nà l\'avenir, comme une promesse de la terre.', {
    x: 1.5, y: 3.0, w: 10.5, h: 2.0,
    fontFace: F.DISPLAY, fontSize: 30, color: C.IVORY, italic: true, lineSpacingMultiple: 1.2,
  });

  rect(s, { x: 1.5, y: 5.15, w: 0.5, h: 0.04, fill: { color: C.GOLD }, line: { type: 'none' } });
  s.addText('— Esprit de Béni Mellal-Khénifra', {
    x: 1.5, y: 5.25, w: 10, h: 0.4,
    fontFace: F.SUBTLE, fontSize: 13, color: C.GOLD, charSpacing: 4,
  });

  brand(s, C.SAND);
  pageNum(s, 16, TOTAL);
}

// -- 17 : CONCLUSION / MERCI -------------------------------------------------
{
  const s = pptx.addSlide();
  s.background = { color: C.IVORY };
  s.transition = FADE;

  // Composition asymétrique : image gauche immersive
  img(s, 'sunset', { x: 0, y: 0, w: 6.5, h: SLIDE_H, sizing: { type: 'cover', w: 6.5, h: SLIDE_H } });
  band(s, 0, 0, 6.5, SLIDE_H, C.OCHRE_DARK, 0.30);
  band(s, 0, 5.0, 6.5, 2.5, C.BROWN, 0.50);

  s.addText('UNE TERRE D\'AVENIR', {
    x: 0.5, y: 5.4, w: 6, h: 0.35,
    fontFace: F.CAPS, fontSize: 11, color: C.GOLD, charSpacing: 12, bold: true,
  });
  s.addText('Béni Mellal-Khénifra\nvous accueille', {
    x: 0.5, y: 5.85, w: 6, h: 1.4,
    fontFace: F.DISPLAY, fontSize: 24, color: C.IVORY, lineSpacingMultiple: 1.05,
  });

  // Bloc droit : remerciements
  s.addText('MERCI', {
    x: 7.0, y: 1.5, w: 6, h: 1.3,
    fontFace: F.DISPLAY, fontSize: 80, color: C.ATLAS, italic: false, charSpacing: 6,
  });
  rect(s, { x: 7.0, y: 2.85, w: 1.0, h: 0.06, fill: { color: C.GOLD }, line: { type: 'none' } });
  s.addText('Pour votre attention', {
    x: 7.0, y: 3.0, w: 6, h: 0.5,
    fontFace: F.DISPLAY, fontSize: 22, color: C.OCHRE, italic: true,
  });

  s.addText('Que ce voyage à travers les paysages, les traditions et les talents de Béni Mellal-Khénifra inspire de nouvelles rencontres, de nouvelles ambitions et un attachement durable à cette terre d\'authenticité.', {
    x: 7.0, y: 3.85, w: 5.8, h: 2.0,
    fontFace: F.BODY, fontSize: 12.5, color: C.GRAPHITE, lineSpacingMultiple: 1.5, italic: false,
  });

  // Pied de page raffiné
  rect(s, { x: 7.0, y: 6.4, w: 5.8, h: 0.04, fill: { color: C.OCHRE_LT }, line: { type: 'none' } });
  s.addText('BÉNI MELLAL-KHÉNIFRA  ·  ENTRE PATRIMOINE, NATURE ET AUTHENTICITÉ', {
    x: 7.0, y: 6.55, w: 5.8, h: 0.4,
    fontFace: F.CAPS, fontSize: 9, color: C.GREY, charSpacing: 6,
  });

  pageNum(s, 17, TOTAL);
}

// =============================================================================
//  EXPORT
// =============================================================================
const OUT = path.join(__dirname, '..', 'Beni-Mellal-Khenifra.pptx');
pptx.writeFile({ fileName: OUT })
  .then(name => console.log('\n✓ Présentation générée : ' + name))
  .catch(err => { console.error('Erreur lors de la génération :', err); process.exit(1); });
