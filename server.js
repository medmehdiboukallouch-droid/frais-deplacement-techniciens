import express from 'express'
import pg from 'pg'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import cors from 'cors'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { fileURLToPath } from 'url'

dotenv.config()

const { Pool } = pg

// Dossier où sont stockés les fichiers téléversés (justificatifs de frais).
// On le crée au démarrage s'il n'existe pas.
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const UPLOADS_DIR = path.join(__dirname, 'uploads')
const JUSTIFICATIFS_DIR = path.join(UPLOADS_DIR, 'justificatifs')
fs.mkdirSync(JUSTIFICATIFS_DIR, { recursive: true })

const app = express()
// On augmente la limite : les justificatifs (images/PDF) sont envoyés en
// base64 dans le corps JSON, ce qui gonfle la taille (~+33%).
app.use(express.json({ limit: '15mb' }))
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://frais-deplacement-techniciens-deplo.vercel.app',
  ],
  credentials: true,
}))
// Les fichiers téléversés sont servis en statique sous /uploads/...
app.use('/uploads', express.static(UPLOADS_DIR))
app.use((req, _res, next) => {
  if (req.body == null) req.body = {}
  next()
})

// Types de justificatifs autorisés + extension de fichier correspondante.
const JUSTIFICATIF_MIME_EXT = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'application/pdf': '.pdf',
}

// Enregistre un fichier reçu sous forme de data URL base64
// (ex: "data:image/png;base64,iVBORw0K...") dans /uploads/justificatifs.
// Retourne le chemin public à stocker en base (ex: /uploads/justificatifs/xxx.png).
function saveBase64Justificatif(dataUrl) {
  if (typeof dataUrl !== 'string') return null
  const match = /^data:([^;]+);base64,(.+)$/s.exec(dataUrl.trim())
  if (!match) {
    throw new Error('Justificatif invalide (format attendu : data URL base64)')
  }
  const mime = match[1]
  const extension = JUSTIFICATIF_MIME_EXT[mime]
  if (!extension) {
    throw new Error('Type de justificatif non autorisé (images ou PDF uniquement)')
  }
  const buffer = Buffer.from(match[2], 'base64')
  // Garde-fou taille : 5 Mo max après décodage.
  if (buffer.length > 5 * 1024 * 1024) {
    throw new Error('Justificatif trop volumineux (5 Mo maximum)')
  }
  const fileName = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${extension}`
  fs.writeFileSync(path.join(JUSTIFICATIFS_DIR, fileName), buffer)
  return `/uploads/justificatifs/${fileName}`
}

// Génère un mot de passe temporaire lisible (utilisé lors d'une réinitialisation).
function generateTemporaryPassword() {
  return `Temp-${crypto.randomBytes(4).toString('hex')}`
}

const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false,
      },
    })
  : new Pool({
      user: process.env.DB_USER || 'postgres',
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'gestion_frais',
      password: process.env.DB_PASSWORD || '',
      port: Number(process.env.DB_PORT) || 5432,
    })

const AUTH_TABLE_CANDIDATES = ['users', 'techniciens']
const LOGIN_COLUMN_CANDIDATES = ['email', 'mail', 'adresse_email', 'username', 'login']
const PASSWORD_COLUMN_CANDIDATES = ['mot_de_passe', 'password', 'mdp']
const ROLE_TECHNICIEN = 'TECHNICIEN'
const ROLE_GESTIONNAIRE = 'GESTIONNAIRE'
const EXPENSE_STATUS_PENDING = 'EN_ATTENTE'
const EXPENSE_STATUS_VALIDATED = 'VALIDEE'
const EXPENSE_STATUS_PAID = 'PAYEE'

let authConfig = null

function looksLikeBcryptHash(value) {
  return typeof value === 'string' && /^\$2[aby]\$\d{2}\$/.test(value)
}

async function verifyPassword(plainPassword, storedPassword) {
  if (typeof storedPassword !== 'string') return false
  if (looksLikeBcryptHash(storedPassword)) {
    return bcrypt.compare(plainPassword, storedPassword)
  }
  return plainPassword === storedPassword
}

function normalizeRole(value) {
  return typeof value === 'string' ? value.trim().toUpperCase() : ''
}

function quoteIdent(identifier) {
  return `"${String(identifier).replace(/"/g, '""')}"`
}

function parseInteger(value) {
  const number = Number.parseInt(String(value), 10)
  return Number.isFinite(number) ? number : null
}

function formatDate(value) {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

function formatExpenseRow(row) {
  return {
    id: row.id,
    interventionId: row.intervention_id,
    typeFrais: row.type_frais,
    montant: Number(row.montant),
    devise: row.devise || 'MAD',
    dateFrais: row.date_frais,
    description: row.description || '',
    statutValidation: row.statut_validation || EXPENSE_STATUS_PENDING,
    mission: row.mission || row.titre || '',
    technicien: row.technicien || '',
    technicianId: row.technicien_id,
    justificatifUrl: row.justificatif_url || null,
    justificatifNom: row.justificatif_nom || null,
    createdAt: formatDate(row.created_at),
    decision: row.decision || null,
    validatedAt: formatDate(row.date_decision),
  }
}

function formatMaterialRow(row) {
  return {
    id: row.id,
    reference: row.reference || null,
    nom: row.nom,
    description: row.description || '',
    categorie: row.categorie || null,
    quantiteStock: row.quantite_stock !== null && row.quantite_stock !== undefined ? Number(row.quantite_stock) : 0,
    unite: row.unite || 'unité',
    prixUnitaire: row.prix_unitaire !== null && row.prix_unitaire !== undefined ? Number(row.prix_unitaire) : null,
    actif: row.actif === true,
    createdAt: formatDate(row.created_at),
    updatedAt: formatDate(row.updated_at),
  }
}

function formatInterventionRow(row) {
  return {
    id: row.id,
    technicienId: row.technicien_id,
    titre: row.titre,
    description: row.description || '',
    lieuDepart: row.lieu_depart,
    lieuArrivee: row.lieu_arrivee,
    dateDepart: formatDate(row.date_depart),
    dateRetour: formatDate(row.date_retour),
    // Alias "début / fin" : représentent le même chose que dateDepart / dateRetour
    // mais collent au vocabulaire "intervention sur plusieurs jours".
    dateDebut: formatDate(row.date_depart),
    dateFin: formatDate(row.date_retour),
    distanceKm: row.distance_km !== null && row.distance_km !== undefined ? Number(row.distance_km) : null,
    statut: row.statut || null,
    createdAt: formatDate(row.created_at),
  }
}

function formatPlanningInterventionRow(row) {
  // Use users.id (technicien_user_id) when available so the planning board
  // can match against the technician list (which also uses users.id).
  const userId = row.technicien_user_id || row.technicien_id
  return {
    ...formatInterventionRow(row),
    technicienId: userId,
    technicien: row.technicien_nom
      ? {
          id: userId,
          nom: row.technicien_nom,
          prenom: row.technicien_prenom || null,
          email: row.technicien_email || null,
        }
      : null,
  }
}

function parseActiveFilter(value) {
  if (value === undefined || value === null || value === '') return null
  const normalized = String(value).trim().toLowerCase()
  if (['true', '1', 'actif', 'active', 'oui', 'yes'].includes(normalized)) return true
  if (['false', '0', 'inactif', 'inactive', 'non', 'no'].includes(normalized)) return false
  return null
}

function parseRoleFilter(value) {
  const normalized = normalizeRole(value)
  if (normalized === ROLE_TECHNICIEN || normalized === ROLE_GESTIONNAIRE) {
    return normalized
  }
  return null
}

function formatUserRow(row) {
  return {
    id: row.id,
    nom: row.nom,
    prenom: row.prenom,
    email: row.email,
    role: normalizeRole(row.role),
    actif: row.actif === true,
    statut: row.actif === true ? 'actif' : 'inactif',
    telephone: row.telephone || null,
    matricule: row.matricule || null,
    service: row.service || null,
    ville: row.ville || null,
    departement: row.departement || null,
    technicienId: row.technicien_id || null,
    gestionnaireId: row.gestionnaire_id || null,
    createdAt: formatDate(row.created_at),
  }
}

function formatTechnicianRow(row) {
  return {
    id: row.technicien_id,
    userId: row.user_id,
    nom: row.nom,
    prenom: row.prenom,
    email: row.email,
    role: normalizeRole(row.role),
    actif: row.actif === true,
    statut: row.actif === true ? 'actif' : 'inactif',
    matricule: row.matricule || null,
    telephone: row.telephone || null,
    service: row.service || null,
    ville: row.ville || null,
    createdAt: formatDate(row.created_at),
  }
}

function formatManagerRow(row) {
  return {
    id: row.gestionnaire_id,
    userId: row.user_id,
    nom: row.nom,
    prenom: row.prenom,
    email: row.email,
    role: normalizeRole(row.role),
    actif: row.actif === true,
    statut: row.actif === true ? 'actif' : 'inactif',
    departement: row.departement || null,
    createdAt: formatDate(row.created_at),
  }
}

function formatProjectRow(row) {
  return {
    id: row.id,
    nom: row.nom,
    client: row.client,
    localisation: row.localisation,
    description: row.description || '',
    statut: row.statut,
    creePar: row.cree_par || null,
    creeParNom: row.cree_par_nom || null,
    createdAt: formatDate(row.created_at),
  }
}

function normalizeReportStatus(value) {
  const normalized = typeof value === 'string' ? value.trim().toUpperCase() : ''
  if (normalized === 'VALIDE' || normalized === 'VALIDATED') return 'VALIDE'
  if (normalized === 'REJETE' || normalized === 'REJECTED') return 'REJETE'
  return 'EN_ATTENTE'
}

function parseJsonField(value, fallback) {
  if (value === undefined || value === null || value === '') {
    return fallback
  }

  if (typeof value === 'object') {
    return value
  }

  if (typeof value === 'string') {
    try {
      return JSON.parse(value)
    } catch {
      return fallback
    }
  }

  return fallback
}

function formatReportRow(row) {
  return {
    id: row.id,
    interventionId: row.intervention_id,
    technicienId: row.technicien_id,
    date: formatDate(row.date),
    presenceConfirmee: Boolean(row.presence_confirmee),
    gpsLatitude: row.gps_latitude !== null && row.gps_latitude !== undefined ? Number(row.gps_latitude) : null,
    gpsLongitude: row.gps_longitude !== null && row.gps_longitude !== undefined ? Number(row.gps_longitude) : null,
    gpsAdresse: row.gps_adresse || null,
    materielUtilise: parseJsonField(row.materiel_utilise, []),
    etapes: parseJsonField(row.etapes, {}),
    tempsPasse: row.temps_passe || null,
    notes: row.notes || null,
    photoUrl: row.photo_url || null,
    statut: normalizeReportStatus(row.statut),
    validatePar: row.validate_par || null,
    dateValidation: formatDate(row.date_validation),
    commentaireValidation: row.commentaire_validation || null,
    createdAt: formatDate(row.created_at),
    intervention: row.intervention_titre
      ? {
          id: row.intervention_id,
          titre: row.intervention_titre,
          description: row.intervention_description || '',
          lieuDepart: row.lieu_depart || null,
          lieuArrivee: row.lieu_arrivee || null,
          dateDepart: formatDate(row.date_depart),
          statut: row.intervention_statut || null,
        }
      : null,
    technicien: row.technicien_nom
      ? {
          id: row.technicien_id,
          nom: row.technicien_nom,
          prenom: row.technicien_prenom || null,
          email: row.technicien_email || null,
        }
      : null,
    validateParUser: row.validate_nom
      ? {
          id: row.validate_par,
          nom: row.validate_nom,
          prenom: row.validate_prenom || null,
          email: row.validate_email || null,
        }
      : null,
  }
}

function parseReportDecision(value) {
  const normalized = typeof value === 'string' ? value.trim().toUpperCase() : ''
  if (normalized === 'VALIDE' || normalized === 'VALIDATED') return 'VALIDE'
  if (normalized === 'REJETE' || normalized === 'REJECTED') return 'REJETE'
  return null
}

async function runTransaction(work) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const result = await work(client)
    await client.query('COMMIT')
    return result
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

async function fetchUserDetailsById(userId) {
  const result = await pool.query(
    `
      SELECT
        u.id,
        u.nom,
        u.prenom,
        u.email,
        u.role,
        u.actif,
        u.created_at,
        t.id AS technicien_id,
        t.matricule,
        t.telephone,
        t.service,
        t.ville,
        g.id AS gestionnaire_id,
        g.departement
      FROM users u
      LEFT JOIN techniciens t ON t.user_id = u.id
      LEFT JOIN gestionnaires g ON g.user_id = u.id
      WHERE u.id = $1
      LIMIT 1
    `,
    [userId],
  )

  return result.rows[0] || null
}

async function fetchTechnicianDetailsByTechnicianId(technicianId) {
  const result = await pool.query(
    `
      SELECT
        t.id AS technicien_id,
        t.user_id,
        u.nom,
        u.prenom,
        u.email,
        u.role,
        u.actif,
        u.created_at,
        t.matricule,
        t.telephone,
        t.service,
        t.ville
      FROM techniciens t
      JOIN users u ON u.id = t.user_id
      WHERE t.id = $1
      LIMIT 1
    `,
    [technicianId],
  )

  return result.rows[0] || null
}

async function fetchManagerDetailsByManagerId(managerId) {
  const result = await pool.query(
    `
      SELECT
        g.id AS gestionnaire_id,
        g.user_id,
        u.nom,
        u.prenom,
        u.email,
        u.role,
        u.actif,
        u.created_at,
        g.departement
      FROM gestionnaires g
      JOIN users u ON u.id = g.user_id
      WHERE g.id = $1
      LIMIT 1
    `,
    [managerId],
  )

  return result.rows[0] || null
}

async function syncTechnicianProfile(client, userId, payload) {
  await client.query('DELETE FROM gestionnaires WHERE user_id = $1', [userId])
  const existing = await client.query('SELECT id FROM techniciens WHERE user_id = $1 LIMIT 1', [userId])
  const matricule = typeof payload.matricule === 'string' && payload.matricule.trim()
    ? payload.matricule.trim()
    : `TECH-${String(userId).padStart(4, '0')}`
  const values = [
    matricule,
    payload.telephone || null,
    payload.service || null,
    payload.ville || null,
    userId,
  ]

  if (existing.rows[0]) {
    await client.query(
      `
        UPDATE techniciens
        SET matricule = $1, telephone = $2, service = $3, ville = $4
        WHERE user_id = $5
      `,
      values,
    )
    return existing.rows[0].id
  }

  const created = await client.query(
    `
      INSERT INTO techniciens (matricule, telephone, service, ville, user_id)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `,
    values,
  )
  return created.rows[0].id
}

async function syncManagerProfile(client, userId, payload) {
  await client.query('DELETE FROM techniciens WHERE user_id = $1', [userId])
  const existing = await client.query('SELECT id FROM gestionnaires WHERE user_id = $1 LIMIT 1', [userId])
  const values = [payload.departement || null, userId]

  if (existing.rows[0]) {
    await client.query(
      `
        UPDATE gestionnaires
        SET departement = $1
        WHERE user_id = $2
      `,
      values,
    )
    return existing.rows[0].id
  }

  const created = await client.query(
    `
      INSERT INTO gestionnaires (departement, user_id)
      VALUES ($1, $2)
      RETURNING id
    `,
    values,
  )
  return created.rows[0].id
}


async function resolveAuthConfig() {
  for (const tableName of AUTH_TABLE_CANDIDATES) {
    const columnsResult = await pool.query(
      "SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1",
      [tableName],
    )

    if (!columnsResult.rows.length) continue

    const availableColumns = new Set(columnsResult.rows.map((row) => row.column_name))
    const loginColumn = LOGIN_COLUMN_CANDIDATES.find((col) => availableColumns.has(col))
    const passwordColumn = PASSWORD_COLUMN_CANDIDATES.find((col) => availableColumns.has(col))

    if (loginColumn && passwordColumn) {
      return { tableName, loginColumn, passwordColumn }
    }
  }

  return null
}

async function ensureAuthConfig() {
  if (!authConfig) {
    authConfig = await resolveAuthConfig()
  }
  return authConfig
}

async function fetchUserById(userId) {
  const result = await pool.query(
    'SELECT id, nom, prenom, email, role, actif, created_at FROM users WHERE id = $1 LIMIT 1',
    [userId],
  )
  return result.rows[0] || null
}

async function fetchTechnicianContext(userId) {
  const result = await pool.query(
    `
      SELECT t.id AS technician_id, t.user_id, t.matricule, t.telephone, t.service, t.ville
      FROM techniciens t
      WHERE t.user_id = $1
      LIMIT 1
    `,
    [userId],
  )
  return result.rows[0] || null
}

async function fetchManagerContext(userId) {
  const result = await pool.query(
    `
      SELECT g.id AS manager_id, g.user_id, g.departement
      FROM gestionnaires g
      WHERE g.user_id = $1
      LIMIT 1
    `,
    [userId],
  )
  return result.rows[0] || null
}

async function authFromRequest(req) {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) {
    throw new Error('Token manquant')
  }

  const token = header.slice('Bearer '.length)
  const jwtSecret = process.env.JWT_SECRET || 'dev_secret_change_me'
  const payload = jwt.verify(token, jwtSecret)

  if (typeof payload !== 'object' || payload === null) {
    throw new Error('Token invalide')
  }

  const user = await fetchUserById(payload.id)
  if (!user) {
    throw new Error('Utilisateur introuvable')
  }

  return {
    user,
    role: normalizeRole(payload.role || user.role),
  }
}

