"use client";

import { useState } from 'react';
import { postToGas } from '@/lib/api';

export default function BonForm({ onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    pic: '',
    keterangan: '',
    jumlah: '',
    tanggal: new Date().toISOString().split('T')[0],
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await postToGas('addBon', {
        ...formData,
        sumber: 'WEB'
      });

      if (res.success) {
        if (onSuccess) onSuccess(res.data);
      } else {
        setError(res.error || 'Gagal menyimpan bon');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h3 style={{ marginBottom: '1.5rem' }}>Catat Bon Baru</h3>
      
      {error && <div style={{ background: 'var(--danger-bg)', color: 'var(--danger)', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem' }}>{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
        <div className="input-group">
          <label className="input-label" htmlFor="tanggal">Tanggal Bon *</label>
          <input required type="date" id="tanggal" name="tanggal" className="input-field" value={formData.tanggal} onChange={handleChange} />
        </div>

        <div className="input-group">
          <label className="input-label" htmlFor="pic">PIC (Penerima Bon) *</label>
          <input required type="text" id="pic" name="pic" className="input-field" placeholder="Nama penerima bon" value={formData.pic} onChange={handleChange} />
        </div>
      </div>

      <div className="input-group" style={{ marginBottom: '1rem' }}>
        <label className="input-label" htmlFor="keterangan">Keterangan / Tujuan Penggunaan *</label>
        <input required type="text" id="keterangan" name="keterangan" className="input-field" placeholder="Cth: Belanja konsumsi SPMB" value={formData.keterangan} onChange={handleChange} />
      </div>

      <div className="input-group">
        <label className="input-label" htmlFor="jumlah">Nominal (Rp) *</label>
        <input required type="number" id="jumlah" name="jumlah" className="input-field" placeholder="500000" min="1" value={formData.jumlah} onChange={handleChange} />
      </div>

      <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Menyimpan...' : 'Simpan Bon'}
        </button>
      </div>
    </form>
  );
}
