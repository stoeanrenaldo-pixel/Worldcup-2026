'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Lock } from 'lucide-react'

export default function AdminLoginPage() {
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (res.ok) {
        const { token } = await res.json()
        document.cookie = `admin_token=${token}; path=/; max-age=${7 * 24 * 3600}; SameSite=Strict`
        toast.success('Autentificat cu succes!')
        router.push('/admin')
      } else {
        toast.error('Parolă incorectă')
      }
    } catch {
      toast.error('Eroare de conexiune')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <div className="card w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-full bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center mx-auto mb-4">
            <Lock size={24} className="text-yellow-400" />
          </div>
          <h1 className="text-xl font-bold">Acces Administrator</h1>
          <p className="text-sm text-[rgba(255,255,255,0.4)] mt-1">CM 2026 — Concurs Pronosticuri</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs text-[rgba(255,255,255,0.5)] mb-1.5">Parolă admin</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="admin-input"
              placeholder="••••••••"
              required
              autoFocus
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="admin-btn-primary w-full justify-center py-3"
          >
            {loading ? 'Se verifică...' : 'Intră în panou'}
          </button>
        </form>
      </div>
    </div>
  )
}
