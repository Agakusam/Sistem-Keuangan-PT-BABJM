"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import TelegramLoginWidget from '@/components/TelegramLoginWidget';

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // You will need to replace this with your actual bot username without the @ symbol
  // e.g. if bot is @PettyCashBabjmBot, use 'PettyCashBabjmBot'
  const botName = process.env.NEXT_PUBLIC_BOT_USERNAME || 'YOUR_BOT_USERNAME_HERE'; 

  const handleTelegramAuth = async (user) => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/auth/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user)
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        // Success, redirect to dashboard
        router.push('/');
        router.refresh();
      } else {
        setError(data.error || 'Autentikasi gagal');
        setLoading(false);
      }
    } catch (err) {
      console.error(err);
      setError('Terjadi kesalahan jaringan');
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: 'var(--bg-main)' }}>
      <div className="glass-card" style={{ padding: '2.5rem', maxWidth: '400px', width: '100%', textAlign: 'center' }}>
        <h1 style={{ marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Sistem Keuangan</h1>
        <h2 style={{ marginBottom: '2rem', fontSize: '1.25rem', color: 'var(--text-secondary)' }}>PT BABJM</h2>
        
        <p style={{ marginBottom: '1.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          Silakan login menggunakan akun Telegram Anda yang sudah terdaftar di sistem.
        </p>

        {error && (
          <div style={{ background: 'var(--danger-bg)', color: 'var(--danger)', padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ padding: '1rem', color: 'var(--primary)' }}>Memproses login...</div>
        ) : (
          <TelegramLoginWidget botName={botName} onAuth={handleTelegramAuth} />
        )}
      </div>
    </div>
  );
}
