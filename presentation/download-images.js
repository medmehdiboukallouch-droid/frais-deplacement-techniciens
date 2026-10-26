/**
 * Télécharge des photos réellement liées à la région Béni Mellal-Khénifra
 * via Wikimedia Commons (CC BY-SA, avec attribution dans les métadonnées).
 *
 * Usage : node download-images.js
 * Forcer le re-téléchargement : node download-images.js --force
 */
const fs = require('fs');
const path = require('path');
const https = require('https');

const IMAGES_DIR = path.join(__dirname, 'images');
const FORCE = process.argv.includes('--force');

if (!fs.existsSync(IMAGES_DIR)) fs.mkdirSync(IMAGES_DIR);

/** Noms EXACTS des fichiers sur commons.wikimedia.org (voir la fiche du fichier) */
const COMMONS = [
  // Couverture : ville + kasbah emblématique
  { key: 'cover', file: 'Beni Mellal city & its castle.jpg' },
  // Atlas / sommaire : source Aïn Asserdoune à Béni Mellal
  { key: 'atlas', file: 'Ain_Asserdoune_with_Castle.jpeg' },
  // Carte / contexte hydrique : lac du barrage Bin el Ouidane (province d\'Azilal)
  { key: 'map_bg', file: 'Bin_Lwidan_azilal.jpg' },
  // Kasbah / forteresse de la ville
  { key: 'kasbah', file: 'Beni_Mellal_Fortress_(April_2016)_02.jpg' },
  // Médina / souk de Béni Mellal
  { key: 'medina', file: 'Beni_Mellal_centre_-_market_1.jpg' },
  // Cascades d\'Ouzoud (commune d\'Ouzoud, province d\'Azilal)
  { key: 'waterfall', file: 'Ouzoud_waterfalls_In_spring-Morocco.jpg' },
  // Vallée heureuse — panorama Moyen Atlas
  { key: 'mountains', file: 'Panoramic_view_of_Ait_Bouguemez_valley.jpg' },
  // Introduction : vallée de l\'assif n\'Aït Bouguemez
  { key: 'valley', file: "Vallée de l'assif n'Ait Bouguemez.jpg" },
  // Olives / terroir : marché local (produits du Tadla / région)
  { key: 'olives', file: 'Beni_Mellal_centre_-_market_3.jpg' },
  // Tapis : marché de Tabant (tissus et artisanat local)
  { key: 'rug', file: 'Market_in_Tabant,_Aït_Bouguemez.jpg' },
  // Poterie / céramique : artisanat du Haouz souvent exposé — ici souk de Béni Mellal (arts de la table)
  { key: 'pottery', file: 'Beni_Mellal_centre_-_market_4.jpg' },
  // Tajine
  { key: 'tagine', file: 'Moroccan_food.jpg' },
  // Thé à la menthe
  { key: 'tea', file: 'Moroccan_mint_tea.jpg' },
  // Épices : étal du souk
  { key: 'spices', file: 'Beni_Mellal_centre_-_market_2.jpg' },
  // Architecture / rue — Béni Mellal
  { key: 'door', file: 'Beni_Mellal_6.jpg' },
  // Lumière du soir sur le Haut Atlas vu depuis la vallée
  { key: 'sunset', file: 'View_over_Aït_Bouguemez.jpg' },
  // Artisanat / vie locale : marché de Tabant
  { key: 'craftsman', file: 'The market in Tabant, Aït Bouguemez.jpg' },
  // Élevage / pastoralisme : Haut Atlas (région)
  { key: 'sheep', file: 'Mule_eating_grass_in_Ait_Bouguemez_valley.jpg' },
];

