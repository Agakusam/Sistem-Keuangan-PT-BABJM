"use client";

import { useState } from 'react';
import { postToGas } from '@/lib/api';
import { Plus, Trash2 } from 'lucide-react';

// Format Rupiah helper
const formatRp = (num) => {
  if (num === null || num === undefined || isNaN(num)) return 'Rp 0';
  return 'Rp ' + Math.round(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

export default function TransaksiForm({ onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  const createEmptyRow = () => ({
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

    // Filter only rows that have keterangan and jumlah filled
    const validRows = rows.filter(r => r.keterangan.trim() !== '' && r.jumlah !== '');
    if (validRows.length === 0) {
      setError('Mohon isi minimal 1 baris transaksi (Keterangan & Nominal wajib diisi).');
      setLoading(false);
      return;
    }

    try {
      const res = await postToGas('addCashBulk', {
        transactions: validRows.map(r => ({
          ...r,
          jumlah: parseFloat(r.jumlah)
        }))
      });

      if (res.success) {
        setSuccessMsg(res.message || 'Transaksi berhasil disimpan!');
        if (onSuccess) {
          setTimeout(() => {
            onSuccess();
          }, 1000);
        }
      } else {
        setError(res.error || 'Gagal menyimpan transaksi bulk');
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
        <h3 style={{ margin: 0 }}>Input Massal Transaksi (Excel Grid Mode)</h3>
        <button 
          type="button" 
          className="btn btn-secondary" 
          onClick={handleAddTenRows}
          style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
        >
          <Plus size={14} /> Tambah 10 Baris
        </button>
      </div>

      {/* Summary Totals for Bulk Entry */}
      <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1rem', background: 'rgba(16, 124, 65, 0.05)', padding: '0.5rem 1rem', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(16, 124, 65, 0.2)', fontSize: '0.85rem', fontWeight: 600 }}>
        <div>Total Debit (Masuk): <span style={{ color: 'var(--success)' }}>{formatRp(rows.filter(r => r.jenis === 'DEBIT').reduce((sum, r) => sum + (parseFloat(r.jumlah) || 0), 0))}</span></div>
        <div style={{ borderLeft: '1px solid var(--border)' }}></div>
        <div>Total Kredit (Keluar): <span style={{ color: 'var(--danger)' }}>{formatRp(rows.filter(r => r.jenis === 'KREDIT').reduce((sum, r) => sum + (parseFloat(r.jumlah) || 0), 0))}</span></div>
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
              <th style={{ width: '120px' }}>Jenis *</th>
              <th style={{ width: '130px' }}>Tanggal *</th>
              <th style={{ minWidth: '220px' }}>Keterangan *</th>
              <th style={{ width: '130px' }}>Nominal (Rp) *</th>
              <th style={{ width: '110px' }}>PIC</th>
              <th style={{ width: '110px' }}>No. ID</th>
              <th style={{ width: '130px' }}>Tgl. Nota</th>
              <th style={{ width: '45px' }}></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={idx}>
                <td className="excel-row-num">{idx + 1}</td>
                <td>
                  <select 
                    className="excel-select" 
                    value={row.jenis} 
                    onChange={e => handleCellChange(idx, 'jenis', e.target.value)}
                  >
                    <option value="KREDIT">Keluar (Kredit)</option>
                    <option value="DEBIT">Masuk (Debit)</option>
                  </select>
                </td>
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
                    placeholder="Contoh: Beli ATK" 
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
                <td>
                  <input 
                    type="text" 
                    className="excel-input" 
                    placeholder="PIC" 
                    value={row.pic} 
                    onChange={e => handleCellChange(idx, 'pic', e.target.value)}
                  />
                </td>
                <td>
                  <input 
                    type="text" 
                    className="excel-input" 
                    placeholder="No. ID" 
                    value={row.no_id} 
                    onChange={e => handleCellChange(idx, 'no_id', e.target.value)}
                  />
                </td>
                <td>
                  <input 
                    type="date" 
                    className="excel-input" 
                    value={row.tgl_nota} 
                    onChange={e => handleCellChange(idx, 'tgl_nota', e.target.value)}
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
          {/* Footer removed, totals displayed at the top */}
        </table>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
        <button type="submit" className="btn excel-green-btn" disabled={loading}>
          {loading ? 'Menyimpan...' : `Simpan ${rows.filter(r => r.keterangan.trim() !== '' && r.jumlah !== '').length} Transaksi`}
        </button>
      </div>
    </form>
  );
}
