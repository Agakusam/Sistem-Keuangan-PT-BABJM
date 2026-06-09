"use client";

import { useState, useEffect } from 'react';
import { postToGas } from '@/lib/api';
import { X, Save } from 'lucide-react';

// Format Rupiah helper
const formatRp = (num) => {
  if (num === null || num === undefined || isNaN(num)) return 'Rp 0';
  return 'Rp ' + Math.round(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

export default function EditTransaksiGridModal({ isOpen, onClose, selectedTransactions, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [rows, setRows] = useState([]);

  useEffect(() => {
    if (isOpen && selectedTransactions) {
      try {
        setRows(selectedTransactions.map(t => {
          const parseRpNum = (str) => {
            if (!str || str === 'Rp -' || str === '-') return 0;
            const clean = String(str).replace(/[^0-9-]/g, '');
            return parseInt(clean, 10) || 0;
          };

          const debVal = t.debit_value !== undefined ? t.debit_value : parseRpNum(t.debit);
          const kreVal = t.kredit_value !== undefined ? t.kredit_value : parseRpNum(t.kredit);
          const isDebit = debVal > 0;
          const nominalVal = isDebit ? debVal : kreVal;

          const formatDateStr = (d) => {
            if (!d) return '';
            const str = String(d).trim();
            if (str.includes('T')) return str.split('T')[0];
            return str;
          };

          return {
            _row: t._row || 0,
            jenis: isDebit ? 'DEBIT' : 'KREDIT',
            tanggal: formatDateStr(t.tanggal),
            keterangan: t.keterangan || (isDebit ? t.keterangan_debit || '' : t.keterangan_kredit || ''),
            jumlah: nominalVal || '',
            pic: t.pic || '',
            no_id: t.no_id || '',
            tgl_nota: formatDateStr(t.tgl_nota),
            tgl_penagihan: formatDateStr(t.tgl_penagihan),
            lampiran: t.lampiran || '',
            akun: t.akun || ''
          };
        }));
        setError('');
      } catch (err) {
        setError('Gagal memproses data transaksi: ' + err.message);
      }
      setSuccessMsg('');
    }
  }, [isOpen, selectedTransactions]);

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
    const colOrder = ['jenis', 'tanggal', 'keterangan', 'jumlah', 'pic', 'no_id', 'tgl_nota', 'tgl_penagihan', 'akun', 'lampiran'];
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

    // Ctrl + D (Fill Down)
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
      const colOrder = ['jenis', 'tanggal', 'keterangan', 'jumlah', 'pic', 'no_id', 'tgl_nota', 'tgl_penagihan', 'akun', 'lampiran'];
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMsg('');

    // Validations
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
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
      const res = await postToGas('editCashBulk', {
        transactions: rows.map(r => ({
          ...r,
          jumlah: parseFloat(r.jumlah)
        }))
      });

      if (res.success) {
        setSuccessMsg('Perubahan transaksi berhasil disimpan!');
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1000);
      } else {
        setError(res.error || 'Gagal mengedit transaksi');
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
        maxWidth: '95vw', 
        width: '1250px', 
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
          <h3 style={{ margin: 0 }}>Edit Transaksi Kas Terpilih ({rows.length} Baris)</h3>
          <button type="button" style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Totals Summary */}
        <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1rem', background: 'rgba(16, 124, 65, 0.05)', padding: '0.5rem 1rem', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(16, 124, 65, 0.2)', fontSize: '0.85rem', fontWeight: 600 }}>
          <div>Total Debit (Masuk): <span style={{ color: 'var(--success)' }}>{formatRp(rows.filter(r => r.jenis === 'DEBIT').reduce((sum, r) => sum + (parseFloat(r.jumlah) || 0), 0))}</span></div>
          <div style={{ borderLeft: '1px solid var(--border)' }}></div>
          <div>Total Kredit (Keluar): <span style={{ color: 'var(--danger)' }}>{formatRp(rows.filter(r => r.jenis === 'KREDIT').reduce((sum, r) => sum + (parseFloat(r.jumlah) || 0), 0))}</span></div>
        </div>

        {error && <div style={{ background: 'var(--danger-bg)', color: 'var(--danger)', padding: '0.75rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontSize: '0.85rem' }}>{error}</div>}
        {successMsg && <div style={{ background: 'var(--success-bg)', color: 'var(--success)', padding: '0.75rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontSize: '0.85rem' }}>{successMsg}</div>}

        <div style={{ overflowX: 'auto', flex: 1, marginBottom: '1.5rem' }}>
          <table className="excel-table excel-table-green" style={{ minWidth: '1500px' }}>
            <thead>
              <tr>
                <th style={{ width: '35px' }}>No.</th>
                <th style={{ width: '110px' }}>Row Index</th>
                <th style={{ width: '120px' }}>Jenis *</th>
                <th style={{ width: '130px' }}>Tanggal *</th>
                <th style={{ minWidth: '220px' }}>Keterangan *</th>
                <th style={{ width: '130px' }}>Nominal (Rp) *</th>
                <th style={{ width: '110px' }}>PIC</th>
                <th style={{ width: '110px' }}>No. ID</th>
                <th style={{ width: '130px' }}>Tgl. Nota</th>
                <th style={{ width: '130px' }}>Tgl. Tagih</th>
                <th style={{ width: '100px' }}>Akun</th>
                <th style={{ minWidth: '200px' }}>Catatan</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr key={idx}>
                  <td className="excel-row-num">{idx + 1}</td>
                  <td className="excel-row-num" style={{ textAlign: 'center', fontWeight: 'bold' }}>Baris {row._row}</td>
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
                      data-edit-row={idx}
                      data-edit-col="jenis"
                      onChange={e => handleCellChange(idx, 'jenis', e.target.value.toUpperCase())}
                      onBlur={e => {
                        const val = e.target.value.trim().toUpperCase();
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
                      placeholder="Keterangan" 
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
                      placeholder="Nominal" 
                      min="0"
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
                      placeholder="PIC" 
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
                      placeholder="No. ID" 
                      value={row.no_id} 
                      data-edit-row={idx}
                      data-edit-col="no_id"
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
                      data-edit-row={idx}
                      data-edit-col="tgl_nota"
                      onChange={e => handleCellChange(idx, 'tgl_nota', e.target.value)}
                      onKeyDown={e => handleKeyDown(e, idx, 'tgl_nota')}
                      onPaste={e => handlePaste(e, idx, 'tgl_nota')}
                    />
                  </td>
                  <td>
                    <input 
                      type="date" 
                      className="excel-input" 
                      value={row.tgl_penagihan} 
                      data-edit-row={idx}
                      data-edit-col="tgl_penagihan"
                      onChange={e => handleCellChange(idx, 'tgl_penagihan', e.target.value)}
                      onKeyDown={e => handleKeyDown(e, idx, 'tgl_penagihan')}
                      onPaste={e => handlePaste(e, idx, 'tgl_penagihan')}
                    />
                  </td>
                  <td>
                    <input 
                      type="text" 
                      className="excel-input" 
                      placeholder="Akun" 
                      value={row.akun} 
                      data-edit-row={idx}
                      data-edit-col="akun"
                      onChange={e => handleCellChange(idx, 'akun', e.target.value)}
                      onKeyDown={e => handleKeyDown(e, idx, 'akun')}
                      onPaste={e => handlePaste(e, idx, 'akun')}
                    />
                  </td>
                  <td>
                    <input 
                      type="text" 
                      className="excel-input" 
                      placeholder="Catatan" 
                      value={row.lampiran} 
                      data-edit-row={idx}
                      data-edit-col="lampiran"
                      onChange={e => handleCellChange(idx, 'lampiran', e.target.value)}
                      onKeyDown={e => handleKeyDown(e, idx, 'lampiran')}
                      onPaste={e => handlePaste(e, idx, 'lampiran')}
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
