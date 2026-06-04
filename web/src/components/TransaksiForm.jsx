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
    jenis: '',
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

  const handleKeyDown = (e, rowIndex, field) => {
    // Enter / ArrowDown / ArrowUp navigation
    if (e.key === 'Enter') {
      e.preventDefault();
      const nextInput = document.querySelector(`[data-row="${rowIndex + 1}"][data-col="${field}"]`);
      if (nextInput) {
        nextInput.focus();
        if (nextInput.select) nextInput.select();
      }
    } else if (e.key === 'ArrowDown') {
      const nextInput = document.querySelector(`[data-row="${rowIndex + 1}"][data-col="${field}"]`);
      if (nextInput) {
        nextInput.focus();
        if (nextInput.select) nextInput.select();
      }
    } else if (e.key === 'ArrowUp' && rowIndex > 0) {
      const prevInput = document.querySelector(`[data-row="${rowIndex - 1}"][data-col="${field}"]`);
      if (prevInput) {
        prevInput.focus();
        if (prevInput.select) prevInput.select();
      }
    }
    
    // Ctrl + D: Copy value from the cell above (Fill Down)
    if (e.ctrlKey && e.key === 'd') {
      e.preventDefault();
      if (rowIndex > 0) {
        setRows(prevRows => {
          const newRows = prevRows.map(r => ({ ...r }));
          newRows[rowIndex][field] = newRows[rowIndex - 1][field];
          return newRows;
        });
      }
    }
  };

  const handlePaste = (e, rowIndex, colKey) => {
    const clipboardData = e.clipboardData || window.clipboardData;
    const pastedText = clipboardData.getData('text');
    
    if (pastedText.includes('\t') || pastedText.includes('\n')) {
      e.preventDefault();
      
      const rowsData = pastedText.split(/\r?\n/).map(row => row.split('\t'));
      const colOrder = ['jenis', 'tanggal', 'keterangan', 'jumlah', 'pic', 'no_id', 'tgl_nota'];
      const startColIndex = colOrder.indexOf(colKey);
      
      if (startColIndex === -1) return;
      
      setRows(prevRows => {
        const newRows = prevRows.map(r => ({ ...r }));
        
        rowsData.forEach((rowCells, rOffset) => {
          const targetRowIndex = rowIndex + rOffset;
          if (targetRowIndex < newRows.length) {
            rowCells.forEach((cellValue, cOffset) => {
              const targetColIndex = startColIndex + cOffset;
              if (targetColIndex < colOrder.length) {
                const colName = colOrder[targetColIndex];
                let cleanVal = cellValue.trim();
                
                if (colName === 'jenis') {
                  const upper = cleanVal.toUpperCase();
                  if (upper.startsWith('D') || upper.includes('MASUK') || upper.includes('DEB')) {
                    cleanVal = 'DEBIT';
                  } else {
                    cleanVal = 'KREDIT';
                  }
                }
                
                if (colName === 'jumlah') {
                  cleanVal = cleanVal.replace(/[^0-9.-]/g, '');
                }
                
                newRows[targetRowIndex][colName] = cleanVal;
              }
            });
          }
        });
        
        return newRows;
      });
    }
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
        transactions: validRows.map(r => {
          const cleanJenis = r.jenis.trim().toUpperCase();
          return {
            ...r,
            jenis: cleanJenis.startsWith('D') || cleanJenis.includes('MASUK') || cleanJenis.includes('DEB') ? 'DEBIT' : 'KREDIT',
            jumlah: parseFloat(r.jumlah)
          };
        })
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
                  <input 
                    type="text" 
                    className="excel-input" 
                    style={{ 
                      textTransform: 'uppercase', 
                      fontWeight: 'bold', 
                      textAlign: 'center',
                      color: row.jenis === 'DEBIT' ? 'var(--success)' : 'var(--danger)' 
                    }}
                    placeholder="KREDIT / DEBIT" 
                    value={row.jenis} 
                    data-row={idx}
                    data-col="jenis"
                    onChange={e => {
                      const val = e.target.value.toUpperCase();
                      handleCellChange(idx, 'jenis', val);
                    }}
                    onBlur={e => {
                      const val = e.target.value.trim().toUpperCase();
                      if (!val) {
                        handleCellChange(idx, 'jenis', '');
                        return;
                      }
                      if (val.startsWith('D') || val.includes('MASUK') || val.includes('DEB')) {
                        handleCellChange(idx, 'jenis', 'DEBIT');
                      } else {
                        handleCellChange(idx, 'jenis', 'KREDIT');
                      }
                    }}
                    onKeyDown={e => handleKeyDown(e, idx, 'jenis')}
                    onPaste={e => handlePaste(e, idx, 'jenis')}
                  />
                </td>
                <td>
                  <input 
                    type="date" 
                    className="excel-input" 
                    value={row.tanggal} 
                    data-row={idx}
                    data-col="tanggal"
                    onChange={e => handleCellChange(idx, 'tanggal', e.target.value)}
                    onKeyDown={e => handleKeyDown(e, idx, 'tanggal')}
                    onPaste={e => handlePaste(e, idx, 'tanggal')}
                  />
                </td>
                <td>
                  <input 
                    type="text" 
                    className="excel-input" 
                    placeholder="Contoh: Beli ATK" 
                    value={row.keterangan} 
                    data-row={idx}
                    data-col="keterangan"
                    onChange={e => handleCellChange(idx, 'keterangan', e.target.value)}
                    onKeyDown={e => handleKeyDown(e, idx, 'keterangan')}
                    onPaste={e => handlePaste(e, idx, 'keterangan')}
                  />
                </td>
                <td>
                  <input 
                    type="number" 
                    className="excel-input" 
                    placeholder="Nominal" 
                    min="0"
                    value={row.jumlah} 
                    data-row={idx}
                    data-col="jumlah"
                    onChange={e => handleCellChange(idx, 'jumlah', e.target.value)}
                    onKeyDown={e => handleKeyDown(e, idx, 'jumlah')}
                    onPaste={e => handlePaste(e, idx, 'jumlah')}
                  />
                </td>
                <td>
                  <input 
                    type="text" 
                    className="excel-input" 
                    placeholder="PIC" 
                    value={row.pic} 
                    data-row={idx}
                    data-col="pic"
                    onChange={e => handleCellChange(idx, 'pic', e.target.value)}
                    onKeyDown={e => handleKeyDown(e, idx, 'pic')}
                    onPaste={e => handlePaste(e, idx, 'pic')}
                  />
                </td>
                <td>
                  <input 
                    type="text" 
                    className="excel-input" 
                    placeholder="No. ID" 
                    value={row.no_id} 
                    data-row={idx}
                    data-col="no_id"
                    onChange={e => handleCellChange(idx, 'no_id', e.target.value)}
                    onKeyDown={e => handleKeyDown(e, idx, 'no_id')}
                    onPaste={e => handlePaste(e, idx, 'no_id')}
                  />
                </td>
                <td>
                  <input 
                    type="date" 
                    className="excel-input" 
                    value={row.tgl_nota} 
                    data-row={idx}
                    data-col="tgl_nota"
                    onChange={e => handleCellChange(idx, 'tgl_nota', e.target.value)}
                    onKeyDown={e => handleKeyDown(e, idx, 'tgl_nota')}
                    onPaste={e => handlePaste(e, idx, 'tgl_nota')}
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
