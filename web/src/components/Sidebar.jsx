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
    if (mounted) {
      loadSaldo();
      // Poll every 30 seconds to keep it fresh
      const interval = setInterval(loadSaldo, 30000);
      return () => clearInterval(interval);
    }
  }, [mounted]);

  const navItems = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Kas_log', href: '/transaksi', icon: Wallet },
    { name: 'Bon_log', href: '/bon', icon: Receipt },
    { name: 'Laporan', href: '/laporan', icon: BarChart3 },
    { name: 'Pengaturan', href: '/pengaturan', icon: Settings },
  ];

  if (!mounted) return null;

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
      
      <div style={{ position: 'absolute', bottom: '2rem', left: '1.5rem', right: '1.5rem' }}>
        <div className="glass-card" style={{ padding: '1rem', textAlign: 'center' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>Saldo Kas Saat Ini</p>
          <h3 style={{ color: 'var(--primary)', marginTop: '0.25rem' }}>{saldo}</h3>
        </div>
      </div>
    </aside>
  );
}
