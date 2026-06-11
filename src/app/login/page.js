"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import TelegramLoginWidget from '@/components/TelegramLoginWidget';
import { KeyRound, Send, ArrowLeft, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const botName = process.env.NEXT_PUBLIC_BOT_USERNAME || 'babjmcakebot'; 

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

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        router.push('/');
        router.refresh();
      } else {
        setError(data.error || 'Username atau password admin salah');
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
        <h1 style={{ marginBottom: '0.5rem', color: 'var(--text-primary)', fontSize: '2rem' }}>Sistem Keuangan</h1>
        <h2 style={{ marginBottom: '2rem', fontSize: '1.25rem', color: 'var(--primary)', fontWeight: '600' }}>PT BABJM</h2>
        
        {error && (
          <div style={{ background: 'var(--danger-bg)', color: 'var(--danger)', padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '1.5rem', fontSize: '0.875rem', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ padding: '2rem 1rem', color: 'var(--primary)' }}>
            <div className="loading-spinner" style={{ margin: '0 auto 1rem auto', width: '40px', height: '40px', border: '4px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
            Memproses masuk...
          </div>
        ) : (
          <>
            {!showAdmin ? (
              <div>
                <p style={{ marginBottom: '2rem', color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: '1.5' }}>
                  Silakan login menggunakan akun Telegram Anda yang sudah terdaftar di sistem.
                </p>
                
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2.5rem' }}>
                  <TelegramLoginWidget botName={botName} onAuth={handleTelegramAuth} />
                </div>

                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
                  <button 
                    onClick={() => { setShowAdmin(true); setError(''); }}
                    style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '0.875rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', transition: 'color 0.2s' }}
                    onMouseEnter={(e) => e.target.style.color = 'var(--primary)'}
                    onMouseLeave={(e) => e.target.style.color = 'var(--text-secondary)'}
                  >
                    <KeyRound size={16} /> Login Admin (Password)
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <p style={{ marginBottom: '1.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                  Masukkan kredensial administrator Anda.
                </p>

                <form onSubmit={handleAdminLogin} style={{ textAlign: 'left' }}>
                  <div className="input-group">
                    <label className="input-label" htmlFor="username">Username</label>
                    <input 
                      type="text" 
                      id="username" 
                      className="input-field" 
                      value={username} 
                      onChange={(e) => setUsername(e.target.value)} 
                      required 
                      placeholder="admin"
                    />
                  </div>

                  <div className="input-group" style={{ marginBottom: '1.5rem' }}>
                    <label className="input-label" htmlFor="password">Password</label>
                    <div style={{ position: 'relative' }}>
                      <input 
                        type={showPassword ? 'text' : 'password'} 
                        id="password" 
                        className="input-field" 
                        value={password} 
                        onChange={(e) => setPassword(e.target.value)} 
                        required 
                        placeholder="••••••••"
                        style={{ paddingRight: '2.5rem' }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        style={{
                          position: 'absolute',
                          right: '0.75rem',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          color: 'var(--text-secondary)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '0.25rem',
                          zIndex: 10
                        }}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                    Masuk <Send size={16} />
                  </button>
                </form>

                <button 
                  onClick={() => { setShowAdmin(false); setError(''); }}
                  style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', fontSize: '0.875rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', transition: 'color 0.2s' }}
                  onMouseEnter={(e) => e.target.style.color = 'var(--text-secondary)'}
                  onMouseLeave={(e) => e.target.style.color = 'var(--text-tertiary)'}
                >
                  <ArrowLeft size={16} /> Kembali ke Telegram Login
                </button>
              </div>
            )}
          </>
        )}
      </div>
      
      <style jsx global>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
