'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Trophy, BarChart3, Users, Star, Settings, Menu, X } from 'lucide-react'
import { useState } from 'react'
import { clsx } from 'clsx'

const NAV_ITEMS = [
  { href: '/', label: 'Clasament', icon: Trophy },
  { href: '/matches', label: 'Meciuri', icon: BarChart3 },
  { href: '/experts', label: 'Experți', icon: Star },
  { href: '/stats', label: 'Statistici', icon: BarChart3 },
  { href: '/participants', label: 'Participanți', icon: Users },
]

export function Navigation() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <nav className="sticky top-0 z-50 bg-[#0a0a0f]/95 backdrop-blur border-b border-[rgba(255,215,0,0.1)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            <div className="text-2xl">🏆</div>
            <div>
              <div className="text-sm font-bold text-gold-gradient leading-tight">CM 2026</div>
              <div className="text-[10px] text-[rgba(255,255,255,0.4)] leading-tight">Concurs Pronosticuri</div>
            </div>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={clsx(
                  'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                  pathname === href
                    ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                    : 'text-[rgba(255,255,255,0.6)] hover:text-white hover:bg-[rgba(255,255,255,0.06)]'
                )}
              >
                <Icon size={15} />
                {label}
              </Link>
            ))}
          </div>

          {/* Admin link */}
          <div className="hidden md:flex items-center gap-2">
            <Link
              href="/admin"
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-[rgba(255,255,255,0.4)] hover:text-white hover:bg-[rgba(255,255,255,0.06)] transition-all"
            >
              <Settings size={15} />
              Admin
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 rounded-lg text-[rgba(255,255,255,0.6)] hover:text-white"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-[rgba(255,215,0,0.1)] bg-[#0a0a0f]">
          <div className="px-4 py-3 space-y-1">
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={clsx(
                  'flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-all',
                  pathname === href
                    ? 'bg-yellow-500/10 text-yellow-400'
                    : 'text-[rgba(255,255,255,0.7)] hover:bg-[rgba(255,255,255,0.06)]'
                )}
              >
                <Icon size={18} />
                {label}
              </Link>
            ))}
            <Link
              href="/admin"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm text-[rgba(255,255,255,0.4)]"
            >
              <Settings size={18} />
              Admin
            </Link>
          </div>
        </div>
      )}
    </nav>
  )
}
