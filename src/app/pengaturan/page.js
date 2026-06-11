"use client";

import { useState, useEffect } from 'react';
import { Save, Users, UserPlus, Trash2, Shield, Settings, Server } from 'lucide-react';
import { postToGas } from '@/lib/api';

export default function PengaturanPage() {
  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [users, setUsers] = useState([]);
  const [userLoading, setUserLoading] = useState(false);
  
  // GAS config state
  const [config, setConfig] = useState({
    SIGN_DIBUAT: 'Staff Keuangan',
    SIGN_DISETUJUI: 'Manajer Keuangan',
  });

  // New user form state
  const [newUser, setNewUser] = useState({
    telegramId: '',
    username: '',
    firstName: '',
    role: 'STAFF'
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      if (res.ok && data.success) {
        setUsers(data.users);
        setIsAdmin(true);
      }
    } catch (err) {
      console.error('Not an admin or failed to fetch users:', err);
    }
  };

  const handleChange = (e) => {
    setConfig({ ...config, [e.target.name]: e.target.value });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (process.env.NEXT_PUBLIC_GAS_URL) {
        await postToGas('updateConfig', { key: 'SIGN_DIBUAT', value: config.SIGN_DIBUAT });
        await postToGas('updateConfig', { key: 'SIGN_DISETUJUI', value: config.SIGN_DISETUJUI });
      }
      alert('Pengaturan berhasil disimpan!');
    } catch (err) {
      alert('Gagal menyimpan pengaturan: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    if (!newUser.telegramId) return alert('Telegram ID wajib diisi!');
    
    setUserLoading(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert('User berhasil ditambahkan!');
        setNewUser({ telegramId: '', username: '', firstName: '', role: 'STAFF' });
        fetchUsers();
      } else {
        alert('Gagal: ' + (data.error || 'Terjadi kesalahan'));
      }
    } catch (err) {
      alert('Gagal: ' + err.message);
    } finally {
      setUserLoading(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId, role: newRole })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
      } else {
        alert('Gagal mengubah role: ' + (data.error || 'Terjadi kesalahan'));
      }
    } catch (err) {
      alert('Gagal mengubah role: ' + err.message);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!confirm('Apakah Anda yakin ingin menghapus user ini dari sistem?')) return;

    try {
      const res = await fetch(`/api/users?id=${userId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setUsers(users.filter(u => u.id !== userId));
      } else {
        alert('Gagal menghapus user: ' + (data.error || 'Terjadi kesalahan'));
      }
    } catch (err) {
      alert('Gagal menghapus user: ' + err.message);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Settings /> Pengaturan Sistem</h2>
        <p>Konfigurasi export, preferensi aplikasi, dan manajemen hak akses user.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isAdmin ? '1fr 1fr' : '1fr', gap: '1.5rem', alignItems: 'start' }}>
        
        {/* Left Column (Settings & Connections) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
          
          {/* Signatures */}
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <h3 style={{ marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Save size={18} /> Pengaturan Tanda Tangan
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              Nama-nama ini akan muncul di bagian bawah dokumen (PDF/Excel) saat melakukan export laporan transaksi.
            </p>
            
            <form onSubmit={handleSave}>
              <div className="input-group">
                <label className="input-label" htmlFor="SIGN_DIBUAT">Dibuat Oleh (Nama / Jabatan)</label>
                <input type="text" id="SIGN_DIBUAT" name="SIGN_DIBUAT" className="input-field" value={config.SIGN_DIBUAT} onChange={handleChange} />
              </div>

              <div className="input-group">
                <label className="input-label" htmlFor="SIGN_DISETUJUI">Disetujui Oleh (Nama / Jabatan)</label>
                <input type="text" id="SIGN_DISETUJUI" name="SIGN_DISETUJUI" className="input-field" value={config.SIGN_DISETUJUI} onChange={handleChange} />
              </div>

              <div style={{ marginTop: '1.5rem' }}>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  <Save size={18} /> {loading ? 'Menyimpan...' : 'Simpan Pengaturan'}
                </button>
              </div>
            </form>
          </div>

          {/* Backend Connection */}
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <h3 style={{ marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Server size={18} /> Koneksi Backend (GAS)
            </h3>
            
            <div className="input-group">
              <label className="input-label">URL Web App Google Apps Script</label>
              <input type="text" className="input-field" value={process.env.NEXT_PUBLIC_GAS_URL || 'Belum diatur (menggunakan dummy data)'} readOnly style={{ backgroundColor: 'var(--bg-main)' }} />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '0.25rem', display: 'block' }}>
                Diatur melalui environment variable <code>NEXT_PUBLIC_GAS_URL</code> di Vercel.
              </span>
            </div>
          </div>
        </div>

        {/* Right Column - User Management (Admin Only) */}
        {isAdmin && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
            
            {/* Add User Manual */}
            <div className="glass-card" style={{ padding: '1.5rem' }}>
              <h3 style={{ marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <UserPlus size={18} /> Tambah User Manual
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                Daftarkan Telegram ID staf agar mereka langsung memiliki akses menggunakan Bot Telegram tanpa harus login web dulu.
              </p>

              <form onSubmit={handleAddUser}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="input-group">
                    <label className="input-label" htmlFor="telegramId">Telegram ID (Angka)</label>
                    <input 
                      type="text" 
                      id="telegramId" 
                      className="input-field" 
                      placeholder="Contoh: 12345678" 
                      value={newUser.telegramId} 
                      onChange={e => setNewUser({ ...newUser, telegramId: e.target.value })}
                      required
                    />
                  </div>
                  <div className="input-group">
                    <label className="input-label" htmlFor="role">Role / Peran</label>
                    <select 
                      id="role" 
                      className="input-field" 
                      value={newUser.role} 
                      onChange={e => setNewUser({ ...newUser, role: e.target.value })}
                    >
                      <option value="STAFF">STAFF</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.5rem' }}>
                  <div className="input-group">
                    <label className="input-label" htmlFor="firstName">Nama Panggilan</label>
                    <input 
                      type="text" 
                      id="firstName" 
                      className="input-field" 
                      placeholder="Contoh: Budi" 
                      value={newUser.firstName} 
                      onChange={e => setNewUser({ ...newUser, firstName: e.target.value })}
                    />
                  </div>
                  <div className="input-group">
                    <label className="input-label" htmlFor="username">Username Telegram</label>
                    <input 
                      type="text" 
                      id="username" 
                      className="input-field" 
                      placeholder="Contoh: budi_tg (Tanpa @)" 
                      value={newUser.username} 
                      onChange={e => setNewUser({ ...newUser, username: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ marginTop: '1.5rem' }}>
                  <button type="submit" className="btn btn-primary" disabled={userLoading}>
                    <UserPlus size={18} /> {userLoading ? 'Menambahkan...' : 'Tambah User'}
                  </button>
                </div>
              </form>
            </div>

            {/* Users List */}
            <div className="glass-card" style={{ padding: '1.5rem' }}>
              <h3 style={{ marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Users size={18} /> Daftar Akses User ({users.length})
              </h3>
              
              <div style={{ overflowX: 'auto', marginTop: '1rem' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left', color: 'var(--text-secondary)' }}>
                      <th style={{ padding: '0.5rem' }}>User / ID</th>
                      <th style={{ padding: '0.5rem' }}>Role</th>
                      <th style={{ padding: '0.5rem', width: '50px' }}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '0.75rem 0.5rem' }}>
                          <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                            {u.firstName || u.username || 'No Name'}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                            ID: {u.telegramId} {u.username ? `@${u.username}` : ''}
                          </div>
                        </td>
                        <td style={{ padding: '0.75rem 0.5rem' }}>
                          {u.telegramId === 'admin' ? (
                            <span style={{ color: 'var(--primary)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                              <Shield size={14} /> SYSTEM ADMIN
                            </span>
                          ) : (
                            <select 
                              value={u.role} 
                              onChange={e => handleRoleChange(u.id, e.target.value)}
                              style={{ 
                                background: 'var(--bg-main)', 
                                border: '1px solid var(--border)', 
                                color: 'var(--text-primary)', 
                                borderRadius: '0.25rem',
                                padding: '0.25rem 0.5rem' 
                              }}
                            >
                              <option value="STAFF">STAFF</option>
                              <option value="ADMIN">ADMIN</option>
                            </select>
                          )}
                        </td>
                        <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>
                          {u.telegramId !== 'admin' && (
                            <button 
                              onClick={() => handleDeleteUser(u.id)}
                              style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '0.25rem' }}
                              title="Hapus Hak Akses"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
          </div>
        )}

      </div>
    </div>
  );
}