function requireRole(role) {
  return async (req, res, next) => {
    try {
      const auth = await authFromRequest(req)
      if (role && auth.role !== role) {
        return res.status(403).json({ error: 'Acces refuse pour ce role' })
      }

      req.auth = auth
      next()
    } catch (error) {
      return res.status(401).json({ error: error.message || 'Non autorise' })
    }
  }
}

async function getManagerOrFail(userId) {
  const manager = await fetchManagerContext(userId)
  if (!manager) {
    throw new Error('Profil gestionnaire introuvable')
  }
  return manager
}

async function getTechnicianOrFail(userId) {
  const technician = await fetchTechnicianContext(userId)
  if (!technician) {
    throw new Error('Profil technicien introuvable')
  }
  return technician
}

async function handleLogin(req, res, expectedRole) {
  const emailRaw = req.body?.email
  const email =
    emailRaw == null || emailRaw === '' ? '' : String(emailRaw).trim()
  const mot_de_passe =
    typeof req.body?.password === 'string'
      ? req.body.password
      : typeof req.body?.mot_de_passe === 'string'
        ? req.body.mot_de_passe
        : req.body?.password != null
          ? String(req.body.password)
          : req.body?.mot_de_passe != null
            ? String(req.body.mot_de_passe)
            : ''

  if (!email || !mot_de_passe) {
    return res.status(400).json({ message: 'Champs requis manquants' })
  }

  try {
    const config = await ensureAuthConfig()
    if (!config) {
      return res.status(500).json({
        error: 'Configuration login introuvable dans la base (table/colonnes).',
      })
    }

    const loginQuery = `SELECT * FROM ${quoteIdent(config.tableName)} WHERE ${quoteIdent(config.loginColumn)} = $1 LIMIT 1`
    const result = await pool.query(loginQuery, [email])

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Utilisateur non trouvé' })
    }

    const user = result.rows[0]
    const storedPassword = user[config.passwordColumn]
    const userRole = normalizeRole(user.role)
    const valid = await verifyPassword(mot_de_passe, storedPassword)

    if (!valid) {
      return res.status(401).json({ message: 'Mot de passe incorrect' })
    }

    if (expectedRole && userRole !== expectedRole) {
      return res.status(403).json({ message: 'Acces refuse pour ce role' })
    }

    const jwtSecret = process.env.JWT_SECRET || 'dev_secret_change_me'
    const token = jwt.sign({ id: user.id, role: userRole || null }, jwtSecret, {
      expiresIn: '12h',
    })

    return res.json({
      message: 'Connexion reussie',
      token,
      role: userRole || null,
    })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}

app.post('/login', async (req, res) => handleLogin(req, res, null))
app.post('/login/technicien', async (req, res) => handleLogin(req, res, ROLE_TECHNICIEN))
app.post('/login/gestionnaire', async (req, res) => handleLogin(req, res, ROLE_GESTIONNAIRE))

app.get('/test-db', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW() AS now')
    return res.json(result.rows[0])
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
})

