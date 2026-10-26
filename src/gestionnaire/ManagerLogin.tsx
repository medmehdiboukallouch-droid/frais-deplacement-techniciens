import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, Shield } from 'lucide-react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { toast } from 'sonner'
import { apiFetch } from '../lib/api'
import { setManagerSession } from './managerSession'

export default function ManagerLogin() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      toast.error('Veuillez remplir tous les champs')
      return
    }

    try {
      setIsSubmitting(true)

      const data = await apiFetch<{ token: string }>('/login/gestionnaire', {
        method: 'POST',
        body: {
          email,
          password,
        },
      })

      setManagerSession(data.token)
      toast.success('Connexion reussie !')
      navigate('/gestionnaire/dashboard', { replace: true })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur de connexion'
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="w-10 h-10 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Connexion Gestionnaire
            </h1>
            <p className="text-gray-600">Tableau de bord administrateur</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-lg font-medium text-gray-700 mb-3">
                Email
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@entreprise.fr"
                className="h-14 text-lg"
              />
            </div>

            <div>
              <label className="block text-lg font-medium text-gray-700 mb-3">
                Mot de passe
              </label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="********"
                className="h-14 text-lg"
              />
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-16 text-xl bg-green-600 hover:bg-green-700 mt-8"
            >
              <Lock className="w-6 h-6 mr-2" />
              {isSubmitting ? 'Connexion...' : 'Se connecter'}
            </Button>
          </form>
        </div>

        <button
          type="button"
          onClick={() => navigate('/')}
          className="w-full text-center text-green-700 mt-6 text-lg font-medium"
        >
          Retour a l'accueil
        </button>
      </div>
    </div>
  )
}
