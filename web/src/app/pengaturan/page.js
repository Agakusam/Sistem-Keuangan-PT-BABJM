"use client";

import { useState } from 'react';
import { Save } from 'lucide-react';
import { postToGas } from '@/lib/api';

export default function PengaturanPage() {
  const [loading, setLoading] = useState(false);
  
  // Dummy state, in a real app fetch these on mount
  const [config, setConfig] = useState({
    SIGN_DIBUAT: 'Staff Keuangan',
    SIGN_DISETUJUI: 'Manajer Keuangan',
  });

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

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h2>Pengaturan Sistem</h2>
        <p>Konfigurasi export dan preferensi aplikasi</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem', maxWidth: '800px' }}>
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>Pengaturan Export (Tanda Tangan)</h3>
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

        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>Koneksi Backend (GAS)</h3>
          
          <div className="input-group">
            <label className="input-label">URL Web App Google Apps Script</label>
            <input type="text" className="input-field" value={process.env.NEXT_PUBLIC_GAS_URL || 'Belum diatur (menggunakan dummy data)'} readOnly style={{ backgroundColor: 'var(--bg-main)' }} />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Diatur melalui environment variable NEXT_PUBLIC_GAS_URL di Vercel.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
