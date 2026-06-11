"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Wallet, 
  Receipt, 
  BarChart3, 
  Settings 
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { fetchFromGas } from '@/lib/api';

export default function Sidebar() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [saldo, setSaldo] = useState('Rp 0');
  const [user, setUser] = useState({ name: 'User', role: 'STAFF' });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    async function loadSaldo() {
      if (!process.env.NEXT_PUBLIC_GAS_URL) {
        setSaldo('Rp 2.744.606');
        return;
      }
      try {
        const res = await fetchFromGas('getSaldo');
        if (res.success) {
          setSaldo(res.data.saldo_formatted);
        }
      } catch (err) {
        console.error('Failed to load sidebar saldo:', err);
      }
    }
    
    async function loadUser() {
      try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        if (res.ok && data.success) {
          setUser(data.user);
        }
      } catch (err) {
        console.error('Failed to load user profile in sidebar:', err);
      }
    }

    if (mounted) {
      loadSaldo();
      loadUser();
      // Poll every 30 seconds to keep it fresh
      const interval = setInterval(loadSaldo, 30000);
      return () => clearInterval(interval);
    }
  }, [mounted]);

  const navItems = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Buku Kas', href: '/transaksi', icon: Wallet },
    { name: 'Buku Bon', href: '/bon', icon: Receipt },
    { name: 'Laporan', href: '/laporan', icon: BarChart3 },
    { name: 'Pengaturan', href: '/pengaturan', icon: Settings },
  ];

  if (!mounted) return null;

  const getInitials = (name) => {
    return name ? name.substring(0, 2).toUpperCase() : 'US';
  };

  return (
    <aside className="sidebar">
      <div style={{ padding: '2rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
        <h1 className="text-gradient" style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>PT BABJM</h1>
        <p style={{ fontSize: '0.875rem' }}>Sistem Petty Cash</p>
      </div>

      <nav style={{ padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {navItems.map((item) => {
          const isActive = pathname === item.href || (pathname.startsWith(item.href) && item.href !== '/');
          return (
            <Link 
              key={item.name} 
              href={item.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-md)',
                color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
                backgroundColor: isActive ? 'var(--primary-light)' : 'transparent',
                fontWeight: isActive ? '600' : '500',
                transition: 'all var(--transition-fast)',
                textDecoration: 'none'
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'var(--bg-glass-hover)';
                  e.currentTarget.style.color = 'var(--text-primary)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = 'var(--text-secondary)';
                }
              }}
            >
              <item.icon size={20} />
              {item.name}
            </Link>
          );
        })}
      </nav>
      
      <div style={{ position: 'absolute', bottom: '1rem', left: '1rem', right: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div className="glass-card" style={{ padding: '0.75rem', textAlign: 'center' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>Saldo Kas Saat Ini</p>
          <h3 style={{ color: 'var(--primary)', marginTop: '0.25rem' }}>{saldo}</h3>
        </div>
        
        {/* User profile & Online Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem', background: 'var(--bg-glass)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', fontWeight: 'bold', fontSize: '0.8rem' }}>
            {getInitials(user.name)}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left', flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={user.name}>
              {user.name}
            </span>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
              {user.role}
            </span>
          </div>
          <span className="badge badge-success" style={{ padding: '2px 6px', fontSize: '0.65rem' }}>Online</span>
        </div>
      </div>
    </aside>
  );
}
