"use client";

import { useState, useEffect } from 'react';
import { fetchFromGas, postToGas } from '@/lib/api';
import BonForm from '@/components/BonForm';
import { Plus, Search, AlertCircle, CheckCircle2, Filter, Download, FileText } from 'lucide-react';

export default function BonPage() {
  const [bons, setBons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  
  // Independent searches
  const [searchTermOutstanding, setSearchTermOutstanding] = useState('');
  const [searchTermSettled, setSearchTermSettled] = useState('');

  // Excel filters
  const [filtersStateOutstanding, setFiltersStateOutstanding] = useState({
    id_bon: { checked: null },
    tanggal: { checked: null },
    pic: { checked: null },
    keterangan: { checked: null },
    nominal: { checked: null },
    status: { checked: null }
  });
  
  const [filtersStateSettled, setFiltersStateSettled] = useState({
    id_bon: { checked: null },
    tanggal: { checked: null },
    pic: { checked: null },
    keterangan: { checked: null },
    nominal: { checked: null },
    status: { checked: null }
  });

  const [sortColOutstanding, setSortColOutstanding] = useState(null);
  const [sortDirOutstanding, setSortDirOutstanding] = useState(null);
  const [sortColSettled, setSortColSettled] = useState(null);
  const [sortDirSettled, setSortDirSettled] = useState(null);

  const [activeFilterCol, setActiveFilterCol] = useState(null); // { colName, group }
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

  const loadData = async () => {
    setLoading(true);
    try {
      if (!process.env.NEXT_PUBLIC_GAS_URL) {
        setBons([
          { id_bon: 'BON-20260603-001', tanggal: '2026-06-03', pic: 'Fita', keterangan: 'Belanja Konsumsi', nominal_value: 500000, nominal: 'Rp 500.000', status: 'BELUM', days_ago: 2, alert_level: 'NORMAL' },
          { id_bon: 'BON-20260601-002', tanggal: '2026-06-01', pic: 'Rio', keterangan: 'Servis Mobil', nominal_value: 1500000, nominal: 'Rp 1.500.000', status: 'BELUM', days_ago: 4, alert_level: 'WARNING' },
          { id_bon: 'BON-20260520-001', tanggal: '2026-05-20', pic: 'Ubay', keterangan: 'Beli Kabel AC', nominal_value: 300000, nominal: 'Rp 300.000', status: 'BELUM', days_ago: 14, alert_level: 'OVERDUE' },
        ]);
        setLoading(false);
        return;
      }
      
      const res = await fetchFromGas('listBon');
      if (res.success) {
        setBons(res.data.data.reverse()); // Show newest first
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSettle = async (id_bon) => {
    if (!confirm(`Selesaikan pertanggungan bon ${id_bon}?`)) return;
    
    try {
      const res = await postToGas('settleBon', { id_bon, sumber: 'WEB' });
      if (res.success) {
        alert(`Bon ${id_bon} berhasil dipertanggungjawabkan!`);
        loadData();
      } else {
        alert(`Gagal: ${res.error}`);
      }
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  const getCellValue = (row, col) => {
    switch (col) {
      case 'id_bon':
        return row.id_bon || '-';
      case 'tanggal':
        return formatDate(row.tanggal);
      case 'pic':
        return row.pic || '-';
      case 'keterangan':
        return row.keterangan || '-';
      case 'nominal':
        return row.nominal || '-';
      case 'status':
        return row.status === 'SUDAH' ? 'SUDAH' : (row.alert_level || 'BELUM');
      default:
        return '';
    }
  };

  const handleExportCSV = (group) => {
    const isOutstanding = group === 'outstanding';
    const dataToExport = isOutstanding ? filteredOutstanding : filteredSettled;
    const title = isOutstanding ? 'Belum_Pertanggungan' : 'Lunas';
    
    let csvContent = "sep=;\n";
    csvContent += "No.;ID Bon;Tanggal;PIC;Keterangan;Nominal;Status\n";
    
    dataToExport.forEach((b, idx) => {
      const no = idx + 1;
      const tgl = formatDate(b.tanggal);
      const id = b.id_bon || '';
      const pic = b.pic || '';
      const ket = b.keterangan || '';
      const nom = b.nominal || '';
      const stat = b.status === 'SUDAH' ? 'SUDAH' : 'BELUM';
      
      const clean = (str) => String(str).replace(/;/g, ',').replace(/\n/g, ' ');
      
      csvContent += `${no};${clean(id)};${clean(tgl)};${clean(pic)};${clean(ket)};${clean(nom)};${clean(stat)}\n`;
    });
    
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Laporan_Bon_${title}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Outstanding Data Filter & Sort
  const baseOutstanding = bons.filter(b => b.status !== 'SUDAH');
  const filteredOutstanding = baseOutstanding.filter(b => {
    const matchesSearch = searchTermOutstanding === '' ||
      (b.keterangan && b.keterangan.toLowerCase().includes(searchTermOutstanding.toLowerCase())) ||
      (b.pic && b.pic.toLowerCase().includes(searchTermOutstanding.toLowerCase())) ||
      (b.id_bon && b.id_bon.toLowerCase().includes(searchTermOutstanding.toLowerCase()));
      
    if (!matchesSearch) return false;
    
    for (const col of ['id_bon', 'tanggal', 'pic', 'keterangan', 'nominal', 'status']) {
      const checkedValues = filtersStateOutstanding[col]?.checked;
      if (checkedValues) {
        const val = getCellValue(b, col);
        if (!checkedValues.has(val)) {
          return false;
        }
      }
    }
    return true;
  });

  if (sortColOutstanding && sortDirOutstanding) {
    filteredOutstanding.sort((a, b) => {
      let valA = getCellValue(a, sortColOutstanding);
      let valB = getCellValue(b, sortColOutstanding);
      
      if (sortColOutstanding === 'nominal') {
        const parseNum = (str) => {
          if (!str || str === '-') return 0;
          const clean = str.replace(/[^0-9-]/g, '');
          return parseInt(clean, 10) || 0;
        };
        const numA = parseNum(valA);
        const numB = parseNum(valB);
        return sortDirOutstanding === 'asc' ? numA - numB : numB - numA;
      }
      
      if (sortColOutstanding === 'tanggal') {
        const dateA = a.tanggal ? new Date(a.tanggal) : new Date(0);
        const dateB = b.tanggal ? new Date(b.tanggal) : new Date(0);
        return sortDirOutstanding === 'asc' ? dateA - dateB : dateB - dateA;
      }
      
      valA = String(valA).toLowerCase();
      valB = String(valB).toLowerCase();
      if (valA < valB) return sortDirOutstanding === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirOutstanding === 'asc' ? 1 : -1;
      return 0;
    });
  }

  // Settled Data Filter & Sort
  const baseSettled = bons.filter(b => b.status === 'SUDAH');
  const filteredSettled = baseSettled.filter(b => {
    const matchesSearch = searchTermSettled === '' ||
      (b.keterangan && b.keterangan.toLowerCase().includes(searchTermSettled.toLowerCase())) ||
      (b.pic && b.pic.toLowerCase().includes(searchTermSettled.toLowerCase())) ||
      (b.id_bon && b.id_bon.toLowerCase().includes(searchTermSettled.toLowerCase()));
      
    if (!matchesSearch) return false;
    
    for (const col of ['id_bon', 'tanggal', 'pic', 'keterangan', 'nominal', 'status']) {
      const checkedValues = filtersStateSettled[col]?.checked;
      if (checkedValues) {
        const val = getCellValue(b, col);
        if (!checkedValues.has(val)) {
          return false;
        }
      }
    }
    return true;
  });

  if (sortColSettled && sortDirSettled) {
    filteredSettled.sort((a, b) => {
      let valA = getCellValue(a, sortColSettled);
      let valB = getCellValue(b, sortColSettled);
      
      if (sortColSettled === 'nominal') {
        const parseNum = (str) => {
          if (!str || str === '-') return 0;
          const clean = str.replace(/[^0-9-]/g, '');
          return parseInt(clean, 10) || 0;
        };
        const numA = parseNum(valA);
        const numB = parseNum(valB);
        return sortDirSettled === 'asc' ? numA - numB : numB - numA;
      }
      
      if (sortColSettled === 'tanggal') {
        const dateA = a.tanggal ? new Date(a.tanggal) : new Date(0);
        const dateB = b.tanggal ? new Date(b.tanggal) : new Date(0);
        return sortDirSettled === 'asc' ? dateA - dateB : dateB - dateA;
      }
      
      valA = String(valA).toLowerCase();
      valB = String(valB).toLowerCase();
      if (valA < valB) return sortDirSettled === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirSettled === 'asc' ? 1 : -1;
      return 0;
    });
  }

  const renderHeaderWithFilter = (label, colName, group) => {
    const isOutstanding = group === 'outstanding';
    const filters = isOutstanding ? filtersStateOutstanding : filtersStateSettled;
    const setFilters = isOutstanding ? setFiltersStateOutstanding : setFiltersStateSettled;
    const sortCol = isOutstanding ? sortColOutstanding : sortColSettled;
    const setSortCol = isOutstanding ? setSortColOutstanding : setSortColSettled;
    const sortDir = isOutstanding ? sortDirOutstanding : sortDirSettled;
    const setSortDir = isOutstanding ? setSortDirOutstanding : setSortDirSettled;
    
    const isFilterActive = filters[colName]?.checked !== null;
    const isSorted = sortCol === colName;
    const isDropdownOpen = activeFilterCol?.colName === colName && activeFilterCol?.group === group;
    
    const baseGroupData = isOutstanding 
      ? bons.filter(b => b.status !== 'SUDAH') 
      : bons.filter(b => b.status === 'SUDAH');
    const uniqueValues = Array.from(new Set(baseGroupData.map(b => getCellValue(b, colName)))).sort();
    
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
                setTempChecked(filters[colName]?.checked ? new Set(filters[colName].checked) : new Set(uniqueValues));
                setActiveFilterCol({ colName, group });
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
                  const newState = { ...filters };
                  newState[colName] = { checked: null };
                  setFilters(newState);
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
                  const newState = { ...filters };
                  if (tempChecked.size === uniqueValues.length) {
                    newState[colName] = { checked: null };
                  } else {
                    newState[colName] = { checked: tempChecked };
                  }
                  setFilters(newState);
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2>Monitoring Bon Kas</h2>
          <p>Catat dan pantau status pertanggungan bon kas</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }} className="no-print">
          <button className="btn btn-secondary" onClick={() => window.print()}>
            <FileText size={18} /> Cetak PDF
          </button>
          <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
            <Plus size={18} /> {showForm ? 'Tutup Form' : 'Catat Bon Baru'}
          </button>
        </div>
      </div>

      {showForm && (
        <div className="glass-card no-print" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
          <BonForm onSuccess={() => {
            setShowForm(false);
            loadData();
          }} />
        </div>
      )}

      {/* TABLE 1: OUTSTANDING BONS */}
      <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <h3 style={{ fontSize: '1.1rem', color: 'var(--text-primary)' }}>Belum Pertanggungan</h3>
          
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }} className="no-print">
            <div style={{ position: 'relative', width: '250px' }}>
              <Search size={16} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-tertiary)' }} />
              <input 
                type="text" 
                className="input-field" 
                placeholder="Cari bon outstanding..." 
                style={{ paddingLeft: '2.5rem', marginBottom: 0, paddingTop: '0.5rem', paddingBottom: '0.5rem' }}
                value={searchTermOutstanding}
                onChange={e => setSearchTermOutstanding(e.target.value)}
              />
            </div>
            <button className="btn btn-secondary" style={{ padding: '0.5rem 1rem' }} onClick={() => handleExportCSV('outstanding')}>
              <Download size={16} /> Export Excel
            </button>
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
                  {renderHeaderWithFilter('ID Bon', 'id_bon', 'outstanding')}
                  {renderHeaderWithFilter('Tanggal', 'tanggal', 'outstanding')}
                  {renderHeaderWithFilter('PIC', 'pic', 'outstanding')}
                  {renderHeaderWithFilter('Keterangan', 'keterangan', 'outstanding')}
                  {renderHeaderWithFilter('Nominal', 'nominal', 'outstanding')}
                  {renderHeaderWithFilter('Status', 'status', 'outstanding')}
                  <th className="no-print">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredOutstanding.length > 0 ? filteredOutstanding.map((b, idx) => (
                  <tr key={idx}>
                    <td className="excel-row-num">{idx + 1}</td>
                    <td style={{ fontWeight: 600 }}>{b.id_bon}</td>
                    <td>{formatDate(b.tanggal)}</td>
                    <td>{b.pic}</td>
                    <td>{b.keterangan}</td>
                    <td style={{ color: 'var(--primary)', fontWeight: 500 }}>{b.nominal}</td>
                    <td>
                      {b.alert_level === 'OVERDUE' ? (
                        <span className="badge badge-danger" title={`${b.days_ago} hari`}>OVERDUE ({b.days_ago}h)</span>
                      ) : b.alert_level === 'WARNING' ? (
                        <span className="badge badge-warning" title={`${b.days_ago} hari`}>WARNING ({b.days_ago}h)</span>
                      ) : (
                        <span className="badge" style={{ background: '#e2e8f0', color: '#475569' }}>BELUM ({b.days_ago}h)</span>
                      )}
                    </td>
                    <td className="no-print">
                      <button 
                        className="btn btn-success" 
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                        onClick={() => handleSettle(b.id_bon)}
                      >
                        <CheckCircle2 size={14} /> Lunaskan
                      </button>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '2rem' }}>Tidak ada data bon outstanding</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* TABLE 2: SETTLED BONS */}
      <div className="glass-card" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <h3 style={{ fontSize: '1.1rem', color: 'var(--text-primary)' }}>Sudah Pertanggungan (Lunas)</h3>
          
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }} className="no-print">
            <div style={{ position: 'relative', width: '250px' }}>
              <Search size={16} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-tertiary)' }} />
              <input 
                type="text" 
                className="input-field" 
                placeholder="Cari bon lunas..." 
                style={{ paddingLeft: '2.5rem', marginBottom: 0, paddingTop: '0.5rem', paddingBottom: '0.5rem' }}
                value={searchTermSettled}
                onChange={e => setSearchTermSettled(e.target.value)}
              />
            </div>
            <button className="btn btn-secondary" style={{ padding: '0.5rem 1rem' }} onClick={() => handleExportCSV('settled')}>
              <Download size={16} /> Export Excel
            </button>
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
                  {renderHeaderWithFilter('ID Bon', 'id_bon', 'settled')}
                  {renderHeaderWithFilter('Tanggal', 'tanggal', 'settled')}
                  {renderHeaderWithFilter('PIC', 'pic', 'settled')}
                  {renderHeaderWithFilter('Keterangan', 'keterangan', 'settled')}
                  {renderHeaderWithFilter('Nominal', 'nominal', 'settled')}
                  {renderHeaderWithFilter('Status', 'status', 'settled')}
                </tr>
              </thead>
              <tbody>
                {filteredSettled.length > 0 ? filteredSettled.map((b, idx) => (
                  <tr key={idx}>
                    <td className="excel-row-num">{idx + 1}</td>
                    <td style={{ fontWeight: 600 }}>{b.id_bon}</td>
                    <td>{formatDate(b.tanggal)}</td>
                    <td>{b.pic}</td>
                    <td>{b.keterangan}</td>
                    <td style={{ color: 'var(--primary)', fontWeight: 500 }}>{b.nominal}</td>
                    <td>
                      <span className="badge badge-success">SUDAH</span>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '2rem' }}>Tidak ada data bon lunas</td>
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
    </div>
  );
}