function commonsUrl(filename) {
  const underscored = filename.replace(/ /g, '_');
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(underscored)}?width=2200`;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function download(url, dest, redirects = 0) {
  return new Promise((resolve, reject) => {
    if (redirects > 8) return reject(new Error('Too many redirects'));
    const req = https.get(
      url,
      {
        timeout: 120000,
        headers: {
          'User-Agent':
            'BeniMellalPresentation/1.1 (educational slideshow; https://github.com/; Node.js)',
          Accept: 'image/webp,image/apng,image/*,*/*;q=0.8',
        },
      },
      (res) => {
        if (res.statusCode === 429) {
          res.resume();
          return reject(new Error('HTTP 429'));
        }
        if ([301, 302, 307, 308].includes(res.statusCode)) {
          res.resume();
          let next = res.headers.location;
          if (next && next.startsWith('/'))
            next = new URL(next, 'https://commons.wikimedia.org').href;
          return download(next, dest, redirects + 1).then(resolve, reject);
        }
        if (res.statusCode !== 200) {
          res.resume();
          return reject(new Error('HTTP ' + res.statusCode));
        }
        const file = fs.createWriteStream(dest);
        res.pipe(file);
        file.on('finish', () => file.close(() => resolve(dest)));
        file.on('error', reject);
      }
    );
    req.on('timeout', () => req.destroy(new Error('Timeout')));
    req.on('error', reject);
  });
}

function buildFallbackSvg(key) {
  const palettes = {
    cover: ['#1d3a1a', '#3d5b2a', '#c97b3c'],
    atlas: ['#2d4f2a', '#5a7a3d', '#a8b574'],
    map_bg: ['#1a4660', '#2a6f8c', '#86b8c9'],
    kasbah: ['#5c2c18', '#a45a2c', '#e3c9a4'],
    medina: ['#c97b3c', '#a45a2c', '#5c2c18'],
    waterfall: ['#1a4660', '#2a6f8c', '#86b8c9'],
    mountains: ['#2d4f2a', '#3d5b3a', '#86a674'],
    valley: ['#2d4f2a', '#86a674', '#c9b961'],
    olives: ['#5a7a3d', '#86a674', '#c9b961'],
    rug: ['#5c2c18', '#c97b3c', '#c9a961'],
    pottery: ['#a45a2c', '#c97b3c', '#e3c9a4'],
    tagine: ['#a23b1e', '#c97b3c', '#f4c87a'],
    tea: ['#3d5b2a', '#86a674', '#c9a961'],
    spices: ['#c97b1e', '#a23b1e', '#c9a961'],
    door: ['#1a4660', '#2a6f8c', '#c9a961'],
    sunset: ['#1d2a3a', '#a23b1e', '#f4c87a'],
    craftsman: ['#5c2c18', '#a45a2c', '#c9a961'],
    sheep: ['#86a674', '#c9b961', '#e3c9a4'],
  };
  const [a, b, c] = palettes[key] || ['#2d4f2a', '#c97b3c', '#2a6f8c'];
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1067" viewBox="0 0 1600 1067">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${a}"/>
      <stop offset="55%" stop-color="${b}"/>
      <stop offset="100%" stop-color="${c}"/>
    </linearGradient>
  </defs>
  <rect width="1600" height="1067" fill="url(#g)"/>
</svg>`;
}

async function downloadWithRetry(url, dest, maxAttempts = 5) {
  let lastErr;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await download(url, dest);
      return;
    } catch (e) {
      lastErr = e;
      const wait = e.message === 'HTTP 429' ? 8000 * attempt : 2000 * attempt;
      console.log('   ↳ tentative ' + attempt + '/' + maxAttempts + ' échouée, attente ' + wait / 1000 + ' s…');
      await sleep(wait);
    }
  }
  throw lastErr;
}

async function main() {
  const results = {};
  for (let i = 0; i < COMMONS.length; i++) {
    const img = COMMONS[i];
    const dest = path.join(IMAGES_DIR, img.key + '.jpg');
    const svgDest = path.join(IMAGES_DIR, img.key + '.svg');

    if (FORCE && fs.existsSync(dest)) {
      fs.unlinkSync(dest);
    }

    if (fs.existsSync(dest) && fs.statSync(dest).size > 8000) {
      console.log('OK (cache)   ' + img.key);
      results[img.key] = dest;
      continue;
    }

    const url = commonsUrl(img.file);
    try {
      await downloadWithRetry(url, dest);
      const size = fs.statSync(dest).size;
      if (size < 8000) throw new Error('Fichier trop petit (' + size + ' octets)');
      console.log('OK (dl)      ' + img.key + ' — ' + img.file + ' (' + Math.round(size / 1024) + ' Ko)');
      results[img.key] = dest;
    } catch (err) {
      console.log('ÉCHEC ' + img.key + ' — ' + img.file + ' (' + err.message + ')');
      fs.writeFileSync(svgDest, buildFallbackSvg(img.key));
      results[img.key] = svgDest;
    }

    if (i < COMMONS.length - 1) await sleep(2500);
  }
  fs.writeFileSync(path.join(__dirname, 'images-manifest.json'), JSON.stringify(results, null, 2));
  console.log('\nManifeste enregistré. Total : ' + Object.keys(results).length + ' visuels.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
