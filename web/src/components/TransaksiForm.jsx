"use client";

import { useState } from 'react';
import { postToGas } from '@/lib/api';

export default function TransaksiForm({ onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    jenis: 'KREDIT',
    tanggal: new Date().toISOString().split('T')[0],
    keterangan: '',
    jumlah: '',
    pic: '',
    no_id: '',
    tgl_nota: '',
    tgl_penagihan: '',
    lampiran: ''
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
      const res = await postToGas('addCash', {
        ...formData,
        sumber: 'WEB'
      });

      if (res.success) {
        if (onSuccess) onSuccess(res.data);
      } else {
        setError(res.error || 'Gagal menyimpan transaksi');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h3 style={{ marginBottom: '1.5rem' }}>Input Transaksi Baru</h3>
      
      {error && <div style={{ background: 'var(--danger-bg)', color: 'var(--danger)', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem' }}>{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
        <div className="input-group">
          <label className="input-label">Jenis Transaksi *</label>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input type="radio" name="jenis" value="DEBIT" checked={formData.jenis === 'DEBIT'} onChange={handleChange} /> 
              <span style={{ color: 'var(--success)', fontWeight: 500 }}>Masuk (Debit)</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input type="radio" name="jenis" value="KREDIT" checked={formData.jenis === 'KREDIT'} onChange={handleChange} /> 
              <span style={{ color: 'var(--danger)', fontWeight: 500 }}>Keluar (Kredit)</span>
            </label>
          </div>
        </div>

        <div className="input-group">
          <label className="input-label" htmlFor="tanggal">Tanggal *</label>
          <input required type="date" id="tanggal" name="tanggal" className="input-field" value={formData.tanggal} onChange={handleChange} />
        </div>
      </div>

      <div className="input-group">
        <label className="input-label" htmlFor="keterangan">Keterangan *</label>
        <input required type="text" id="keterangan" name="keterangan" className="input-field" placeholder="Cth: Beli ATK Kantor" value={formData.keterangan} onChange={handleChange} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <div className="input-group">
          <label className="input-label" htmlFor="jumlah">Nominal (Rp) *</label>
          <input required type="number" id="jumlah" name="jumlah" className="input-field" placeholder="50000" min="1" value={formData.jumlah} onChange={handleChange} />
        </div>

        <div className="input-group">
          <label className="input-label" htmlFor="pic">PIC (Opsional)</label>
          <input type="text" id="pic" name="pic" className="input-field" placeholder="Cth: Fita" value={formData.pic} onChange={handleChange} />
        </div>

        <div className="input-group">
          <label className="input-label" htmlFor="no_id">No. ID / Referensi (Opsional)</label>
          <input type="text" id="no_id" name="no_id" className="input-field" placeholder="Cth: 1773712010" value={formData.no_id} onChange={handleChange} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
        <div className="input-group">
          <label className="input-label" htmlFor="tgl_nota">Tgl. Nota (Opsional)</label>
          <input type="date" id="tgl_nota" name="tgl_nota" className="input-field" value={formData.tgl_nota} onChange={handleChange} />
        </div>

        <div className="input-group">
          <label className="input-label" htmlFor="tgl_penagihan">Tgl. Penagihan (Opsional)</label>
          <input type="date" id="tgl_penagihan" name="tgl_penagihan" className="input-field" value={formData.tgl_penagihan} onChange={handleChange} />
        </div>
      </div>

      <div className="input-group" style={{ marginTop: '1rem' }}>
        <label className="input-label" htmlFor="lampiran">Lampiran URL/Link (Opsional)</label>
        <input type="text" id="lampiran" name="lampiran" className="input-field" placeholder="Cth: https://drive.google.com/..." value={formData.lampiran} onChange={handleChange} />
      </div>

      <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Menyimpan...' : 'Simpan Transaksi'}
        </button>
      </div>
    </form>
  );
}