app.get('/api/users', requireRole(ROLE_GESTIONNAIRE), async (req, res) => {
  try {
    const filters = []
    const params = []

    const role = parseRoleFilter(req.query.role)
    if (role) {
      params.push(role)
      filters.push(`u.role = $${params.length}`)
    }

    const actif = parseActiveFilter(req.query.actif ?? req.query.statut)
    if (actif !== null) {
      params.push(actif)
      filters.push(`u.actif = $${params.length}`)
    }

    const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : ''

    const result = await pool.query(
      `
        SELECT
          u.id,
          u.nom,
          u.prenom,
          u.email,
          u.role,
          u.actif,
          u.created_at,
          t.id AS technicien_id,
          t.matricule,
          t.telephone,
          t.service,
          t.ville,
          g.id AS gestionnaire_id,
          g.departement
        FROM users u
        LEFT JOIN techniciens t ON t.user_id = u.id
        LEFT JOIN gestionnaires g ON g.user_id = u.id
        ${whereClause}
        ORDER BY u.created_at DESC, u.id DESC
      `,
      params,
    )

    return res.json({
      success: true,
      count: result.rows.length,
      users: result.rows.map(formatUserRow),
    })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
})

app.get('/api/users/:id', requireRole(ROLE_GESTIONNAIRE), async (req, res) => {
  try {
    const userId = parseInteger(req.params.id)
    if (!userId) {
      return res.status(400).json({ error: 'Identifiant invalide' })
    }

    const user = await fetchUserDetailsById(userId)
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur introuvable' })
    }

    return res.json({ success: true, user: formatUserRow(user) })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
})

app.post('/api/users', requireRole(ROLE_GESTIONNAIRE), async (req, res) => {
  try {
    const nom = typeof req.body.nom === 'string' ? req.body.nom.trim() : ''
    const prenom = typeof req.body.prenom === 'string' ? req.body.prenom.trim() : null
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : ''
    const password = typeof req.body.password === 'string' ? req.body.password : typeof req.body.mot_de_passe === 'string' ? req.body.mot_de_passe : ''
    const role = parseRoleFilter(req.body.role) || ROLE_TECHNICIEN
    const actif = req.body.actif === undefined ? true : Boolean(req.body.actif)

    if (!nom || !email || !password) {
      return res.status(400).json({ error: 'nom, email et password sont obligatoires' })
    }

    const existing = await pool.query('SELECT id FROM users WHERE email = $1 LIMIT 1', [email])
    if (existing.rows.length) {
      return res.status(409).json({ error: 'Cet email existe déjà' })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const createdUser = await runTransaction(async (client) => {
      const userInsert = await client.query(
        `
          INSERT INTO users (nom, prenom, email, mot_de_passe, role, actif)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING id
        `,
        [nom, prenom, email, hashedPassword, role, actif],
      )

      const userId = userInsert.rows[0].id

      if (role === ROLE_TECHNICIEN) {
        await syncTechnicianProfile(client, userId, {
          matricule: req.body.matricule,
          telephone: req.body.telephone,
          service: req.body.service,
          ville: req.body.ville,
        })
      } else if (role === ROLE_GESTIONNAIRE) {
        await syncManagerProfile(client, userId, {
          departement: req.body.departement,
        })
      }

      const user = await client.query('SELECT id FROM users WHERE id = $1', [userId])
      return user.rows[0]
    })

    const user = await fetchUserDetailsById(createdUser.id)
    return res.status(201).json({ success: true, user: formatUserRow(user) })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
})

app.put('/api/users/:id', requireRole(ROLE_GESTIONNAIRE), async (req, res) => {
  try {
    const userId = parseInteger(req.params.id)
    if (!userId) {
      return res.status(400).json({ error: 'Identifiant invalide' })
    }

    const existingUser = await fetchUserDetailsById(userId)
    if (!existingUser) {
      return res.status(404).json({ error: 'Utilisateur introuvable' })
    }

    const nom = typeof req.body.nom === 'string' ? req.body.nom.trim() : existingUser.nom
    const prenom = typeof req.body.prenom === 'string' ? req.body.prenom.trim() : existingUser.prenom
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : existingUser.email
    const role = parseRoleFilter(req.body.role) || normalizeRole(existingUser.role)
    const actif = req.body.actif === undefined ? Boolean(existingUser.actif) : Boolean(req.body.actif)
    const password = typeof req.body.password === 'string' ? req.body.password : typeof req.body.mot_de_passe === 'string' ? req.body.mot_de_passe : ''

    // RÈGLE MÉTIER : le gestionnaire n'a PAS le droit de changer le mot de passe
    // d'un technicien. Il peut seulement déclencher une réinitialisation via
    // POST /api/users/:id/reset-password. On bloque donc toute tentative ici.
    if (password && normalizeRole(existingUser.role) === ROLE_TECHNICIEN) {
      return res.status(403).json({
        error: "Le gestionnaire ne peut pas changer le mot de passe d'un technicien. Utilisez la réinitialisation.",
      })
    }

    const duplicateEmail = await pool.query('SELECT id FROM users WHERE email = $1 AND id <> $2 LIMIT 1', [email, userId])
    if (duplicateEmail.rows.length) {
      return res.status(409).json({ error: 'Cet email existe déjà' })
    }

    const hashedPassword = password ? await bcrypt.hash(password, 10) : null

    await runTransaction(async (client) => {
      const values = [nom, prenom, email, role, actif, userId]
      let updateQuery = `
        UPDATE users
        SET nom = $1, prenom = $2, email = $3, role = $4, actif = $5
      `
      if (hashedPassword) {
        updateQuery += ', mot_de_passe = $6 WHERE id = $7'
        values.push(hashedPassword, userId)
      } else {
        updateQuery += ' WHERE id = $6'
      }

      await client.query(updateQuery, values)

      if (role === ROLE_TECHNICIEN) {
        await syncTechnicianProfile(client, userId, {
          matricule: req.body.matricule ?? existingUser.matricule,
          telephone: req.body.telephone ?? existingUser.telephone,
          service: req.body.service ?? existingUser.service,
          ville: req.body.ville ?? existingUser.ville,
        })
      } else if (role === ROLE_GESTIONNAIRE) {
        await syncManagerProfile(client, userId, {
          departement: req.body.departement ?? existingUser.departement,
        })
      }
    })

    const user = await fetchUserDetailsById(userId)
    return res.json({ success: true, user: formatUserRow(user) })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
})

app.delete('/api/users/:id', requireRole(ROLE_GESTIONNAIRE), async (req, res) => {
  try {
    const userId = parseInteger(req.params.id)
    if (!userId) {
      return res.status(400).json({ error: 'Identifiant invalide' })
    }

    const result = await pool.query(
      'UPDATE users SET actif = false WHERE id = $1 RETURNING id',
      [userId],
    )

    if (!result.rows.length) {
      return res.status(404).json({ error: 'Utilisateur introuvable' })
    }

    return res.json({ success: true, message: 'Utilisateur désactivé' })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
})

// RÉINITIALISATION du mot de passe par le gestionnaire.
// Le gestionnaire ne CHOISIT pas le mot de passe : on en génère un temporaire,
// on le stocke (haché) et on le renvoie UNE SEULE FOIS pour qu'il le transmette
// au technicien, qui pourra ensuite le changer lui-même.
app.post('/api/users/:id/reset-password', requireRole(ROLE_GESTIONNAIRE), async (req, res) => {
  try {
    const userId = parseInteger(req.params.id)
    if (!userId) {
      return res.status(400).json({ error: 'Identifiant invalide' })
    }

    const existingUser = await fetchUserById(userId)
    if (!existingUser) {
      return res.status(404).json({ error: 'Utilisateur introuvable' })
    }

    const temporaryPassword = generateTemporaryPassword()
    const hashedPassword = await bcrypt.hash(temporaryPassword, 10)

    await pool.query('UPDATE users SET mot_de_passe = $1 WHERE id = $2', [hashedPassword, userId])

    return res.json({
      success: true,
      message: 'Mot de passe réinitialisé',
      temporaryPassword, // renvoyé une seule fois, non stocké en clair
    })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
})

app.get('/api/techniciens', requireRole(ROLE_GESTIONNAIRE), async (req, res) => {
  try {
    const result = await pool.query(
      `
        SELECT
          t.id AS technicien_id,
          t.user_id,
          u.nom,
          u.prenom,
          u.email,
          u.role,
          u.actif,
          u.created_at,
          t.matricule,
          t.telephone,
          t.service,
          t.ville
        FROM techniciens t
        JOIN users u ON u.id = t.user_id
        ORDER BY u.created_at DESC, t.id DESC
      `,
    )

    return res.json({
      success: true,
      count: result.rows.length,
      techniciens: result.rows.map(formatTechnicianRow),
    })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
})

app.get('/api/techniciens/:id', requireRole(ROLE_GESTIONNAIRE), async (req, res) => {
  try {
    const technicienId = parseInteger(req.params.id)
    if (!technicienId) {
      return res.status(400).json({ error: 'Identifiant invalide' })
    }

    const technician = await fetchTechnicianDetailsByTechnicianId(technicienId)
    if (!technician) {
      return res.status(404).json({ error: 'Technicien introuvable' })
    }

    return res.json({ success: true, technicien: formatTechnicianRow(technician) })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
})

app.post('/api/techniciens', requireRole(ROLE_GESTIONNAIRE), async (req, res) => {
  try {
    const nom = typeof req.body.nom === 'string' ? req.body.nom.trim() : ''
    const prenom = typeof req.body.prenom === 'string' ? req.body.prenom.trim() : null
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : ''
    const password = typeof req.body.password === 'string' ? req.body.password : typeof req.body.mot_de_passe === 'string' ? req.body.mot_de_passe : ''
    const actif = req.body.actif === undefined ? true : Boolean(req.body.actif)

    if (!nom || !email || !password) {
      return res.status(400).json({ error: 'nom, email et password sont obligatoires' })
    }

    const existing = await pool.query('SELECT id FROM users WHERE email = $1 LIMIT 1', [email])
    if (existing.rows.length) {
      return res.status(409).json({ error: 'Cet email existe déjà' })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const created = await runTransaction(async (client) => {
      const userInsert = await client.query(
        `
          INSERT INTO users (nom, prenom, email, mot_de_passe, role, actif)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING id
        `,
        [nom, prenom, email, hashedPassword, ROLE_TECHNICIEN, actif],
      )

      const userId = userInsert.rows[0].id
      await syncTechnicianProfile(client, userId, {
        matricule: req.body.matricule,
        telephone: req.body.telephone,
        service: req.body.service,
        ville: req.body.ville,
      })

      return userId
    })

    const technician = await fetchUserDetailsById(created)
    return res.status(201).json({ success: true, user: formatUserRow(technician) })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
})

app.put('/api/techniciens/:id', requireRole(ROLE_GESTIONNAIRE), async (req, res) => {
  try {
    const technicienId = parseInteger(req.params.id)
    if (!technicienId) {
      return res.status(400).json({ error: 'Identifiant invalide' })
    }

    const current = await fetchTechnicianDetailsByTechnicianId(technicienId)
    if (!current) {
      return res.status(404).json({ error: 'Technicien introuvable' })
    }

    const userId = current.user_id
    const nom = typeof req.body.nom === 'string' ? req.body.nom.trim() : current.nom
    const prenom = typeof req.body.prenom === 'string' ? req.body.prenom.trim() : current.prenom
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : current.email
    const actif = req.body.actif === undefined ? Boolean(current.actif) : Boolean(req.body.actif)
    const password = typeof req.body.password === 'string' ? req.body.password : typeof req.body.mot_de_passe === 'string' ? req.body.mot_de_passe : ''

    const duplicateEmail = await pool.query('SELECT id FROM users WHERE email = $1 AND id <> $2 LIMIT 1', [email, userId])
    if (duplicateEmail.rows.length) {
      return res.status(409).json({ error: 'Cet email existe déjà' })
    }

    const hashedPassword = password ? await bcrypt.hash(password, 10) : null

    await runTransaction(async (client) => {
      const values = [nom, prenom, email, actif, userId]
      let updateQuery = `
        UPDATE users
        SET nom = $1, prenom = $2, email = $3, actif = $4
      `
      if (hashedPassword) {
        updateQuery += ', mot_de_passe = $5 WHERE id = $6'
        values.push(hashedPassword, userId)
      } else {
        updateQuery += ' WHERE id = $5'
      }

      await client.query(updateQuery, values)

      await syncTechnicianProfile(client, userId, {
        matricule: req.body.matricule ?? current.matricule,
        telephone: req.body.telephone ?? current.telephone,
        service: req.body.service ?? current.service,
        ville: req.body.ville ?? current.ville,
      })
    })

    const technician = await fetchTechnicianDetailsByTechnicianId(technicienId)
    return res.json({ success: true, technicien: formatTechnicianRow(technician) })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
})

app.delete('/api/techniciens/:id', requireRole(ROLE_GESTIONNAIRE), async (req, res) => {
  try {
    const technicienId = parseInteger(req.params.id)
    if (!technicienId) {
      return res.status(400).json({ error: 'Identifiant invalide' })
    }

    const technician = await fetchTechnicianDetailsByTechnicianId(technicienId)
    if (!technician) {
      return res.status(404).json({ error: 'Technicien introuvable' })
    }

    await pool.query('UPDATE users SET actif = false WHERE id = $1', [technician.user_id])
    return res.json({ success: true, message: 'Technicien désactivé' })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
})

app.get('/api/gestionnaires', requireRole(ROLE_GESTIONNAIRE), async (req, res) => {
  try {
    const result = await pool.query(
      `
        SELECT
          g.id AS gestionnaire_id,
          g.user_id,
          u.nom,
          u.prenom,
          u.email,
          u.role,
          u.actif,
          u.created_at,
          g.departement
        FROM gestionnaires g
        JOIN users u ON u.id = g.user_id
        ORDER BY u.created_at DESC, g.id DESC
      `,
    )

    return res.json({
      success: true,
      count: result.rows.length,
      gestionnaires: result.rows.map(formatManagerRow),
    })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
})

app.get('/api/gestionnaires/:id', requireRole(ROLE_GESTIONNAIRE), async (req, res) => {
  try {
    const managerId = parseInteger(req.params.id)
    if (!managerId) {
      return res.status(400).json({ error: 'Identifiant invalide' })
    }

    const manager = await fetchManagerDetailsByManagerId(managerId)
    if (!manager) {
      return res.status(404).json({ error: 'Gestionnaire introuvable' })
    }

    return res.json({ success: true, gestionnaire: formatManagerRow(manager) })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
})

app.post('/api/gestionnaires', requireRole(ROLE_GESTIONNAIRE), async (req, res) => {
  try {
    const nom = typeof req.body.nom === 'string' ? req.body.nom.trim() : ''
    const prenom = typeof req.body.prenom === 'string' ? req.body.prenom.trim() : null
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : ''
    const password = typeof req.body.password === 'string' ? req.body.password : typeof req.body.mot_de_passe === 'string' ? req.body.mot_de_passe : ''
    const actif = req.body.actif === undefined ? true : Boolean(req.body.actif)

    if (!nom || !email || !password) {
      return res.status(400).json({ error: 'nom, email et password sont obligatoires' })
    }

    const existing = await pool.query('SELECT id FROM users WHERE email = $1 LIMIT 1', [email])
    if (existing.rows.length) {
      return res.status(409).json({ error: 'Cet email existe déjà' })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const created = await runTransaction(async (client) => {
      const userInsert = await client.query(
        `
          INSERT INTO users (nom, prenom, email, mot_de_passe, role, actif)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING id
        `,
        [nom, prenom, email, hashedPassword, ROLE_GESTIONNAIRE, actif],
      )

      const userId = userInsert.rows[0].id
      await syncManagerProfile(client, userId, {
        departement: req.body.departement,
      })

      return userId
    })

    const manager = await fetchUserDetailsById(created)
    return res.status(201).json({ success: true, user: formatUserRow(manager) })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
})

app.put('/api/gestionnaires/:id', requireRole(ROLE_GESTIONNAIRE), async (req, res) => {
  try {
    const managerId = parseInteger(req.params.id)
    if (!managerId) {
      return res.status(400).json({ error: 'Identifiant invalide' })
    }

    const current = await fetchManagerDetailsByManagerId(managerId)
    if (!current) {
      return res.status(404).json({ error: 'Gestionnaire introuvable' })
    }

    const userId = current.user_id
    const nom = typeof req.body.nom === 'string' ? req.body.nom.trim() : current.nom
    const prenom = typeof req.body.prenom === 'string' ? req.body.prenom.trim() : current.prenom
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : current.email
    const actif = req.body.actif === undefined ? Boolean(current.actif) : Boolean(req.body.actif)
    const password = typeof req.body.password === 'string' ? req.body.password : typeof req.body.mot_de_passe === 'string' ? req.body.mot_de_passe : ''

    const duplicateEmail = await pool.query('SELECT id FROM users WHERE email = $1 AND id <> $2 LIMIT 1', [email, userId])
    if (duplicateEmail.rows.length) {
      return res.status(409).json({ error: 'Cet email existe déjà' })
    }

    const hashedPassword = password ? await bcrypt.hash(password, 10) : null

    await runTransaction(async (client) => {
      const values = [nom, prenom, email, actif, userId]
      let updateQuery = `
        UPDATE users
        SET nom = $1, prenom = $2, email = $3, actif = $4
      `
      if (hashedPassword) {
        updateQuery += ', mot_de_passe = $5 WHERE id = $6'
        values.push(hashedPassword, userId)
      } else {
        updateQuery += ' WHERE id = $5'
      }

      await client.query(updateQuery, values)

      await syncManagerProfile(client, userId, {
        departement: req.body.departement ?? current.departement,
      })
    })

    const manager = await fetchManagerDetailsByManagerId(managerId)
    return res.json({ success: true, gestionnaire: formatManagerRow(manager) })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
})

app.delete('/api/gestionnaires/:id', requireRole(ROLE_GESTIONNAIRE), async (req, res) => {
  try {
    const managerId = parseInteger(req.params.id)
    if (!managerId) {
      return res.status(400).json({ error: 'Identifiant invalide' })
    }

    const manager = await fetchManagerDetailsByManagerId(managerId)
    if (!manager) {
      return res.status(404).json({ error: 'Gestionnaire introuvable' })
    }

    await pool.query('UPDATE users SET actif = false WHERE id = $1', [manager.user_id])
    return res.json({ success: true, message: 'Gestionnaire désactivé' })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
})

app.get('/api/projets', requireRole(null), async (req, res) => {
  try {
    const filters = []
    const params = []
    const statut = typeof req.query.statut === 'string' ? req.query.statut.trim() : ''
    if (statut) {
      params.push(statut)
      filters.push(`p.statut = $${params.length}`)
    }

    const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : ''

    const result = await pool.query(
      `
        SELECT
          p.id,
          p.nom,
          p.client,
          p.localisation,
          p.description,
          p.statut,
          p.cree_par,
          p.created_at,
          CONCAT(u.nom, ' ', u.prenom) AS cree_par_nom
        FROM projets p
        LEFT JOIN users u ON u.id = p.cree_par
        ${whereClause}
        ORDER BY p.created_at DESC, p.id DESC
      `,
      params,
    )

    return res.json({
      success: true,
      count: result.rows.length,
      projets: result.rows.map(formatProjectRow),
    })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
})

app.get('/api/projets/:id', requireRole(null), async (req, res) => {
  try {
    const projetId = parseInteger(req.params.id)
    if (!projetId) {
      return res.status(400).json({ error: 'Identifiant invalide' })
    }

    const result = await pool.query(
      `
        SELECT
          p.id,
          p.nom,
          p.client,
          p.localisation,
          p.description,
          p.statut,
          p.cree_par,
          p.created_at,
          CONCAT(u.nom, ' ', u.prenom) AS cree_par_nom
        FROM projets p
        LEFT JOIN users u ON u.id = p.cree_par
        WHERE p.id = $1
        LIMIT 1
      `,
      [projetId],
    )

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Projet introuvable' })
    }

    return res.json({ success: true, projet: formatProjectRow(result.rows[0]) })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
})

app.post('/api/projets', requireRole(ROLE_GESTIONNAIRE), async (req, res) => {
  try {
    const nom = typeof req.body.nom === 'string' ? req.body.nom.trim() : ''
    const client = typeof req.body.client === 'string' ? req.body.client.trim() : ''
    const localisation = typeof req.body.localisation === 'string' ? req.body.localisation.trim() : ''
    const description = typeof req.body.description === 'string' ? req.body.description.trim() : null
    const statut = typeof req.body.statut === 'string' ? req.body.statut.trim() : 'planifie'

    if (!nom || !client || !localisation) {
      return res.status(400).json({ error: 'nom, client et localisation sont obligatoires' })
    }

    const created = await pool.query(
      `
        INSERT INTO projets (nom, client, localisation, description, statut, cree_par)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
      `,
      [nom, client, localisation, description, statut, req.auth.user.id],
    )

    const result = await pool.query(
      `
        SELECT
          p.id,
          p.nom,
          p.client,
          p.localisation,
          p.description,
          p.statut,
          p.cree_par,
          p.created_at,
          CONCAT(u.nom, ' ', u.prenom) AS cree_par_nom
        FROM projets p
        LEFT JOIN users u ON u.id = p.cree_par
        WHERE p.id = $1
        LIMIT 1
      `,
      [created.rows[0].id],
    )

    return res.status(201).json({ success: true, projet: formatProjectRow(result.rows[0]) })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
})

app.put('/api/projets/:id', requireRole(ROLE_GESTIONNAIRE), async (req, res) => {
  try {
    const projetId = parseInteger(req.params.id)
    if (!projetId) {
      return res.status(400).json({ error: 'Identifiant invalide' })
    }

    const current = await pool.query('SELECT id FROM projets WHERE id = $1 LIMIT 1', [projetId])
    if (!current.rows[0]) {
      return res.status(404).json({ error: 'Projet introuvable' })
    }

    const result = await pool.query(
      `
        UPDATE projets
        SET
          nom = COALESCE($1, nom),
          client = COALESCE($2, client),
          localisation = COALESCE($3, localisation),
          description = COALESCE($4, description),
          statut = COALESCE($5, statut)
        WHERE id = $6
        RETURNING id
      `,
      [
        typeof req.body.nom === 'string' ? req.body.nom.trim() : null,
        typeof req.body.client === 'string' ? req.body.client.trim() : null,
        typeof req.body.localisation === 'string' ? req.body.localisation.trim() : null,
        typeof req.body.description === 'string' ? req.body.description.trim() : null,
        typeof req.body.statut === 'string' ? req.body.statut.trim() : null,
        projetId,
      ],
    )

    const updated = await pool.query(
      `
        SELECT
          p.id,
          p.nom,
          p.client,
          p.localisation,
          p.description,
          p.statut,
          p.cree_par,
          p.created_at,
          CONCAT(u.nom, ' ', u.prenom) AS cree_par_nom
        FROM projets p
        LEFT JOIN users u ON u.id = p.cree_par
        WHERE p.id = $1
        LIMIT 1
      `,
      [result.rows[0].id],
    )

    return res.json({ success: true, projet: formatProjectRow(updated.rows[0]) })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
})

app.delete('/api/projets/:id', requireRole(ROLE_GESTIONNAIRE), async (req, res) => {
  try {
    const projetId = parseInteger(req.params.id)
    if (!projetId) {
      return res.status(400).json({ error: 'Identifiant invalide' })
    }

    const result = await pool.query('DELETE FROM projets WHERE id = $1 RETURNING id', [projetId])
    if (!result.rows.length) {
      return res.status(404).json({ error: 'Projet introuvable' })
    }

    return res.json({ success: true, message: 'Projet supprimé' })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
})

// ============================================================================
//  BESOIN #2 : GESTION DES MATÉRIAUX (CRUD réservé au GESTIONNAIRE)
//  Toutes ces routes utilisent requireRole(ROLE_GESTIONNAIRE) : un technicien
//  qui appellerait /api/materiaux recevrait un 403.
// ============================================================================

// Liste des matériaux (avec recherche optionnelle ?search= et filtre ?actif=)
app.get('/api/materiaux', requireRole(ROLE_GESTIONNAIRE), async (req, res) => {
  try {
    const filters = []
    const params = []

    const search = typeof req.query.search === 'string' ? req.query.search.trim() : ''
    if (search) {
      params.push(`%${search}%`)
      filters.push(`(m.nom ILIKE $${params.length} OR m.reference ILIKE $${params.length} OR m.categorie ILIKE $${params.length})`)
    }

    const actif = parseActiveFilter(req.query.actif)
    if (actif !== null) {
      params.push(actif)
      filters.push(`m.actif = $${params.length}`)
    }

    const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : ''
    const result = await pool.query(
      `SELECT m.* FROM materiaux m ${whereClause} ORDER BY m.nom ASC, m.id ASC`,
      params,
    )

    return res.json({ success: true, count: result.rows.length, materiaux: result.rows.map(formatMaterialRow) })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
})

// Détail d'un matériau
app.get('/api/materiaux/:id', requireRole(ROLE_GESTIONNAIRE), async (req, res) => {
  try {
    const id = parseInteger(req.params.id)
    if (!id) return res.status(400).json({ error: 'Identifiant invalide' })

    const result = await pool.query('SELECT * FROM materiaux WHERE id = $1 LIMIT 1', [id])
    if (!result.rows[0]) return res.status(404).json({ error: 'Matériau introuvable' })

    return res.json({ success: true, materiau: formatMaterialRow(result.rows[0]) })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
})

// Créer un matériau
app.post('/api/materiaux', requireRole(ROLE_GESTIONNAIRE), async (req, res) => {
  try {
    const nom = typeof req.body.nom === 'string' ? req.body.nom.trim() : ''
    if (!nom) {
      return res.status(400).json({ error: 'Le nom du matériau est obligatoire' })
    }

    const reference = typeof req.body.reference === 'string' && req.body.reference.trim() ? req.body.reference.trim() : null
    const description = typeof req.body.description === 'string' ? req.body.description.trim() : null
    const categorie = typeof req.body.categorie === 'string' && req.body.categorie.trim() ? req.body.categorie.trim() : null
    const quantiteStock = Number.isFinite(Number(req.body.quantite_stock ?? req.body.quantiteStock))
      ? Math.trunc(Number(req.body.quantite_stock ?? req.body.quantiteStock))
      : 0
    const unite = typeof req.body.unite === 'string' && req.body.unite.trim() ? req.body.unite.trim() : 'unité'
    const prixRaw = req.body.prix_unitaire ?? req.body.prixUnitaire
    const prixUnitaire = prixRaw === undefined || prixRaw === null || prixRaw === '' ? null : Number(prixRaw)
    if (prixUnitaire !== null && !Number.isFinite(prixUnitaire)) {
      return res.status(400).json({ error: 'prix_unitaire invalide' })
    }
    const actif = req.body.actif === undefined ? true : Boolean(req.body.actif)

    if (reference) {
      const dup = await pool.query('SELECT id FROM materiaux WHERE reference = $1 LIMIT 1', [reference])
      if (dup.rows.length) return res.status(409).json({ error: 'Cette référence existe déjà' })
    }

    const result = await pool.query(
      `
        INSERT INTO materiaux (reference, nom, description, categorie, quantite_stock, unite, prix_unitaire, actif)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `,
      [reference, nom, description, categorie, quantiteStock, unite, prixUnitaire, actif],
    )

    return res.status(201).json({ success: true, materiau: formatMaterialRow(result.rows[0]) })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
})

// Modifier un matériau
app.put('/api/materiaux/:id', requireRole(ROLE_GESTIONNAIRE), async (req, res) => {
  try {
    const id = parseInteger(req.params.id)
    if (!id) return res.status(400).json({ error: 'Identifiant invalide' })

    const existing = await pool.query('SELECT * FROM materiaux WHERE id = $1 LIMIT 1', [id])
    if (!existing.rows[0]) return res.status(404).json({ error: 'Matériau introuvable' })
    const current = existing.rows[0]

    const nom = typeof req.body.nom === 'string' ? req.body.nom.trim() : current.nom
    const reference = req.body.reference === undefined
      ? current.reference
      : (typeof req.body.reference === 'string' && req.body.reference.trim() ? req.body.reference.trim() : null)
    const description = typeof req.body.description === 'string' ? req.body.description.trim() : current.description
    const categorie = typeof req.body.categorie === 'string' ? req.body.categorie.trim() : current.categorie
    const quantiteStock = (req.body.quantite_stock ?? req.body.quantiteStock) === undefined
      ? current.quantite_stock
      : Math.trunc(Number(req.body.quantite_stock ?? req.body.quantiteStock)) || 0
    const unite = typeof req.body.unite === 'string' && req.body.unite.trim() ? req.body.unite.trim() : current.unite
    const prixRaw = req.body.prix_unitaire ?? req.body.prixUnitaire
    const prixUnitaire = prixRaw === undefined
      ? current.prix_unitaire
      : (prixRaw === null || prixRaw === '' ? null : Number(prixRaw))
    if (prixUnitaire !== null && !Number.isFinite(Number(prixUnitaire))) {
      return res.status(400).json({ error: 'prix_unitaire invalide' })
    }
    const actif = req.body.actif === undefined ? current.actif : Boolean(req.body.actif)

    if (reference && reference !== current.reference) {
      const dup = await pool.query('SELECT id FROM materiaux WHERE reference = $1 AND id <> $2 LIMIT 1', [reference, id])
      if (dup.rows.length) return res.status(409).json({ error: 'Cette référence existe déjà' })
    }

    const result = await pool.query(
      `
        UPDATE materiaux
        SET reference = $1, nom = $2, description = $3, categorie = $4,
            quantite_stock = $5, unite = $6, prix_unitaire = $7, actif = $8,
            updated_at = NOW()
        WHERE id = $9
        RETURNING *
      `,
      [reference, nom, description, categorie, quantiteStock, unite, prixUnitaire, actif, id],
    )

    return res.json({ success: true, materiau: formatMaterialRow(result.rows[0]) })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
})

// Supprimer un matériau
app.delete('/api/materiaux/:id', requireRole(ROLE_GESTIONNAIRE), async (req, res) => {
  try {
    const id = parseInteger(req.params.id)
    if (!id) return res.status(400).json({ error: 'Identifiant invalide' })

    const result = await pool.query('DELETE FROM materiaux WHERE id = $1 RETURNING id', [id])
    if (!result.rows.length) return res.status(404).json({ error: 'Matériau introuvable' })

    return res.json({ success: true, message: 'Matériau supprimé' })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
})

app.get('/api/interventions', requireRole(ROLE_GESTIONNAIRE), async (req, res) => {
  try {
    const params = []
    const filters = []

    const technicienValue = req.query.technicien_id ?? req.query.technicien
    if (technicienValue !== undefined && technicienValue !== null && technicienValue !== '') {
      const technicienId = parseInteger(technicienValue)
      if (!technicienId) {
        return res.status(400).json({ error: 'technicien invalide' })
      }
      params.push(technicienId)
      // Accept both techniciens.id and users.id (t.user_id is available via the JOIN below)
      filters.push(`(i.technicien_id = $${params.length} OR t.user_id = $${params.length})`)
    }

    const statut = typeof req.query.statut === 'string' ? req.query.statut.trim() : ''
    if (statut) {
      params.push(statut)
      filters.push(`i.statut = $${params.length}`)
    }

    const semaine = typeof req.query.semaine === 'string' ? req.query.semaine.trim() : ''
    const dateDebut = typeof req.query.dateDebut === 'string' ? req.query.dateDebut.trim() : ''
    const dateFin = typeof req.query.dateFin === 'string' ? req.query.dateFin.trim() : ''

    // BESOIN #3 : les interventions pouvant durer plusieurs jours, on sélectionne
    // toutes celles qui CHEVAUCHENT la période demandée, et pas seulement celles
    // qui DÉBUTENT dedans. Une intervention chevauche [début, fin] si :
    //   date_depart <= fin  ET  date_fin (= date_retour) >= début
    // COALESCE(date_retour, date_depart) gère les anciennes interventions d'1 jour.
    if (semaine) {
      const startDate = new Date(semaine)
      if (Number.isNaN(startDate.getTime())) {
        return res.status(400).json({ error: 'semaine invalide' })
      }
      const endDate = new Date(startDate)
      endDate.setDate(endDate.getDate() + 6)
      params.push(startDate.toISOString())
      const startParam = params.length
      params.push(endDate.toISOString())
      const endParam = params.length
      filters.push(
        `i.date_depart < ($${endParam}::timestamptz + interval '1 day') AND COALESCE(i.date_retour, i.date_depart) >= $${startParam}`,
      )
    } else if (dateDebut || dateFin) {
      if (dateFin) {
        const endDate = new Date(dateFin)
        if (Number.isNaN(endDate.getTime())) {
          return res.status(400).json({ error: 'dateFin invalide' })
        }
        params.push(endDate.toISOString())
        filters.push(`i.date_depart < ($${params.length}::timestamptz + interval '1 day')`)
      }
      if (dateDebut) {
        const startDate = new Date(dateDebut)
        if (Number.isNaN(startDate.getTime())) {
          return res.status(400).json({ error: 'dateDebut invalide' })
        }
        params.push(startDate.toISOString())
        filters.push(`COALESCE(i.date_retour, i.date_depart) >= $${params.length}`)
      }
    }

    const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : ''

    const result = await pool.query(
      `
        SELECT
          i.*,
          u.id AS technicien_user_id,
          u.nom AS technicien_nom,
          u.prenom AS technicien_prenom,
          u.email AS technicien_email
        FROM interventions i
        JOIN techniciens t ON t.id = i.technicien_id
        JOIN users u ON u.id = t.user_id
        ${whereClause}
        ORDER BY i.date_depart ASC, i.id ASC
      `,
      params,
    )

    return res.json({
      success: true,
      count: result.rows.length,
      interventions: result.rows.map(formatPlanningInterventionRow),
    })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
})

app.get('/api/interventions/:id', requireRole(ROLE_GESTIONNAIRE), async (req, res) => {
  try {
    const interventionId = parseInteger(req.params.id)
    if (!interventionId) {
      return res.status(400).json({ error: 'Identifiant invalide' })
    }

    const result = await pool.query(
      `
        SELECT
          i.*,
          u.id AS technicien_user_id,
          u.nom AS technicien_nom,
          u.prenom AS technicien_prenom,
          u.email AS technicien_email
        FROM interventions i
        JOIN techniciens t ON t.id = i.technicien_id
        JOIN users u ON u.id = t.user_id
        WHERE i.id = $1
        LIMIT 1
      `,
      [interventionId],
    )

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Intervention introuvable' })
    }

    return res.json({ success: true, intervention: formatPlanningInterventionRow(result.rows[0]) })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
})

app.post('/api/interventions', requireRole(ROLE_GESTIONNAIRE), async (req, res) => {
  try {
    console.log('[POST /api/interventions] body reçu:', JSON.stringify(req.body))
    const technicienId = parseInteger(req.body.technicien_id ?? req.body.technicien)
    const titre = typeof req.body.titre === 'string' ? req.body.titre.trim() : ''
    const description = typeof req.body.description === 'string' ? req.body.description.trim() : null
    const lieuDepart = typeof req.body.lieu_depart === 'string' ? req.body.lieu_depart.trim() : typeof req.body.lieuDepart === 'string' ? req.body.lieuDepart.trim() : ''
    const lieuArrivee = typeof req.body.lieu_arrivee === 'string' ? req.body.lieu_arrivee.trim() : typeof req.body.lieuArrivee === 'string' ? req.body.lieuArrivee.trim() : ''
    const dateDepartInput = req.body.date_depart ?? req.body.dateDepart ?? req.body.date_debut ?? req.body.dateDebut
    // BESOIN #3 : date de fin (= date_retour). On accepte plusieurs noms pour rester souple.
    const dateRetourInput = req.body.date_retour ?? req.body.dateRetour ?? req.body.date_fin ?? req.body.dateFin
    const statut = typeof req.body.statut === 'string' ? req.body.statut.trim() : 'PLANIFIEE'

    console.log('[POST /api/interventions] technicienId parsé:', technicienId)

    if (!technicienId || !titre || !lieuDepart || !lieuArrivee || !dateDepartInput) {
      return res.status(400).json({
        error: 'technicien_id, titre, lieu_depart, lieu_arrivee et date_depart sont obligatoires',
      })
    }

    // Résolution robuste : on cherche d'abord dans techniciens (par t.id ou t.user_id),
    // puis si rien, on vérifie si c'est un utilisateur TECHNICIEN valide et on crée
    // automatiquement la ligne techniciens manquante (auto-réparation).
    let resolvedTechnicianId = null
    const technicianCheck = await pool.query(
      `SELECT t.id, t.user_id FROM techniciens t WHERE t.id = $1 OR t.user_id = $1 LIMIT 1`,
      [technicienId],
    )

    console.log('[POST /api/interventions] technicianCheck rows:', technicianCheck.rows)

    if (technicianCheck.rows[0]) {
      resolvedTechnicianId = technicianCheck.rows[0].id
    } else {
      // Pas de ligne techniciens → vérifier si l'utilisateur existe et a le rôle TECHNICIEN
      const userCheck = await pool.query(
        `SELECT id, role, actif FROM users WHERE id = $1 LIMIT 1`,
        [technicienId],
      )
      console.log('[POST /api/interventions] userCheck rows:', userCheck.rows)
      if (!userCheck.rows[0]) {
        return res.status(404).json({ error: `Technicien introuvable : aucun utilisateur avec id=${technicienId}` })
      }
      const u = userCheck.rows[0]
      const normalizedRole = String(u.role).toUpperCase().trim()
      if (normalizedRole !== ROLE_TECHNICIEN) {
        return res.status(400).json({ error: `Utilisateur id=${u.id} a le rôle "${u.role}", pas TECHNICIEN` })
      }
      if (u.actif === false) {
        return res.status(400).json({ error: `Le technicien id=${u.id} est inactif` })
      }
      // Auto-création de la ligne techniciens manquante
      const autoMatricule = `TECH-${String(u.id).padStart(4, '0')}`
      console.log(`[POST /api/interventions] Auto-création techniciens pour user_id=${u.id}, matricule=${autoMatricule}`)
      const inserted = await pool.query(
        `INSERT INTO techniciens (matricule, user_id) VALUES ($1, $2) RETURNING id`,
        [autoMatricule, u.id],
      )
      resolvedTechnicianId = inserted.rows[0].id
      console.log(`[POST /api/interventions] Ligne techniciens créée: id=${resolvedTechnicianId}`)
    }

    console.log('[POST /api/interventions] resolvedTechnicianId final:', resolvedTechnicianId)

    const dateDepart = new Date(dateDepartInput)
    if (Number.isNaN(dateDepart.getTime())) {
      return res.status(400).json({ error: 'date_depart invalide' })
    }

    // Date de fin : si absente, on prend la date de début (intervention d'un seul jour).
    let dateRetour = dateDepart
    if (dateRetourInput !== undefined && dateRetourInput !== null && dateRetourInput !== '') {
      const parsedRetour = new Date(dateRetourInput)
      if (Number.isNaN(parsedRetour.getTime())) {
        return res.status(400).json({ error: 'date_fin invalide' })
      }
      if (parsedRetour < dateDepart) {
        return res.status(400).json({ error: 'La date de fin doit être postérieure ou égale à la date de début' })
      }
      dateRetour = parsedRetour
    }

    const result = await pool.query(
      `
        INSERT INTO interventions (
          technicien_id,
          titre,
          description,
          lieu_depart,
          lieu_arrivee,
          date_depart,
          date_retour,
          statut
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id
      `,
      [resolvedTechnicianId, titre, description, lieuDepart, lieuArrivee, dateDepart.toISOString(), dateRetour.toISOString(), statut],
    )

    const created = await pool.query(
      `
        SELECT
          i.*,
          u.id AS technicien_user_id,
          u.nom AS technicien_nom,
          u.prenom AS technicien_prenom,
          u.email AS technicien_email
        FROM interventions i
        JOIN techniciens t ON t.id = i.technicien_id
        JOIN users u ON u.id = t.user_id
        WHERE i.id = $1
        LIMIT 1
      `,
      [result.rows[0].id],
    )

    return res.status(201).json({ success: true, intervention: formatPlanningInterventionRow(created.rows[0]) })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
})

app.put('/api/interventions/:id', requireRole(ROLE_GESTIONNAIRE), async (req, res) => {
  try {
    const interventionId = parseInteger(req.params.id)
    if (!interventionId) {
      return res.status(400).json({ error: 'Identifiant invalide' })
    }

    const current = await pool.query('SELECT id FROM interventions WHERE id = $1 LIMIT 1', [interventionId])
    if (!current.rows[0]) {
      return res.status(404).json({ error: 'Intervention introuvable' })
    }

    const technicienId = req.body.technicien_id !== undefined || req.body.technicien !== undefined
      ? parseInteger(req.body.technicien_id ?? req.body.technicien)
      : null
    const titre = typeof req.body.titre === 'string' ? req.body.titre.trim() : null
    const description = typeof req.body.description === 'string' ? req.body.description.trim() : null
    const lieuDepart = typeof req.body.lieu_depart === 'string' ? req.body.lieu_depart.trim() : typeof req.body.lieuDepart === 'string' ? req.body.lieuDepart.trim() : null
    const lieuArrivee = typeof req.body.lieu_arrivee === 'string' ? req.body.lieu_arrivee.trim() : typeof req.body.lieuArrivee === 'string' ? req.body.lieuArrivee.trim() : null
    const statut = typeof req.body.statut === 'string' ? req.body.statut.trim() : null
    const dateDepartInput = req.body.date_depart ?? req.body.dateDepart ?? req.body.date_debut ?? req.body.dateDebut
    const dateRetourInput = req.body.date_retour ?? req.body.dateRetour ?? req.body.date_fin ?? req.body.dateFin

    let dateDepart = null
    if (dateDepartInput !== undefined && dateDepartInput !== null && dateDepartInput !== '') {
      const parsed = new Date(dateDepartInput)
      if (Number.isNaN(parsed.getTime())) {
        return res.status(400).json({ error: 'date_depart invalide' })
      }
      dateDepart = parsed.toISOString()
    }

    // BESOIN #3 : date de fin (date_retour) modifiable.
    let dateRetour = null
    if (dateRetourInput !== undefined && dateRetourInput !== null && dateRetourInput !== '') {
      const parsed = new Date(dateRetourInput)
      if (Number.isNaN(parsed.getTime())) {
        return res.status(400).json({ error: 'date_fin invalide' })
      }
      dateRetour = parsed.toISOString()
    }

    let resolvedUpdateTechnicianId = technicienId
    if (technicienId) {
      const technicianCheck = await pool.query(
        `SELECT t.id FROM techniciens t WHERE t.id = $1 OR t.user_id = $1 LIMIT 1`,
        [technicienId],
      )
      if (technicianCheck.rows[0]) {
        resolvedUpdateTechnicianId = technicianCheck.rows[0].id
      } else {
        // Auto-réparation : si l'utilisateur existe et est un technicien actif,
        // on lui crée une ligne techniciens manquante.
        const userCheck = await pool.query(
          `SELECT id, role, actif FROM users WHERE id = $1 LIMIT 1`,
          [technicienId],
        )
        if (!userCheck.rows[0]) {
          return res.status(404).json({ error: 'Technicien introuvable (utilisateur inexistant)' })
        }
        const u = userCheck.rows[0]
        if (String(u.role).toUpperCase() !== ROLE_TECHNICIEN) {
          return res.status(400).json({ error: `Cet utilisateur n'est pas un technicien (rôle: ${u.role})` })
        }
        if (!u.actif) {
          return res.status(400).json({ error: 'Ce technicien est inactif' })
        }
        const autoMatricule = `TECH-${String(u.id).padStart(4, '0')}`
        const inserted = await pool.query(
          `INSERT INTO techniciens (matricule, user_id) VALUES ($1, $2) RETURNING id`,
          [autoMatricule, u.id],
        )
        resolvedUpdateTechnicianId = inserted.rows[0].id
      }
    }

    const result = await pool.query(
      `
        UPDATE interventions
        SET
          technicien_id = COALESCE($1, technicien_id),
          titre = COALESCE($2, titre),
          description = COALESCE($3, description),
          lieu_depart = COALESCE($4, lieu_depart),
          lieu_arrivee = COALESCE($5, lieu_arrivee),
          date_depart = COALESCE($6, date_depart),
          statut = COALESCE($7, statut),
          date_retour = COALESCE($9, date_retour)
        WHERE id = $8
        RETURNING id
      `,
      [resolvedUpdateTechnicianId, titre, description, lieuDepart, lieuArrivee, dateDepart, statut, interventionId, dateRetour],
    )

    const updated = await pool.query(
      `
        SELECT
          i.*,
          u.id AS technicien_user_id,
          u.nom AS technicien_nom,
          u.prenom AS technicien_prenom,
          u.email AS technicien_email
        FROM interventions i
        JOIN techniciens t ON t.id = i.technicien_id
        JOIN users u ON u.id = t.user_id
        WHERE i.id = $1
        LIMIT 1
      `,
      [result.rows[0].id],
    )

    return res.json({ success: true, intervention: formatPlanningInterventionRow(updated.rows[0]) })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
})

app.delete('/api/interventions/:id', requireRole(ROLE_GESTIONNAIRE), async (req, res) => {
  try {
    const interventionId = parseInteger(req.params.id)
    if (!interventionId) {
      return res.status(400).json({ error: 'Identifiant invalide' })
    }

    const result = await pool.query('DELETE FROM interventions WHERE id = $1 RETURNING id', [interventionId])
    if (!result.rows.length) {
      return res.status(404).json({ error: 'Intervention introuvable' })
    }

    return res.json({ success: true, message: 'Intervention supprimée' })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
})

app.get('/api/rapports/stats', requireRole(ROLE_GESTIONNAIRE), async (req, res) => {
  try {
    const [enAttente, valides, rejetes] = await Promise.all([
      pool.query('SELECT COUNT(*)::int AS count FROM rapports WHERE statut = $1', ['EN_ATTENTE']),
      pool.query('SELECT COUNT(*)::int AS count FROM rapports WHERE statut = $1', ['VALIDE']),
      pool.query('SELECT COUNT(*)::int AS count FROM rapports WHERE statut = $1', ['REJETE']),
    ])

    return res.json({
      success: true,
      stats: {
        enAttente: enAttente.rows[0].count,
        valides: valides.rows[0].count,
        rejetes: rejetes.rows[0].count,
      },
    })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
})

app.get('/api/rapports', requireRole(null), async (req, res) => {
  try {
    const params = []
    const filters = []
    const role = normalizeRole(req.auth.role)

    if (role === ROLE_TECHNICIEN) {
      const technician = await getTechnicianOrFail(req.auth.user.id)
      params.push(technician.technician_id)
      filters.push(`t.id = $${params.length}`)
    } else {
      const technicienValue = req.query.technicien_id ?? req.query.technicien
      if (technicienValue !== undefined && technicienValue !== null && technicienValue !== '') {
        const technicienId = parseInteger(technicienValue)
        if (!technicienId) {
          return res.status(400).json({ error: 'technicien invalide' })
        }
        params.push(technicienId)
        filters.push(`(t.id = $${params.length} OR t.user_id = $${params.length})`)
      }
    }

    const statut = typeof req.query.statut === 'string' ? normalizeReportStatus(req.query.statut) : ''
    if (statut) {
      params.push(statut)
      filters.push(`r.statut = $${params.length}`)
    }

    const interventionValue = req.query.intervention_id ?? req.query.intervention
    if (interventionValue !== undefined && interventionValue !== null && interventionValue !== '') {
      const interventionId = parseInteger(interventionValue)
      if (!interventionId) {
        return res.status(400).json({ error: 'intervention invalide' })
      }
      params.push(interventionId)
      filters.push(`r.intervention_id = $${params.length}`)
    }

    const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : ''

    const result = await pool.query(
      `
        SELECT
          r.*,
          i.titre AS intervention_titre,
          i.description AS intervention_description,
          i.lieu_depart,
          i.lieu_arrivee,
          i.date_depart,
          i.statut AS intervention_statut,
          u.nom AS technicien_nom,
          u.prenom AS technicien_prenom,
          u.email AS technicien_email,
          uv.nom AS validate_nom,
          uv.prenom AS validate_prenom,
          uv.email AS validate_email
        FROM rapports r
        JOIN interventions i ON i.id = r.intervention_id
        JOIN techniciens t ON t.id = r.technicien_id
        JOIN users u ON u.id = t.user_id
        LEFT JOIN users uv ON uv.id = r.validate_par
        ${whereClause}
        ORDER BY r.date DESC, r.id DESC
      `,
      params,
    )

    return res.json({
      success: true,
      count: result.rows.length,
      rapports: result.rows.map(formatReportRow),
    })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
})

app.get('/api/rapports/:id', requireRole(null), async (req, res) => {
  try {
    const reportId = parseInteger(req.params.id)
    if (!reportId) {
      return res.status(400).json({ error: 'Identifiant invalide' })
    }

    const params = [reportId]
    const filters = ['r.id = $1']
    const role = normalizeRole(req.auth.role)
    if (role === ROLE_TECHNICIEN) {
      const technician = await getTechnicianOrFail(req.auth.user.id)
      params.push(technician.technician_id)
      filters.push(`t.id = $2`)
    }

    const result = await pool.query(
      `
        SELECT
          r.*,
          i.titre AS intervention_titre,
          i.description AS intervention_description,
          i.lieu_depart,
          i.lieu_arrivee,
          i.date_depart,
          i.statut AS intervention_statut,
          u.nom AS technicien_nom,
          u.prenom AS technicien_prenom,
          u.email AS technicien_email,
          uv.nom AS validate_nom,
          uv.prenom AS validate_prenom,
          uv.email AS validate_email
        FROM rapports r
        JOIN interventions i ON i.id = r.intervention_id
        JOIN techniciens t ON t.id = r.technicien_id
        JOIN users u ON u.id = t.user_id
        LEFT JOIN users uv ON uv.id = r.validate_par
        WHERE ${filters.join(' AND ')}
        LIMIT 1
      `,
      params,
    )

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Rapport introuvable' })
    }

    return res.json({ success: true, rapport: formatReportRow(result.rows[0]) })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
})

app.post('/api/rapports', requireRole(ROLE_TECHNICIEN), async (req, res) => {
  try {
    const technician = await getTechnicianOrFail(req.auth.user.id)
    const interventionId = parseInteger(req.body.intervention_id ?? req.body.intervention)
    if (!interventionId) {
      return res.status(400).json({ error: 'intervention est obligatoire' })
    }

    const ownership = await pool.query(
      'SELECT id, date_depart FROM interventions WHERE id = $1 AND technicien_id = $2 LIMIT 1',
      [interventionId, technician.technician_id],
    )

    if (!ownership.rows[0]) {
      return res.status(403).json({ error: 'Cette intervention ne vous appartient pas' })
    }

    const dateValue = req.body.date ? new Date(req.body.date) : new Date()
    if (Number.isNaN(dateValue.getTime())) {
      return res.status(400).json({ error: 'date invalide' })
    }

    const etapesInput = parseJsonField(req.body.etapes, {})
    const materielInput = parseJsonField(req.body.materielUtilise, [])
    const presenceConfirmee =
      req.body.presenceConfirmee === undefined ? false : Boolean(req.body.presenceConfirmee)
    const gpsLatitude = req.body.gpsLatitude ?? null
    const gpsLongitude = req.body.gpsLongitude ?? null
    const gpsAdresse = typeof req.body.gpsAdresse === 'string' ? req.body.gpsAdresse.trim() : null
    const tempsPasse = typeof req.body.tempsPasse === 'string' ? req.body.tempsPasse.trim() : null
    const notes = typeof req.body.notes === 'string' ? req.body.notes.trim() : null
    const photoUrl =
      typeof req.body.photoUrl === 'string'
        ? req.body.photoUrl.trim() || null
        : typeof req.body.photo_url === 'string'
          ? req.body.photo_url.trim() || null
          : null

    const created = await runTransaction(async (client) => {
      const insert = await client.query(
        `
          INSERT INTO rapports (
            intervention_id,
            technicien_id,
            date,
            presence_confirmee,
            gps_latitude,
            gps_longitude,
            gps_adresse,
            materiel_utilise,
            etapes,
            temps_passe,
            notes,
            photo_url,
            statut
          )
          VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb, $10, $11, $12, $13
          )
          RETURNING id
        `,
        [
          interventionId,
          technician.technician_id,
          dateValue.toISOString().slice(0, 10),
          presenceConfirmee,
          gpsLatitude,
          gpsLongitude,
          gpsAdresse,
          JSON.stringify(materielInput),
          JSON.stringify(etapesInput),
          tempsPasse,
          notes,
          photoUrl,
          'EN_ATTENTE',
        ],
      )

      await client.query(
        `UPDATE interventions SET statut = $1 WHERE id = $2`,
        ['TERMINEE', interventionId],
      )

      return insert.rows[0].id
    })

    const result = await pool.query(
      `
        SELECT
          r.*,
          i.titre AS intervention_titre,
          i.description AS intervention_description,
          i.lieu_depart,
          i.lieu_arrivee,
          i.date_depart,
          i.statut AS intervention_statut,
          u.nom AS technicien_nom,
          u.prenom AS technicien_prenom,
          u.email AS technicien_email,
          uv.nom AS validate_nom,
          uv.prenom AS validate_prenom,
          uv.email AS validate_email
        FROM rapports r
        JOIN interventions i ON i.id = r.intervention_id
        JOIN techniciens t ON t.id = r.technicien_id
        JOIN users u ON u.id = t.user_id
        LEFT JOIN users uv ON uv.id = r.validate_par
        WHERE r.id = $1
        LIMIT 1
      `,
      [created],
    )

    return res.status(201).json({ success: true, rapport: formatReportRow(result.rows[0]) })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
})

app.put('/api/rapports/:id/valider', requireRole(ROLE_GESTIONNAIRE), async (req, res) => {
  try {
    const reportId = parseInteger(req.params.id)
    if (!reportId) {
      return res.status(400).json({ error: 'Identifiant invalide' })
    }

    const decision = parseReportDecision(req.body.decision)
    if (!decision) {
      return res.status(400).json({ error: 'Décision invalide' })
    }

    const commentaire =
      typeof req.body.commentaire === 'string'
        ? req.body.commentaire.trim() || null
        : typeof req.body.commentaire_validation === 'string'
          ? req.body.commentaire_validation.trim() || null
          : null

    const updated = await runTransaction(async (client) => {
      const result = await client.query(
        `
          UPDATE rapports
          SET
            statut = $1,
            validate_par = $2,
            date_validation = NOW(),
            commentaire_validation = $3
          WHERE id = $4
          RETURNING id
        `,
        [decision, req.auth.user.id, commentaire, reportId],
      )

      return result.rows[0] ? result.rows[0].id : null
    })

    if (!updated) {
      return res.status(404).json({ error: 'Rapport introuvable' })
    }

    const result = await pool.query(
      `
        SELECT
          r.*,
          i.titre AS intervention_titre,
          i.description AS intervention_description,
          i.lieu_depart,
          i.lieu_arrivee,
          i.date_depart,
          i.statut AS intervention_statut,
          u.nom AS technicien_nom,
          u.prenom AS technicien_prenom,
          u.email AS technicien_email,
          uv.nom AS validate_nom,
          uv.prenom AS validate_prenom,
          uv.email AS validate_email
        FROM rapports r
        JOIN interventions i ON i.id = r.intervention_id
        JOIN techniciens t ON t.id = r.technicien_id
        JOIN users u ON u.id = t.user_id
        LEFT JOIN users uv ON uv.id = r.validate_par
        WHERE r.id = $1
        LIMIT 1
      `,
      [updated],
    )

    return res.json({ success: true, rapport: formatReportRow(result.rows[0]) })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
})

app.get('/api/technicien/me', requireRole(ROLE_TECHNICIEN), async (req, res) => {
  try {
    const technician = await getTechnicianOrFail(req.auth.user.id)
    return res.json({
      user: req.auth.user,
      technician,
    })
  } catch (error) {
    return res.status(404).json({ error: error.message })
  }
})

// Le TECHNICIEN change SON PROPRE mot de passe.
// On exige l'ancien mot de passe pour confirmer l'identité.
app.put('/api/technicien/password', requireRole(ROLE_TECHNICIEN), async (req, res) => {
  try {
    const ancien = typeof req.body.ancien_mot_de_passe === 'string' ? req.body.ancien_mot_de_passe : ''
    const nouveau = typeof req.body.nouveau_mot_de_passe === 'string' ? req.body.nouveau_mot_de_passe : ''

    if (!ancien || !nouveau) {
      return res.status(400).json({ error: 'Ancien et nouveau mot de passe sont obligatoires' })
    }
    if (nouveau.length < 6) {
      return res.status(400).json({ error: 'Le nouveau mot de passe doit contenir au moins 6 caractères' })
    }

    // On relit le hash courant en base (req.auth.user ne contient pas le mot de passe).
    const current = await pool.query('SELECT mot_de_passe FROM users WHERE id = $1 LIMIT 1', [req.auth.user.id])
    const storedPassword = current.rows[0]?.mot_de_passe
    const valid = await verifyPassword(ancien, storedPassword)
    if (!valid) {
      return res.status(401).json({ error: 'Ancien mot de passe incorrect' })
    }

    const hashedPassword = await bcrypt.hash(nouveau, 10)
    await pool.query('UPDATE users SET mot_de_passe = $1 WHERE id = $2', [hashedPassword, req.auth.user.id])

    return res.json({ success: true, message: 'Mot de passe mis à jour' })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
})

app.get('/api/technicien/interventions', requireRole(ROLE_TECHNICIEN), async (req, res) => {
  try {
    const technician = await getTechnicianOrFail(req.auth.user.id)
    const result = await pool.query(
      `
        SELECT i.*
        FROM interventions i
        WHERE i.technicien_id = $1
        ORDER BY i.date_depart DESC, i.id DESC
      `,
      [technician.technician_id],
    )

    return res.json(result.rows.map(formatInterventionRow))
  } catch (error) {
    return res.status(404).json({ error: error.message })
  }
})

app.get('/api/technicien/frais', requireRole(ROLE_TECHNICIEN), async (req, res) => {
  try {
    const technician = await getTechnicianOrFail(req.auth.user.id)
    const result = await pool.query(
      `
        SELECT
          f.*,
          i.titre AS mission,
          i.technicien_id,
          CONCAT(u.nom, ' ', u.prenom) AS technicien,
          v.decision,
          v.date_decision
        FROM frais_deplacement f
        JOIN interventions i ON i.id = f.intervention_id
        JOIN techniciens t ON t.id = i.technicien_id
        JOIN users u ON u.id = t.user_id
        LEFT JOIN LATERAL (
          SELECT decision, date_decision
          FROM validations
          WHERE frais_id = f.id
          ORDER BY date_decision DESC, id DESC
          LIMIT 1
        ) v ON true
        WHERE t.id = $1
        ORDER BY f.date_frais DESC, f.id DESC
      `,
      [technician.technician_id],
    )

    return res.json(result.rows.map(formatExpenseRow))
  } catch (error) {
    return res.status(404).json({ error: error.message })
  }
})

app.post('/api/technicien/frais', requireRole(ROLE_TECHNICIEN), async (req, res) => {
  try {
    const technician = await getTechnicianOrFail(req.auth.user.id)
    const {
      intervention_id: providedInterventionId,
      type_frais,
      montant,
      date_frais,
      description = null,
      devise = 'MAD',
      justificatif = null,      // data URL base64 du fichier (image/PDF)
      justificatif_nom = null,  // nom d'origine du fichier (facultatif)
    } = req.body

    if (!type_frais || montant === undefined || !date_frais) {
      return res.status(400).json({
        error: 'type_frais, montant et date_frais sont obligatoires',
      })
    }

    // BESOIN #4 : la mission (intervention) est désormais OBLIGATOIRE et
    // explicitement choisie par le technicien (plus de rattachement automatique).
    const interventionId = parseInteger(providedInterventionId)
    if (!interventionId) {
      return res.status(400).json({
        error: 'Veuillez sélectionner la mission liée à cette demande de frais',
      })
    }

    // BESOIN #4 : le justificatif est obligatoire pour valider la demande.
    if (!justificatif) {
      return res.status(400).json({
        error: 'Un justificatif (image ou PDF) est obligatoire',
      })
    }

    const normalizedTypeFrais = String(type_frais).toUpperCase()

    const ownershipCheck = await pool.query(
      'SELECT id FROM interventions WHERE id = $1 AND technicien_id = $2 LIMIT 1',
      [interventionId, technician.technician_id],
    )

    if (!ownershipCheck.rows.length) {
      return res.status(403).json({
        error: 'Cette mission ne vous appartient pas',
      })
    }

    // On enregistre le fichier sur le disque ; saveBase64Justificatif lève une
    // erreur explicite si le format/type/taille n'est pas valide.
    const justificatifUrl = saveBase64Justificatif(justificatif)

    const insertResult = await pool.query(
      `
        INSERT INTO frais_deplacement (
          intervention_id,
          type_frais,
          montant,
          devise,
          date_frais,
          description,
          justificatif_url,
          justificatif_nom,
          statut_validation
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `,
      [
        interventionId,
        normalizedTypeFrais,
        montant,
        devise,
        date_frais,
        description,
        justificatifUrl,
        justificatif_nom,
        EXPENSE_STATUS_PENDING,
      ],
    )

    const createdExpense = insertResult.rows[0]
    return res.status(201).json({
      ...formatExpenseRow({
        ...createdExpense,
        mission: null,
        technicien: null,
        technicien_id: technician.technician_id,
      }),
      message: 'Demande de frais enregistree',
    })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
})

app.get('/api/manager/dashboard', requireRole(ROLE_GESTIONNAIRE), async (req, res) => {
  try {
    const manager = await getManagerOrFail(req.auth.user.id)

    const [
      technicianCount,
      interventionCount,
      expenseCount,
      pendingExpenseCount,
      validatedExpenseCount,
      recentInterventions,
      recentExpenses,
    ] = await Promise.all([
      pool.query(`SELECT COUNT(*)::int AS count FROM techniciens t JOIN users u ON u.id = t.user_id WHERE u.actif = true`),
      pool.query('SELECT COUNT(*)::int AS count FROM interventions'),
      pool.query('SELECT COUNT(*)::int AS count FROM frais_deplacement'),
      pool.query(
        `SELECT COUNT(*)::int AS count FROM frais_deplacement WHERE statut_validation = $1`,
        [EXPENSE_STATUS_PENDING],
      ),
      pool.query(
        `SELECT COUNT(*)::int AS count FROM frais_deplacement WHERE statut_validation = $1`,
        [EXPENSE_STATUS_VALIDATED],
      ),
      pool.query(
        `
          SELECT
            i.id,
            i.titre,
            i.statut,
            i.date_depart,
            CONCAT(u.nom, ' ', u.prenom) AS technicien
          FROM interventions i
          JOIN techniciens t ON t.id = i.technicien_id
          JOIN users u ON u.id = t.user_id
          ORDER BY i.created_at DESC, i.id DESC
          LIMIT 5
        `,
      ),
      pool.query(
        `
          SELECT
            f.id,
            f.type_frais,
            f.montant,
            f.devise,
            f.date_frais,
            f.statut_validation,
            i.titre AS mission,
            CONCAT(u.nom, ' ', u.prenom) AS technicien
          FROM frais_deplacement f
          JOIN interventions i ON i.id = f.intervention_id
          JOIN techniciens t ON t.id = i.technicien_id
          JOIN users u ON u.id = t.user_id
          ORDER BY f.created_at DESC, f.id DESC
          LIMIT 5
        `,
      ),
    ])

    return res.json({
      manager,
      stats: {
        techniciens: technicianCount.rows[0].count,
        interventions: interventionCount.rows[0].count,
        frais: expenseCount.rows[0].count,
        fraisEnAttente: pendingExpenseCount.rows[0].count,
        fraisValides: validatedExpenseCount.rows[0].count,
      },
      recentInterventions: recentInterventions.rows.map(formatInterventionRow),
      recentExpenses: recentExpenses.rows.map(formatExpenseRow),
    })
  } catch (error) {
    return res.status(404).json({ error: error.message })
  }
})

app.get('/api/manager/expenses', requireRole(ROLE_GESTIONNAIRE), async (req, res) => {
  try {
    const status = typeof req.query.status === 'string' ? req.query.status.trim() : ''
    const params = []
    let whereClause = ''
    if (status) {
      params.push(status)
      whereClause = `WHERE f.statut_validation = $1`
    }

    const result = await pool.query(
      `
        SELECT
          f.*,
          i.titre AS mission,
          i.technicien_id,
          CONCAT(u.nom, ' ', u.prenom) AS technicien,
          v.decision,
          v.date_decision
        FROM frais_deplacement f
        JOIN interventions i ON i.id = f.intervention_id
        JOIN techniciens t ON t.id = i.technicien_id
        JOIN users u ON u.id = t.user_id
        LEFT JOIN LATERAL (
          SELECT decision, date_decision
          FROM validations
          WHERE frais_id = f.id
          ORDER BY date_decision DESC, id DESC
          LIMIT 1
        ) v ON true
        ${whereClause}
        ORDER BY f.created_at DESC, f.id DESC
      `,
      params,
    )

    return res.json(result.rows.map(formatExpenseRow))
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
})

app.patch('/api/manager/expenses/:id/validate', requireRole(ROLE_GESTIONNAIRE), async (req, res) => {
  try {
    const expenseId = parseInteger(req.params.id)
    if (!expenseId) {
      return res.status(400).json({ error: 'Identifiant invalide' })
    }

    const manager = await getManagerOrFail(req.auth.user.id)
    const commentaire = typeof req.body.commentaire === 'string' ? req.body.commentaire.trim() || null : null

    const updatedId = await runTransaction(async (client) => {
      const result = await client.query(
        `UPDATE frais_deplacement SET statut_validation = $1 WHERE id = $2 AND statut_validation = $3 RETURNING id`,
        [EXPENSE_STATUS_VALIDATED, expenseId, EXPENSE_STATUS_PENDING],
      )

      if (!result.rows[0]) return null

      await client.query(
        `INSERT INTO validations (frais_id, gestionnaire_id, decision, commentaire) VALUES ($1, $2, $3, $4)`,
        [expenseId, manager.manager_id, EXPENSE_STATUS_VALIDATED, commentaire],
      )

      return result.rows[0].id
    })

    if (!updatedId) {
      return res.status(404).json({ error: 'Frais introuvable ou déjà traité' })
    }

    return res.json({ success: true, message: 'Frais validé' })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
})

app.patch('/api/manager/expenses/pay', requireRole(ROLE_GESTIONNAIRE), async (req, res) => {
  try {
    const { ids = [], reference = null } = req.body
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids doit contenir au moins un element' })
    }

    const expenseIds = ids.map(parseInteger).filter(Boolean)
    if (expenseIds.length === 0) {
      return res.status(400).json({ error: 'Aucun identifiant valide fourni' })
    }

    const manager = await getManagerOrFail(req.auth.user.id)

    const updated = await pool.query(
      `
        UPDATE frais_deplacement
        SET statut_validation = $1
        WHERE id = ANY($2::int[])
        RETURNING id
      `,
      [EXPENSE_STATUS_PAID, expenseIds],
    )

    await pool.query(
      `
        INSERT INTO validations (frais_id, gestionnaire_id, decision, commentaire)
        SELECT f.id, $1, $2, $3
        FROM frais_deplacement f
        WHERE f.id = ANY($4::int[])
      `,
      [
        manager.manager_id,
        EXPENSE_STATUS_PAID,
        reference ? `Paiement effectue. Reference: ${reference}` : 'Paiement effectue',
        expenseIds,
      ],
    )

    return res.json({
      message: 'Paiement enregistre',
      updatedIds: updated.rows.map((row) => row.id),
    })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
})

pool
  .query('SELECT 1')
  .then(() => console.log('Connecte a PostgreSQL'))
  .catch((error) => console.error('Erreur de connexion :', error))

ensureAuthConfig()
  .then((config) => {
    authConfig = config
    if (config) {
      console.log(
        `Auth config: table=${config.tableName}, login=${config.loginColumn}, password=${config.passwordColumn}`,
      )
    } else {
      console.error('Auth config introuvable. Verifie le schema de la base.')
    }
  })
  .catch((error) => console.error('Erreur lors de la detection du schema auth :', error))

const PORT = Number(process.env.PORT) || 3000
app.listen(PORT, () => {
  console.log(`Serveur lance sur le port ${PORT}`)
})
