import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Send, FileText, Paperclip } from 'lucide-react'
import { Card } from '../ui/card'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Label } from '../ui/label'
import { Input } from '../ui/input'
import { Textarea } from '../ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { toast } from 'sonner'
import { apiFetch, ApiError, API_BASE_URL } from '../lib/api'
import { getTechnicianToken } from './technicianSession'
import { EXPENSE_TYPE_OPTIONS } from '../constants/expenseTypes'

interface ApiExpense {
  id: number
  typeFrais: string
  montant: number
  dateFrais: string | null
  description: string
  statutValidation: string
  mission: string
  justificatifUrl: string | null
}

interface Mission {
  id: number
  titre: string
  dateDepart: string | null
}

// Lit un fichier et le convertit en data URL base64 (envoyée dans le JSON).
function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Lecture du fichier impossible'))
    reader.readAsDataURL(file)
  })
}

function getStatusBadge(statut: string) {
  switch (statut) {
    case 'VALIDEE':
      return { label: 'Approuvé', color: 'bg-green-100 text-green-700 border-green-300' }
    case 'PAYEE':
      return { label: 'Remboursé', color: 'bg-blue-100 text-blue-700 border-blue-300' }
    case 'REJETE':
      return { label: 'Refusé', color: 'bg-red-100 text-red-700 border-red-300' }
    default:
      return { label: 'En attente', color: 'bg-orange-100 text-orange-700 border-orange-300' }
  }
}

function formatDate(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
}

