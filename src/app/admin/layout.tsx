'use client'

import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { clsx } from 'clsx'
import {
  Calendar, Upload, CheckSquare, BarChart2,
  LogOut, ChevronRight, Shield
} from 'lucide-react'

const ADMIN_NAV = [
  { href: '/admin', label: 'Dashboard', icon: BarChart2 },
  { href: '/admin/matchday', label: 'Zi de joc', icon: Calendar },
  { href: '/admin/import', label: 'Import Facebook', icon: Upload },
  { href: '/admin/results', label: 'Rezultate', icon: CheckSquare },
]

function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = () => {
    document.cookie = 'admin_token=; Max-Age=0; path=/'
    router.push('/admin/login')
  }

  return (
    <div className="flex gap-6">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-52 shrink-0">
        <div className="card p-3 space-y-1 sticky top-20">
          <div className="flex items-center gap-2 px-3 py-2 mb-2">
            <Shield size={16} className="text-yellow-500" />
            <span className="text-sm font-semibold text-yellow-400">Administrare</span>
          </div>
          {ADMIN_NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={clsx(
                'flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm transition-all',
                pathname === href
                  ? 'bg-yellow-500/10 text-yellow-400 font-medium'
                  : 'text-[rgba(255,255,255,0.6)] hover:bg-[rgba(255,255,255,0.05)] hover:text-white'
              )}
            >
              <Icon size={15} />
              {label}
              {pathname === href && <ChevronRight size={14} className="ml-auto" />}
            </Link>
          ))}
          <div className="border-t border-[rgba(255,215,0,0.08)] my-2" />
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-red-400 hover:bg-red-900/20 transition-all w-full"
          >
            <LogOut size={15} /> Deconectare
          </button>
        </div>
      </aside>

      {/* Mobile nav */}
      <div className="md:hidden mb-4 flex gap-2 overflow-x-auto pb-1 w-full">
        {ADMIN_NAV.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs shrink-0 transition-all',
              pathname === href
                ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                : 'bg-[#12121f] text-[rgba(255,255,255,0.6)] border border-[rgba(255,255,255,0.06)]'
            )}
          >
            <Icon size={13} /> {label}
          </Link>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  )
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [authed, setAuthed] = useState<boolean | null>(null)
  const router = useRouter()

  useEffect(() => {
    // Check token cookie
    const hasToken = document.cookie.includes('admin_token=')
    if (!hasToken) {
      router.replace('/admin/login')
    } else {
      setAuthed(true)
    }
  }, [router])

  if (authed === null) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="text-[rgba(255,255,255,0.3)] text-sm">Se verifică accesul...</div>
      </div>
    )
  }

  return <AdminShell>{children}</AdminShell>
}
