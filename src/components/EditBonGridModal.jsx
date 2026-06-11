"use client";

import { useState, useEffect } from 'react';
import { postToGas } from '@/lib/api';
import { X, Save } from 'lucide-react';

// Format Rupiah helper
const formatRp = (num) => {
  if (num === null || num === undefined || isNaN(num)) return 'Rp 0';
  return 'Rp ' + Math.round(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

export default function EditBonGridModal({ isOpen, onClose, selectedBons, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [rows, setRows] = useState([]);

  useEffect(() => {
    if (isOpen && selectedBons) {
      try {
        setRows(selectedBons.map(b => {
          const parseRpNum = (str) => {
            if (!str || str === 'Rp -' || str === '-') return 0;
            const clean = String(str).replace(/[^0-9-]/g, '');
            return parseInt(clean, 10) || 0;
          };

          const nominalVal = b.nominal_value !== undefined ? b.nominal_value : parseRpNum(b.nominal);

          const formatDateStr = (d) => {
            if (!d) return '';
            const str = String(d).trim();
            if (str.includes('T')) return str.split('T')[0];
            return str;
          };

          return {
            _row: b._row || 0,
            id_bon: b.id_bon,
            tanggal: formatDateStr(b.tanggal),
            pic: b.pic || '',
            keterangan: b.keterangan || '',
            jumlah: nominalVal || '',
            status: b.status || 'BELUM'
          };
        }));
        setError('');
      } catch (err) {
        setError('Gagal memproses data bon: ' + err.message);
      }
      setSuccessMsg('');
    }
  }, [isOpen, selectedBons]);

  if (!isOpen) return null;

  const handleCellChange = (index, field, value) => {
    setRows(prev => prev.map((row, idx) => {
      if (idx === index) {
        return { ...row, [field]: value };
      }
      return row;
    }));
  };

  const handleKeyDown = (e, rowIndex, field) => {
    const colOrder = ['tanggal', 'pic', 'keterangan', 'jumlah', 'status'];
    const currentColIndex = colOrder.indexOf(field);

    if (e.key === 'Enter') {
      e.preventDefault();
      const nextInput = document.querySelector(`[data-edit-row="${rowIndex + 1}"][data-edit-col="${field}"]`);
      if (nextInput) {
        nextInput.focus();
        if (nextInput.select) nextInput.select();
      }
    } else if (e.key === 'ArrowDown') {
      const nextInput = document.querySelector(`[data-edit-row="${rowIndex + 1}"][data-edit-col="${field}"]`);
      if (nextInput) {
        nextInput.focus();
        if (nextInput.select) nextInput.select();
      }
    } else if (e.key === 'ArrowUp' && rowIndex > 0) {
      const prevInput = document.querySelector(`[data-edit-row="${rowIndex - 1}"][data-edit-col="${field}"]`);
      if (prevInput) {
        prevInput.focus();
        if (prevInput.select) prevInput.select();
      }
    } else if (e.key === 'ArrowRight') {
      const target = e.target;
      const isAtEnd = target.selectionEnd === null || target.selectionEnd === target.value.length;
      if (isAtEnd && currentColIndex < colOrder.length - 1) {
        const nextCol = colOrder[currentColIndex + 1];
        const nextInput = document.querySelector(`[data-edit-row="${rowIndex}"][data-edit-col="${nextCol}"]`);
        if (nextInput) {
          nextInput.focus();
          if (nextInput.select) nextInput.select();
        }
      }
    } else if (e.key === 'ArrowLeft') {
      const target = e.target;
      const isAtStart = target.selectionStart === null || target.selectionStart === 0;
      if (isAtStart && currentColIndex > 0) {
        const prevCol = colOrder[currentColIndex - 1];
        const prevInput = document.querySelector(`[data-edit-row="${rowIndex}"][data-edit-col="${prevCol}"]`);
        if (prevInput) {
          prevInput.focus();
          if (prevInput.select) prevInput.select();
        }
      }
    }

    // Ctrl + D
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
      const colOrder = ['tanggal', 'pic', 'keterangan', 'jumlah', 'status'];
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

                if (colName === 'status') {
                  const upper = cleanVal.toUpperCase();
                  if (upper.startsWith('S') || upper.includes('LUNAS') || upper.includes('SUDAH')) {
                    cleanVal = 'SUDAH';
                  } else {
                    cleanVal = 'BELUM';
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMsg('');

    // Validations
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (!r.pic.trim()) {
        setError(`Baris ${i + 1}: PIC tidak boleh kosong.`);
        setLoading(false);
        return;
      }
      if (!r.keterangan.trim()) {
        setError(`Baris ${i + 1}: Keterangan tidak boleh kosong.`);
        setLoading(false);
        return;
      }
      if (r.jumlah === '' || isNaN(r.jumlah) || parseFloat(r.jumlah) <= 0) {
        setError(`Baris ${i + 1}: Nominal harus berupa angka lebih besar dari 0.`);
        setLoading(false);
        return;
      }
    }

    try {
      const res = await postToGas('editBonBulk', {
        bons: rows.map(r => ({
          ...r,
          jumlah: parseFloat(r.jumlah)
        }))
      });

      if (res.success) {
        setSuccessMsg('Perubahan bon berhasil disimpan!');
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1000);
      } else {
        setError(res.error || 'Gagal mengedit bon');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop no-print" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 9999,
      padding: '1rem'
    }}>
      <div className="modal-content glass-card" style={{ 
        maxWidth: '90vw', 
        width: '1050px', 
        padding: '1.5rem', 
        maxHeight: '90vh', 
        display: 'flex', 
        flexDirection: 'column',
        boxShadow: 'var(--shadow-2xl)',
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0 }}>Edit Bon Terpilih ({rows.length} Baris)</h3>
          <button type="button" style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Totals Summary */}
        <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1rem', background: 'rgba(16, 124, 65, 0.05)', padding: '0.5rem 1rem', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(16, 124, 65, 0.2)', fontSize: '0.85rem', fontWeight: 600 }}>
          <div>Total Nominal Bon: <span style={{ color: 'var(--primary)' }}>{formatRp(rows.reduce((sum, r) => sum + (parseFloat(r.jumlah) || 0), 0))}</span></div>
        </div>

        {error && <div style={{ background: 'var(--danger-bg)', color: 'var(--danger)', padding: '0.75rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontSize: '0.85rem' }}>{error}</div>}
        {successMsg && <div style={{ background: 'var(--success-bg)', color: 'var(--success)', padding: '0.75rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontSize: '0.85rem' }}>{successMsg}</div>}

        <div style={{ overflowX: 'auto', flex: 1, marginBottom: '1.5rem' }}>
          <table className="excel-table excel-table-green">
            <thead>
              <tr>
                <th style={{ width: '35px' }}>No.</th>
                <th style={{ width: '150px' }}>ID Bon</th>
                <th style={{ width: '130px' }}>Tanggal Bon *</th>
                <th style={{ width: '180px' }}>PIC (Penerima Bon) *</th>
                <th style={{ minWidth: '250px' }}>Keterangan / Tujuan Penggunaan *</th>
                <th style={{ width: '150px' }}>Nominal Bon (Rp) *</th>
                <th style={{ width: '120px' }}>Status *</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr key={idx}>
                  <td className="excel-row-num">{idx + 1}</td>
                  <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{row.id_bon}</td>
                  <td>
                    <input 
                      type="date" 
                      className="excel-input" 
                      value={row.tanggal} 
                      data-edit-row={idx}
                      data-edit-col="tanggal"
                      onChange={e => handleCellChange(idx, 'tanggal', e.target.value)}
                      onKeyDown={e => handleKeyDown(e, idx, 'tanggal')}
                      onPaste={e => handlePaste(e, idx, 'tanggal')}
                    />
                  </td>
                  <td>
                    <input 
                      type="text" 
                      className="excel-input" 
                      value={row.pic} 
                      data-edit-row={idx}
                      data-edit-col="pic"
                      onChange={e => handleCellChange(idx, 'pic', e.target.value)}
                      onKeyDown={e => handleKeyDown(e, idx, 'pic')}
                      onPaste={e => handlePaste(e, idx, 'pic')}
                    />
                  </td>
                  <td>
                    <input 
                      type="text" 
                      className="excel-input" 
                      value={row.keterangan} 
                      data-edit-row={idx}
                      data-edit-col="keterangan"
                      onChange={e => handleCellChange(idx, 'keterangan', e.target.value)}
                      onKeyDown={e => handleKeyDown(e, idx, 'keterangan')}
                      onPaste={e => handlePaste(e, idx, 'keterangan')}
                    />
                  </td>
                  <td>
                    <input 
                      type="number" 
                      className="excel-input" 
                      value={row.jumlah} 
                      data-edit-row={idx}
                      data-edit-col="jumlah"
                      onChange={e => handleCellChange(idx, 'jumlah', e.target.value)}
                      onKeyDown={e => handleKeyDown(e, idx, 'jumlah')}
                      onPaste={e => handlePaste(e, idx, 'jumlah')}
                    />
                  </td>
                  <td>
                    <input 
                      type="text" 
                      className="excel-input" 
                      style={{ 
                        textTransform: 'uppercase', 
                        fontWeight: 'bold', 
                        textAlign: 'center',
                        color: row.status === 'SUDAH' ? 'var(--success)' : 'var(--warning)' 
                      }}
                      placeholder="BELUM / SUDAH" 
                      value={row.status} 
                      data-edit-row={idx}
                      data-edit-col="status"
                      onChange={e => handleCellChange(idx, 'status', e.target.value.toUpperCase())}
                      onBlur={e => {
                        const val = e.target.value.trim().toUpperCase();
                        if (val.startsWith('S') || val.includes('LUNAS') || val.includes('SUDAH')) {
                          handleCellChange(idx, 'status', 'SUDAH');
                        } else {
                          handleCellChange(idx, 'status', 'BELUM');
                        }
                      }}
                      onKeyDown={e => handleKeyDown(e, idx, 'status')}
                      onPaste={e => handlePaste(e, idx, 'status')}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
            Batal
          </button>
          <button type="button" className="btn excel-green-btn" onClick={handleSubmit} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <Save size={16} /> {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
          </button>
        </div>
      </div>
    </div>
  );
}