export default function TechnicianExpenseRequest() {
  const navigate = useNavigate()
  const [selectedType, setSelectedType] = useState('')
  const [selectedMission, setSelectedMission] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState('')
  const [description, setDescription] = useState('')
  const [justificatif, setJustificatif] = useState<{ data: string; name: string } | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [requests, setRequests] = useState<ApiExpense[]>([])
  const [missions, setMissions] = useState<Mission[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const loadRequests = async () => {
    const token = getTechnicianToken()
    if (!token) return
    try {
      // On charge en parallèle l'historique des frais ET les missions (interventions)
      // du technicien pour alimenter le menu déroulant "Mission liée".
      const [expenses, interventions] = await Promise.all([
        apiFetch<ApiExpense[]>('/api/technicien/frais', { token }),
        apiFetch<Mission[]>('/api/technicien/interventions', { token }),
      ])
      setRequests(expenses)
      setMissions(interventions)
    } catch {
      // silent — list just stays empty
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadRequests()
  }, [])

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) {
      setJustificatif(null)
      return
    }
    // Garde-fou taille côté client : 5 Mo (le serveur revérifie).
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Fichier trop volumineux (5 Mo maximum)')
      e.target.value = ''
      return
    }
    try {
      const data = await readFileAsDataUrl(file)
      setJustificatif({ data, name: file.name })
    } catch {
      toast.error('Impossible de lire le fichier')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedMission || !selectedType || !amount || !date || !description) {
      toast.error('Veuillez remplir tous les champs obligatoires')
      return
    }
    if (!justificatif) {
      toast.error('Veuillez joindre un justificatif (image ou PDF)')
      return
    }

    const token = getTechnicianToken()
    if (!token) {
      toast.error('Session expirée')
      return
    }

    setIsSubmitting(true)
    try {
      await apiFetch('/api/technicien/frais', {
        method: 'POST',
        token,
        body: {
          intervention_id: Number(selectedMission),
          type_frais: selectedType,
          montant: parseFloat(amount),
          date_frais: date,
          description,
          devise: 'MAD',
          justificatif: justificatif.data,
          justificatif_nom: justificatif.name,
        },
      })

      toast.success('Demande envoyée avec succès !', {
        description: 'Vous serez notifié de la validation',
      })

      setSelectedMission('')
      setSelectedType('')
      setAmount('')
      setDate('')
      setDescription('')
      setJustificatif(null)
      await loadRequests()
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : 'Impossible d\'envoyer la demande'
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-purple-100 pb-8">
      <div className="bg-purple-600 text-white p-6 shadow-lg">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate('/technicien/dashboard')}
            className="p-2 hover:bg-purple-700 rounded-full"
          >
            <ChevronLeft className="w-7 h-7" />
          </button>
          <h1 className="text-2xl font-bold">Demande de Frais</h1>
          <div className="w-11" />
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 mt-6 space-y-6">
        <Card className="p-6 shadow-lg">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center">
              <FileText className="w-6 h-6 text-white" />
            </div>
            Nouvelle demande
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <Label className="text-base font-bold mb-2 block">Mission liée *</Label>
              <Select value={selectedMission} onValueChange={setSelectedMission}>
                <SelectTrigger className="h-14 text-lg">
                  <SelectValue placeholder="Sélectionnez la mission" />
                </SelectTrigger>
                <SelectContent>
                  {missions.length === 0 ? (
                    <SelectItem value="none" disabled className="text-lg py-3">
                      Aucune mission assignée
                    </SelectItem>
                  ) : (
                    missions.map((mission) => (
                      <SelectItem key={mission.id} value={String(mission.id)} className="text-lg py-3">
                        {mission.titre}
                        {mission.dateDepart
                          ? ` — ${new Date(mission.dateDepart).toLocaleDateString('fr-FR')}`
                          : ''}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-base font-bold mb-2 block">Type de frais *</Label>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="h-14 text-lg">
                  <SelectValue placeholder="Sélectionnez un type" />
                </SelectTrigger>
                <SelectContent>
                  {EXPENSE_TYPE_OPTIONS.map((type) => (
                    <SelectItem key={type.value} value={type.value} className="text-lg py-3">
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-base font-bold mb-2 block">Montant (MAD) *</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="h-14 text-lg"
              />
            </div>

            <div>
              <Label className="text-base font-bold mb-2 block">Date *</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-14 text-lg"
              />
            </div>

            <div>
              <Label className="text-base font-bold mb-2 block">Description *</Label>
              <Textarea
                placeholder="Détails de la dépense..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-24 text-lg resize-none"
              />
            </div>

            <div>
              <Label className="text-base font-bold mb-2 block">Justificatif * (image ou PDF)</Label>
              <label
                htmlFor="justificatif"
                className="flex h-14 cursor-pointer items-center gap-3 rounded-md border border-input bg-background px-4 text-lg text-gray-600 hover:bg-gray-50"
              >
                <Paperclip className="h-5 w-5 text-purple-500" />
                <span className="truncate">{justificatif ? justificatif.name : 'Choisir un fichier...'}</span>
              </label>
              <input
                id="justificatif"
                type="file"
                accept="image/*,application/pdf"
                onChange={handleFileChange}
                className="hidden"
              />
              {justificatif && (
                <p className="mt-2 text-sm text-green-600">Fichier prêt à être envoyé.</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-16 text-xl bg-purple-600 hover:bg-purple-700 shadow-lg"
            >
              <Send className="w-6 h-6 mr-3" />
              {isSubmitting ? 'Envoi en cours...' : 'Envoyer la demande'}
            </Button>
          </form>
        </Card>

        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Mes demandes envoyées</h2>

          {isLoading ? (
            <Card className="p-6 text-center text-gray-500">Chargement...</Card>
          ) : requests.length === 0 ? (
            <Card className="p-6 text-center text-gray-500">Aucune demande envoyée.</Card>
          ) : (
            <div className="space-y-3">
              {requests.map((req) => {
                const badge = getStatusBadge(req.statutValidation)
                return (
                  <Card key={req.id} className="p-5 shadow-md hover:shadow-lg transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-bold text-lg text-gray-900 capitalize">
                            {req.typeFrais}
                          </h3>
                          <Badge className={`${badge.color} border`}>{badge.label}</Badge>
                        </div>
                        {req.mission ? (
                          <p className="text-sm font-medium text-purple-700 mb-1">Mission : {req.mission}</p>
                        ) : null}
                        <p className="text-sm text-gray-600 mb-1 capitalize">
                          {formatDate(req.dateFrais)}
                        </p>
                        <p className="text-sm text-gray-700">{req.description}</p>
                        {req.justificatifUrl ? (
                          <a
                            href={`${API_BASE_URL}${req.justificatifUrl}`}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:underline"
                          >
                            <Paperclip className="h-4 w-4" />
                            Voir le justificatif
                          </a>
                        ) : null}
                      </div>
                      <div className="text-right ml-4">
                        <p className="text-2xl font-bold text-gray-900">
                          {req.montant.toFixed(2)} MAD
                        </p>
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
