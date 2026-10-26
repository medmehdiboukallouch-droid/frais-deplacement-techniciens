import { useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Lock, User } from 'lucide-react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { toast } from 'sonner'
import { apiFetch } from '../lib/api'
import {
  isTechnicianAuthenticated,
  setTechnicianSession,
} from './technicianSession'

export default function TechnicianLogin() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (isTechnicianAuthenticated()) {
    return <Navigate to="/technicien/dashboard" replace />
  }

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      toast.error('Veuillez remplir tous les champs')
      return
    }

    try {
      setIsSubmitting(true)

      const data = await apiFetch<{ token: string }>('/login/technicien', {
        method: 'POST',
        body: {
          email,
          password,
        },
      })

      setTechnicianSession(data.token)
      toast.success('Connexion reussie !')
      navigate('/technicien/dashboard', { replace: true })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur de connexion'
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 p-4">
      <div className="w-full max-w-md">
        <div className="rounded-3xl bg-white p-8 shadow-2xl">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-blue-100">
              <User className="h-10 w-10 text-blue-600" />
            </div>
            <h1 className="mb-2 text-3xl font-bold text-gray-900">Connexion</h1>
            <p className="text-gray-600">Espace Technicien</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="mb-3 block text-lg font-medium text-gray-700">
                Email
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="votre.email@entreprise.fr"
                className="h-14 text-lg"
              />
            </div>

            <div>
              <label className="mb-3 block text-lg font-medium text-gray-700">
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
              className="mt-8 h-16 w-full bg-blue-600 text-xl hover:bg-blue-700"
            >
              <Lock className="mr-2 h-6 w-6" />
              {isSubmitting ? 'Connexion...' : 'Se connecter'}
            </Button>
          </form>
        </div>

        <button
          type="button"
          onClick={() => navigate('/')}
          className="mt-6 w-full text-center text-lg font-medium text-blue-700"
        >
          Retour a l'accueil
        </button>
      </div>
    </div>
  )
}
