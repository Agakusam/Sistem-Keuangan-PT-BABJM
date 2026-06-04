"use client";

import { useState } from 'react';
import { postToGas } from '@/lib/api';
import { Plus, Trash2 } from 'lucide-react';

// Format Rupiah helper
const formatRp = (num) => {
  if (num === null || num === undefined || isNaN(num)) return 'Rp 0';
  return 'Rp ' + Math.round(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

export default function BonForm({ onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  const createEmptyRow = () => ({
    tanggal: new Date().toISOString().split('T')[0],
    pic: '',
    keterangan: '',
    jumlah: ''
  });

  const [rows, setRows] = useState(
    Array.from({ length: 50 }, () => createEmptyRow())
  );

  const handleCellChange = (index, field, value) => {
    setRows(prev => prev.map((row, idx) => {
      if (idx === index) {
        return { ...row, [field]: value };
      }
      return row;
    }));
  };

  const handleAddTenRows = () => {
    setRows(prev => [...prev, ...Array.from({ length: 10 }, () => createEmptyRow())]);
  };

  const handleDeleteRow = (index) => {
    if (rows.length === 1) {
      setRows([createEmptyRow()]);
      return;
    }
    setRows(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMsg('');

    // Filter only rows that have PIC, Keterangan, and Nominal
    const validRows = rows.filter(r => r.pic.trim() !== '' && r.keterangan.trim() !== '' && r.jumlah !== '');
    if (validRows.length === 0) {
      setError('Mohon isi minimal 1 baris bon (PIC, Keterangan, & Nominal wajib diisi).');
      setLoading(false);
      return;
    }

    try {
      const res = await postToGas('addBonBulk', {
        bons: validRows.map(r => ({
          ...r,
          jumlah: parseFloat(r.jumlah)
        }))
      });

      if (res.success) {
        setSuccessMsg(res.message || 'Bon berhasil disimpan!');
        if (onSuccess) {
          setTimeout(() => {
            onSuccess();
          }, 1000);
        }
      } else {
        setError(res.error || 'Gagal menyimpan bon bulk');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ margin: 0 }}>Input Massal Bon Baru (Excel Grid Mode)</h3>
        <button 
          type="button" 
          className="btn btn-secondary" 
          onClick={handleAddTenRows}
          style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
        >
          <Plus size={14} /> Tambah 10 Baris
        </button>
      </div>

      <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginBottom: '1rem' }}>
        * Ketik langsung pada sel tabel untuk mengedit data seperti di Excel. Baris kosong tidak akan disimpan.
      </p>
      
      {error && <div style={{ background: 'var(--danger-bg)', color: 'var(--danger)', padding: '0.75rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontSize: '0.85rem' }}>{error}</div>}
      {successMsg && <div style={{ background: 'var(--success-bg)', color: 'var(--success)', padding: '0.75rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontSize: '0.85rem' }}>{successMsg}</div>}

      <div className="excel-bulk-scrollable" style={{ maxHeight: '400px', overflowY: 'auto' }}>
        <table className="excel-table excel-table-green">
          <thead>
            <tr>
              <th style={{ width: '35px' }}>No.</th>
              <th style={{ width: '130px' }}>Tanggal Bon *</th>
              <th style={{ width: '180px' }}>PIC (Penerima Bon) *</th>
              <th style={{ minWidth: '250px' }}>Keterangan / Tujuan Penggunaan *</th>
              <th style={{ width: '150px' }}>Nominal Bon (Rp) *</th>
              <th style={{ width: '45px' }}></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={idx}>
                <td className="excel-row-num">{idx + 1}</td>
                <td>
                  <input 
                    type="date" 
                    className="excel-input" 
                    value={row.tanggal} 
                    onChange={e => handleCellChange(idx, 'tanggal', e.target.value)}
                  />
                </td>
                <td>
                  <input 
                    type="text" 
                    className="excel-input" 
                    placeholder="Nama penerima bon" 
                    value={row.pic} 
                    onChange={e => handleCellChange(idx, 'pic', e.target.value)}
                  />
                </td>
                <td>
                  <input 
                    type="text" 
                    className="excel-input" 
                    placeholder="Contoh: Belanja bahan ATK" 
                    value={row.keterangan} 
                    onChange={e => handleCellChange(idx, 'keterangan', e.target.value)}
                  />
                </td>
                <td>
                  <input 
                    type="number" 
                    className="excel-input" 
                    placeholder="Nominal" 
                    min="0"
                    value={row.jumlah} 
                    onChange={e => handleCellChange(idx, 'jumlah', e.target.value)}
                  />
                </td>
                <td style={{ textAlign: 'center', padding: 0 }}>
                  <button 
                    type="button" 
                    onClick={() => handleDeleteRow(idx)}
                    style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', padding: '0.4rem' }}
                    title="Hapus baris"
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ fontWeight: 'bold', backgroundColor: 'rgba(99, 102, 241, 0.05)' }}>
              <td className="excel-row-num">Σ</td>
              <td colSpan="3" style={{ textAlign: 'right', paddingRight: '1rem', borderRight: 'none' }}>Total Nominal:</td>
              <td style={{ textAlign: 'right', color: 'var(--primary)', borderLeft: 'none' }}>
                {formatRp(rows.reduce((sum, r) => sum + (parseFloat(r.jumlah) || 0), 0))}
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
        <button type="submit" className="btn excel-green-btn" disabled={loading}>
          {loading ? 'Menyimpan...' : `Simpan ${rows.filter(r => r.pic.trim() !== '' && r.keterangan.trim() !== '' && r.jumlah !== '').length} Bon`}
        </button>
      </div>
    </form>
  );
}
