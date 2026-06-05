"use client";

import { useState, useEffect } from 'react';
import { fetchFromGas, postToGas } from '@/lib/api';
import TransaksiForm from '@/components/TransaksiForm';
import EditTransaksiGridModal from '@/components/EditTransaksiGridModal';
import { Download, Plus, Filter, Search, Calendar, Wallet, ArrowUpRight, ArrowDownRight, FileText, CheckCircle2, Edit2, Trash2 } from 'lucide-react';

// Format Rupiah helper
const formatRp = (num) => {
  if (num === null || num === undefined) return 'Rp 0';
  return 'Rp ' + num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

export default function TransaksiPage() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [showEditModal, setShowEditModal] = useState(false);

  // Excel filter state variables
  const [filtersState, setFiltersState] = useState({
    tanggal: { checked: null },
    keterangan: { checked: null },
    pic: { checked: null },
    no_id: { checked: null },
    debit: { checked: null },
    kredit: { checked: null },
    saldo_akhir: { checked: null }
  });
  const [sortCol, setSortCol] = useState(null);
  const [sortDir, setSortDir] = useState(null);
  const [activeFilterCol, setActiveFilterCol] = useState(null);
  const [tempSearch, setTempSearch] = useState('');
  const [tempChecked, setTempChecked] = useState(new Set());

  // Date formatter DD-MM-YYYY
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const cleanStr = String(dateStr).includes('T') ? dateStr.split('T')[0] : dateStr;
    const parts = cleanStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return cleanStr;
  };

  useEffect(() => {
    const handleOutsideClick = () => {
      setActiveFilterCol(null);
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, []);
  
  // Date range state in local timezone to avoid UTC boundary offset bugs
  const getLocalDateString = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getDates = () => {
    const today = new Date();
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(today.getDate() - 7);
    return {
      start: getLocalDateString(oneWeekAgo),
      end: getLocalDateString(today)
    };
  };
  
  const defaultDates = getDates();
  const [startDate, setStartDate] = useState(defaultDates.start);
  const [endDate, setEndDate] = useState(defaultDates.end);
  
  // Summary state
  const [summary, setSummary] = useState({
    total_debit: 0,
    total_kredit: 0,
    saldo_awal: 0,
    saldo_akhir: 0,
    total: 0
  });

  const loadData = async (start = startDate, end = endDate) => {
    setLoading(true);
    try {
      if (!process.env.NEXT_PUBLIC_GAS_URL) {
        // Dummy data fallback
        setTransactions([
          { _row: 3, tanggal: '2026-06-03', keterangan: 'Beli ATK', pic: 'Fita', no_id: '123', debit: 'Rp -', kredit: 'Rp50.000', saldo_akhir: 'Rp2.694.606' }
        ]);
        setSummary({
          total_debit: 0,
          total_kredit: 50000,
          saldo_awal: 2744606,
          saldo_akhir: 2694606,
          total: 1
        });
        setLoading(false);
        return;
      }
      
      const res = await fetchFromGas('listCash', { dari: start, sampai: end });
      if (res.success) {
        setTransactions([...res.data.data].reverse()); // Show newest first
        setSummary({
          total_debit: res.data.total_debit || 0,
          total_kredit: res.data.total_kredit || 0,
          saldo_awal: res.data.saldo_awal || 0,
          saldo_akhir: res.data.saldo_akhir || 0,
          total: res.data.total || 0
        });
        setSelectedRows(new Set()); // Reset selections
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSelected = async () => {
    if (!confirm(`Apakah Anda yakin ingin menghapus ${selectedRows.size} transaksi terpilih? Tindakan ini akan menghapus data di Google Sheet dan menghitung ulang seluruh saldo kas.`)) return;
    
    setLoading(true);
    try {
      const res = await postToGas('deleteCash', { rows: Array.from(selectedRows) });
      if (res.success) {
        alert(res.message || 'Transaksi terpilih berhasil dihapus!');
        setSelectedRows(new Set());
        loadData(startDate, endDate);
      } else {
        alert(`Gagal menghapus: ${res.error}`);
      }
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    loadData(startDate, endDate);
  };

  const handleExportCSV = () => {
    let csvContent = "sep=;\n";
    csvContent += "No.;Tanggal;Keterangan;PIC;No. ID;Lampiran;Debit;Kredit;Saldo Akhir\n";
    
    filteredData.forEach((t, idx) => {
      const no = idx + 1;
      const tgl = formatDate(t.tanggal);
      const ket = t.debit_value > 0 
        ? (t.keterangan_debit || t.keterangan || '') 
        : (t.keterangan_kredit || t.keterangan || '');
      const pic = t.pic || '';
      const noId = t.no_id || '';
      const lampiran = t.lampiran || '';
      const deb = t.debit !== 'Rp -' ? t.debit : '';
      const kre = t.kredit !== 'Rp -' ? t.kredit : '';
      const sal = t.saldo_akhir || '';
      
      const clean = (str) => String(str).replace(/;/g, ',').replace(/\n/g, ' ');
      
      csvContent += `${no};${clean(tgl)};${clean(ket)};${clean(pic)};${clean(noId)};${clean(lampiran)};${clean(deb)};${clean(kre)};${clean(sal)}\n`;
    });
    
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Laporan_Kas_${startDate}_to_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getCellValue = (row, col) => {
    switch (col) {
      case 'tanggal':
        return formatDate(row.tanggal);
      case 'keterangan':
        return row.debit_value > 0 
          ? (row.keterangan_debit || row.keterangan || '-') 
          : (row.keterangan_kredit || row.keterangan || '-');
      case 'pic':
        return row.pic || '-';
      case 'no_id':
        return row.no_id || '-';
      case 'debit':
        return row.debit !== 'Rp -' ? row.debit : '(Kosong)';
      case 'kredit':
        return row.kredit !== 'Rp -' ? row.kredit : '(Kosong)';
      case 'saldo_akhir':
        return row.saldo_akhir || '-';
      default:
        return '';
    }
  };

  const filteredData = transactions.filter(t => {
    const matchesSearch = searchTerm === '' || 
      (t.keterangan && t.keterangan.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (t.keterangan_debit && t.keterangan_debit.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (t.keterangan_kredit && t.keterangan_kredit.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (t.pic && t.pic.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (t.no_id && String(t.no_id).toLowerCase().includes(searchTerm.toLowerCase()));
      
    if (!matchesSearch) return false;
    
    for (const col of ['tanggal', 'keterangan', 'pic', 'no_id', 'debit', 'kredit', 'saldo_akhir']) {
      const checkedValues = filtersState[col]?.checked;
      if (checkedValues) {
        const val = getCellValue(t, col);
        if (!checkedValues.has(val)) {
          return false;
        }
      }
    }
    return true;
  });

  // Apply sorting
  if (sortCol && sortDir) {
    filteredData.sort((a, b) => {
      let valA = getCellValue(a, sortCol);
      let valB = getCellValue(b, sortCol);
      
      if (['debit', 'kredit', 'saldo_akhir'].includes(sortCol)) {
        const parseNum = (str) => {
          if (str === '(Kosong)' || str === '-' || !str) return 0;
          const clean = str.replace(/[^0-9-]/g, '');
          return parseInt(clean, 10) || 0;
        };
        const numA = parseNum(valA);
        const numB = parseNum(valB);
        return sortDir === 'asc' ? numA - numB : numB - numA;
      }
      
      if (sortCol === 'tanggal') {
        const dateA = a.tanggal ? new Date(a.tanggal) : new Date(0);
        const dateB = b.tanggal ? new Date(b.tanggal) : new Date(0);
        return sortDir === 'asc' ? dateA - dateB : dateB - dateA;
      }
      
      valA = String(valA).toLowerCase();
      valB = String(valB).toLowerCase();
      if (valA < valB) return sortDir === 'asc' ? -1 : 1;
      if (valA > valB) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }

  const renderHeaderWithFilter = (label, colName) => {
    const isFilterActive = filtersState[colName]?.checked !== null;
    const isSorted = sortCol === colName;
    const isDropdownOpen = activeFilterCol === colName;
    
    const uniqueValues = Array.from(new Set(transactions.map(t => getCellValue(t, colName)))).sort();
    
    return (
      <th className="excel-header-cell" style={{ position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.25rem' }}>
          <span>{label}</span>
          <button 
            type="button"
            className={`excel-filter-trigger ${isFilterActive || isSorted ? 'active' : ''} no-print`}
            onClick={(e) => {
              e.stopPropagation();
              if (isDropdownOpen) {
                setActiveFilterCol(null);
              } else {
                setTempSearch('');
                setTempChecked(filtersState[colName]?.checked ? new Set(filtersState[colName].checked) : new Set(uniqueValues));
                setActiveFilterCol(colName);
              }
            }}
          >
            <Filter size={10} />
          </button>
        </div>
        
        {isDropdownOpen && (
          <div className="excel-filter-dropdown" style={{ display: 'block' }} onClick={e => e.stopPropagation()}>
            <div 
              className="excel-filter-option" 
              onClick={() => {
                setSortCol(colName);
                setSortDir('asc');
                setActiveFilterCol(null);
              }}
            >
              <span>Urutkan A-Z</span>
            </div>
            <div 
              className="excel-filter-option" 
              onClick={() => {
                setSortCol(colName);
                setSortDir('desc');
                setActiveFilterCol(null);
              }}
            >
              <span>Urutkan Z-A</span>
            </div>
            
            <div style={{ borderTop: '1px solid var(--border)', margin: '4px 0' }}></div>
            
            <input 
              type="text" 
              className="excel-filter-search" 
              placeholder="Cari..." 
              value={tempSearch}
              onChange={e => setTempSearch(e.target.value)}
            />
            
            <div className="excel-filter-list">
              <label className="excel-filter-item">
                <input 
                  type="checkbox" 
                  checked={tempChecked.size === uniqueValues.length}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setTempChecked(new Set(uniqueValues));
                    } else {
                      setTempChecked(new Set());
                    }
                  }}
                />
                <span style={{ fontWeight: 'bold' }}>(Pilih Semua)</span>
              </label>
              
              {uniqueValues
                .filter(val => String(val).toLowerCase().includes(tempSearch.toLowerCase()))
                .map((val, idx) => (
                  <label key={idx} className="excel-filter-item">
                    <input 
                      type="checkbox" 
                      checked={tempChecked.has(val)}
                      onChange={(e) => {
                        const newChecked = new Set(tempChecked);
                        if (e.target.checked) {
                          newChecked.add(val);
                        } else {
                          newChecked.delete(val);
                        }
                        setTempChecked(newChecked);
                      }}
                    />
                    <span>{val}</span>
                  </label>
                ))
              }
            </div>
            
            <div className="excel-filter-actions">
              <button 
                type="button" 
                className="btn btn-secondary" 
                style={{ padding: '2px 6px', fontSize: '0.7rem', height: 'auto' }}
                onClick={() => {
                  const newState = { ...filtersState };
                  newState[colName] = { checked: null };
                  setFiltersState(newState);
                  setActiveFilterCol(null);
                }}
              >
                Hapus
              </button>
              <button 
                type="button" 
                className="btn btn-secondary" 
                style={{ padding: '2px 6px', fontSize: '0.7rem', height: 'auto' }}
                onClick={() => setActiveFilterCol(null)}
              >
                Batal
              </button>
              <button 
                type="button" 
                className="btn btn-primary" 
                style={{ padding: '2px 6px', fontSize: '0.7rem', height: 'auto', backgroundColor: 'var(--primary)' }}
                onClick={() => {
                  const newState = { ...filtersState };
                  if (tempChecked.size === uniqueValues.length) {
                    newState[colName] = { checked: null };
                  } else {
                    newState[colName] = { checked: tempChecked };
                  }
                  setFiltersState(newState);
                  setActiveFilterCol(null);
                }}
              >
                OK
              </button>
            </div>
          </div>
        )}
      </th>
    );
  };

  return (
    <div>
      {/* Professional Print Header */}
      <div className="print-header print-only">
        <h1 className="print-title">PT Berkah Amanah Bersama Jaya Makmur</h1>
        <h2 className="print-subtitle">LAPORAN TRANSAKSI KAS KECIL</h2>
        <p className="print-period">Periode: {formatDate(startDate)} s/d {formatDate(endDate)}</p>
        <div className="print-divider"></div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }} className="no-print">
        <div>
          <h2>Data Transaksi Kas (Kas_log)</h2>
          <p>Kelola pencatatan kas masuk dan keluar secara dinamis</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn btn-secondary" onClick={handleExportCSV}>
            <Download size={18} /> Export Excel
          </button>
          <button className="btn btn-secondary" onClick={() => window.print()}>
            <FileText size={18} /> Cetak PDF
          </button>
          <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
            <Plus size={18} /> {showForm ? 'Tutup Form' : 'Transaksi Baru'}
          </button>
        </div>
      </div>

      {showForm && (
        <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
          <TransaksiForm onSuccess={() => {
            setShowForm(false);
            loadData(startDate, endDate);
          }} />
        </div>
      )}

      {/* Summary Metrics Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        {/* Saldo Awal */}
        <div className="glass-card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--primary)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.5rem', fontWeight: 500 }}>
            <span>Saldo Awal</span>
            <Wallet size={16} />
          </div>
          <h3 style={{ fontSize: '1.25rem', color: 'var(--text-primary)' }}>{formatRp(summary.saldo_awal)}</h3>
        </div>

        {/* Total Debit */}
        <div className="glass-card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--success)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.5rem', fontWeight: 500 }}>
            <span>Total Uang Masuk</span>
            <ArrowUpRight size={16} style={{ color: 'var(--success)' }} />
          </div>
          <h3 style={{ fontSize: '1.25rem', color: 'var(--success)' }}>{formatRp(summary.total_debit)}</h3>
        </div>

        {/* Total Kredit */}
        <div className="glass-card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--danger)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.5rem', fontWeight: 500 }}>
            <span>Total Uang Keluar</span>
            <ArrowDownRight size={16} style={{ color: 'var(--danger)' }} />
          </div>
          <h3 style={{ fontSize: '1.25rem', color: 'var(--danger)' }}>{formatRp(summary.total_kredit)}</h3>
        </div>

        {/* Saldo Akhir */}
        <div className="glass-card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--text-primary)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.5rem', fontWeight: 500 }}>
            <span>Saldo Akhir</span>
            <CheckCircle2 size={16} />
          </div>
          <h3 style={{ fontSize: '1.25rem', color: 'var(--text-primary)', fontWeight: 700 }}>{formatRp(summary.saldo_akhir)}</h3>
        </div>

        {/* Jumlah Baris */}
        <div className="glass-card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--text-tertiary)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.5rem', fontWeight: 500 }}>
            <span>Jumlah Baris</span>
            <FileText size={16} />
          </div>
          <h3 style={{ fontSize: '1.25rem', color: 'var(--text-secondary)' }}>{summary.total} data</h3>
        </div>
      </div>

      {/* Date Filter Controls */}
      <div className="glass-card" style={{ padding: '1.25rem', marginBottom: '2rem' }}>
        <form onSubmit={handleFilterSubmit} style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-end' }}>
          <div style={{ flex: '1 1 200px' }}>
            <label className="input-label" style={{ marginBottom: '0.25rem', display: 'block', fontSize: '0.85rem' }}>Tanggal Awal</label>
            <input 
              type="date" 
              className="input-field" 
              style={{ marginBottom: 0 }}
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
            />
          </div>
          <div style={{ flex: '1 1 200px' }}>
            <label className="input-label" style={{ marginBottom: '0.25rem', display: 'block', fontSize: '0.85rem' }}>Tanggal Akhir</label>
            <input 
              type="date" 
              className="input-field" 
              style={{ marginBottom: 0 }}
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-secondary" style={{ padding: '0.6rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Calendar size={18} /> Terapkan Filter
          </button>
        </form>
      </div>

      {/* Transactions List */}
      <div className="glass-card" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <div style={{ position: 'relative', width: '300px' }}>
            <Search size={18} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-tertiary)' }} />
            <input 
              type="text" 
              className="input-field" 
              placeholder="Cari keterangan, PIC, No. ID..." 
              style={{ paddingLeft: '2.5rem', marginBottom: 0 }}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="excel-table-container">
          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Memuat data...</div>
          ) : (
            <table className="excel-table">
              <thead>
                <tr>
                  <th style={{ width: '35px' }}>No.</th>
                  <th style={{ width: '40px' }} className="no-print">
                    <input 
                      type="checkbox"
                      checked={filteredData.length > 0 && filteredData.every(t => selectedRows.has(t._row))}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedRows(new Set(filteredData.map(t => t._row)));
                        } else {
                          setSelectedRows(new Set());
                        }
                      }}
                    />
                  </th>
                  {renderHeaderWithFilter('Tanggal', 'tanggal')}
                  {renderHeaderWithFilter('Keterangan', 'keterangan')}
                  {renderHeaderWithFilter('PIC', 'pic')}
                  {renderHeaderWithFilter('No. ID', 'no_id')}
                  <th className="no-print">Lampiran</th>
                  {renderHeaderWithFilter('Debit (Masuk)', 'debit')}
                  {renderHeaderWithFilter('Kredit (Keluar)', 'kredit')}
                  {renderHeaderWithFilter('Saldo Akhir', 'saldo_akhir')}
                </tr>
              </thead>
              <tbody>
                {filteredData.length > 0 ? filteredData.map((t, idx) => (
                  <tr key={idx} style={{ background: selectedRows.has(t._row) ? 'rgba(16, 124, 65, 0.08)' : '' }}>
                    <td className="excel-row-num">{idx + 1}</td>
                    <td className="no-print" style={{ textAlign: 'center' }}>
                      <input 
                        type="checkbox"
                        checked={selectedRows.has(t._row)}
                        onChange={(e) => {
                          const newSelected = new Set(selectedRows);
                          if (e.target.checked) {
                            newSelected.add(t._row);
                          } else {
                            newSelected.delete(t._row);
                          }
                          setSelectedRows(newSelected);
                        }}
                      />
                    </td>
                    <td>{formatDate(t.tanggal)}</td>
                    <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                      {t.debit_value > 0 ? (
                        <span>
                          <span className="badge badge-success" style={{ padding: '2px 6px', fontSize: '0.7rem', marginRight: '6px' }}>DEBIT</span>
                          {t.keterangan_debit || t.keterangan}
                        </span>
                      ) : (
                        <span>
                          <span className="badge badge-danger" style={{ padding: '2px 6px', fontSize: '0.7rem', marginRight: '6px' }}>KREDIT</span>
                          {t.keterangan_kredit || t.keterangan}
                        </span>
                      )}
                    </td>
                    <td>{t.pic || '-'}</td>
                    <td>{t.no_id || '-'}</td>
                    <td className="no-print">
                      {t.lampiran ? (
                        <a href={t.lampiran} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', textDecoration: 'underline' }}>
                          Lihat
                        </a>
                      ) : '-'}
                    </td>
                    <td style={{ textAlign: 'right', color: 'var(--success)' }}>{t.debit !== 'Rp -' ? t.debit : ''}</td>
                    <td style={{ textAlign: 'right', color: 'var(--danger)' }}>{t.kredit !== 'Rp -' ? t.kredit : ''}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{t.saldo_akhir}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="10" style={{ textAlign: 'center', padding: '2rem' }}>Tidak ada data transaksi dalam rentang ini</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Signature Block for Print */}
        <div className="print-signature-container" style={{ display: 'none' }}>
          <div>
            <div style={{ textAlign: 'center', fontSize: '9pt' }}>Dibuat oleh,</div>
            <div className="print-signature-box">Administrasi / Kasir</div>
          </div>
          <div>
            <div style={{ textAlign: 'center', fontSize: '9pt' }}>Disetujui oleh,</div>
            <div className="print-signature-box">Pimpinan</div>
          </div>
        </div>
      </div>

      {/* Floating Action Bar */}
      {selectedRows.size > 0 && (
        <div className="floating-action-bar no-print" style={{
          position: 'fixed',
          bottom: '2rem',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(255, 255, 255, 0.95)',
          border: '1px solid var(--border)',
          padding: '0.75rem 1.5rem',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)',
          display: 'flex',
          alignItems: 'center',
          gap: '1.5rem',
          zIndex: 1000
        }}>
          <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#1e293b' }}>{selectedRows.size} baris terpilih</span>
          <div style={{ borderLeft: '1px solid var(--border)', height: '20px' }}></div>
          <button 
            type="button"
            className="btn btn-primary" 
            style={{ padding: '0.4rem 1rem', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.85rem', backgroundColor: 'var(--primary)' }}
            onClick={() => setShowEditModal(true)}
          >
            <Edit2 size={14} /> Edit Grid Mode
          </button>
          <button 
            type="button"
            className="btn" 
            style={{ color: 'var(--danger)', border: '1px solid var(--danger)', padding: '0.4rem 1rem', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.85rem', background: 'transparent' }}
            onClick={handleDeleteSelected}
          >
            <Trash2 size={14} /> Hapus Terpilih
          </button>
        </div>
      )}

      <EditTransaksiGridModal 
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        selectedTransactions={transactions.filter(t => selectedRows.has(t._row))}
        onSuccess={() => {
          setSelectedRows(new Set());
          loadData(startDate, endDate);
        }}
      />
    </div>
  );
}
