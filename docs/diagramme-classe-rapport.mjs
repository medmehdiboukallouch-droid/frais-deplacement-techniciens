// Recrée, en HAUTE RÉSOLUTION et NET, le diagramme de classes du rapport (page 19).
// Sortie : docs/diagramme-classe-rapport.png
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const puppeteer = require('puppeteer-core')
const mermaidJs = require.resolve('mermaid/dist/mermaid.min.js')
const __dirname = path.dirname(fileURLToPath(import.meta.url))

const CHROME = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
].find((p) => fs.existsSync(p))

const def = `
classDiagram
direction LR

class Role {
  <<enumeration>>
  GESTIONNAIRE
  TECHNICIEN
}

class Utilisateur {
  <<abstract>>
  +id : int
  +nom : String
  +prenom : String
  +email : String
  +motDePasse : String
  +role : Role
  +actif : boolean
  +seConnecter() boolean
  +seDeconnecter() void
  +changerMotDePasse() void
}
class Gestionnaire {
  +departement : String
}
class Technicien {
  +matricule : String
  +telephone : String
  +service : String
  +ville : String
}
class Projet {
  +id : int
  +nom : String
  +client : String
  +localisation : String
  +statut : String
}
class Intervention {
  +id : int
  +titre : String
  +lieuDepart : String
  +lieuArrivee : String
  +dateDebut : Date
  +dateFin : Date
  +statut : String
}
class Rapport {
  +id : int
  +date : Date
  +presenceConfirmee : boolean
  +materielUtilise : String
  +tempsPasse : String
  +statut : String
}
class FraisDeplacement {
  +id : int
  +typeFrais : String
  +montant : double
  +devise : String
  +dateFrais : Date
  +justificatifUrl : String
  +justificatifNom : String
  +statutValidation : String
}
class Validation {
  +id : int
  +decision : String
  +commentaire : String
  +dateDecision : Date
}
class Materiau {
  +id : int
  +reference : String
  +nom : String
  +categorie : String
  +quantiteStock : int
  +prixUnitaire : double
  +actif : boolean
}

Utilisateur <|-- Gestionnaire
Utilisateur <|-- Technicien

Gestionnaire "1" --> "0..*" Technicien : supervise
Gestionnaire "1" --> "0..*" Validation : effectue
Gestionnaire "1" ..> "0..*" Materiau : gère

Technicien "1" --> "0..*" Intervention : réalise
Technicien "1" --> "0..*" Rapport : rédige
Technicien "1" --> "0..*" FraisDeplacement : crée

Projet "1" --> "0..*" Intervention : planifie

Intervention "1" --> "0..*" Rapport : génère
Intervention "1" --> "0..*" FraisDeplacement : engendre

FraisDeplacement "1" --> "0..*" Validation : reçoit
`

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] })
try {
  const page = await browser.newPage()
  await page.setViewport({ width: 2600, height: 2000, deviceScaleFactor: 2 })
  await page.setContent(`<!DOCTYPE html><html><head><meta charset="utf-8">
    <style>
      body { margin:0; background:#fff; font-family:'Segoe UI',Arial,sans-serif; }
      #wrap { padding: 30px; display:inline-block; }
      h1 { color:#15803d; font-size:46px; font-weight:800; margin:0 0 22px; text-align:center; }
    </style></head>
    <body><div id="wrap"><h1>Diagramme de classes</h1><div id="m"></div></div></body></html>`, { waitUntil: 'load' })

  await page.addScriptTag({ path: mermaidJs })
  await page.evaluate(async (d) => {
    // eslint-disable-next-line no-undef
    window.mermaid.initialize({
      startOnLoad: false,
      theme: 'base',
      fontFamily: 'Arial, sans-serif',
      themeVariables: {
        fontSize: '17px',
        primaryColor: '#ffffff',
        primaryBorderColor: '#000000',
        primaryTextColor: '#000000',
        lineColor: '#000000',
        secondaryColor: '#ffffff',
        tertiaryColor: '#ffffff',
        background: '#ffffff',
        mainBkg: '#ffffff',
        nodeBorder: '#000000',
        clusterBkg: '#ffffff',
        titleColor: '#000000',
        edgeLabelBackground: '#ffffff',
        attributeBackgroundColorOdd: '#ffffff',
        attributeBackgroundColorEven: '#f5f5f5',
      },
    })
    // eslint-disable-next-line no-undef
    const { svg } = await window.mermaid.render('graph', d)
    const host = document.getElementById('m')
    host.innerHTML = svg
    const el = host.querySelector('svg')
    const vb = el.viewBox.baseVal
    const scale = 1.5
    el.style.maxWidth = 'none'
    el.style.width = vb.width * scale + 'px'
    el.style.height = vb.height * scale + 'px'
  }, def)

  await new Promise((r) => setTimeout(r, 500))
  const el = await page.$('#wrap')
  await el.screenshot({ path: path.join(__dirname, 'diagramme-classe-rapport.png') })
  console.log('OK diagramme-classe-rapport.png')
} finally {
  await browser.close()
}
