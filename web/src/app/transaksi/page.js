"use client";

import { useState, useEffect } from 'react';
import { fetchFromGas, postToGas } from '@/lib/api';
import TransaksiForm from '@/components/TransaksiForm';
import EditTransaksiGridModal from '@/components/EditTransaksiGridModal';
import ImportModal from '@/components/ImportModal';
import * as XLSX from 'xlsx';
import { Download, Plus, Filter, Search, Calendar, Wallet, ArrowUpRight, ArrowDownRight, FileText, CheckCircle2, Edit2, Trash2, Upload } from 'lucide-react';

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
  const [showImportModal, setShowImportModal] = useState(false);

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

  const handleExportExcel = async () => {
    try {
      const ExcelJS = (await import('exceljs')).default;
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Cash_log', {
        views: [{ showGridLines: true }]
      });

      // Row heights
      worksheet.getRow(1).height = 15;
      worksheet.getRow(2).height = 28;
      worksheet.getRow(3).height = 20;
      worksheet.getRow(4).height = 22; // Totals row
      worksheet.getRow(5).height = 26; // Headers

      // Set Column widths (Column A is empty margin)
      worksheet.columns = [
        { key: 'empty_margin', width: 4 },      // Column A
        { key: 'tanggal', width: 14 },           // Column B
        { key: 'tgl_nota', width: 14 },          // Column C
        { key: 'akun', width: 9 },               // Column D
        { key: 'keterangan_debit', width: 28 },   // Column E (debit description - visible!)
        { key: 'keterangan_kredit', width: 45 },  // Column F (kredit description - tabbed!)
        { key: 'pic', width: 14 },               // Column G
        { key: 'no_id', width: 18 },             // Column H
        { key: 'debit', width: 18 },             // Column I
        { key: 'kredit', width: 18 },            // Column J
        { key: 'saldo_akhir', width: 20 },        // Column K
        { key: 'tgl_penagihan', width: 15 }      // Column L
      ];

      // Banner Title B2:L2
      worksheet.mergeCells('B2:L2');
      const titleCell = worksheet.getCell('B2');
      titleCell.value = 'PT BERKAH AMANAH BERSAMA JAYA MAKMUR (PT BABJM)';
      titleCell.font = { name: 'Segoe UI', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
      titleCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1A73E8' } // Professional Blue
      };
      titleCell.alignment = { vertical: 'middle', horizontal: 'center' };

      // Subtitle B3:L3
      worksheet.mergeCells('B3:L3');
      const subtitleCell = worksheet.getCell('B3');
      subtitleCell.value = `LAPORAN PETTY CASH (PERIODE: ${formatDate(startDate)} s/d ${formatDate(endDate)})`;
      subtitleCell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF1A73E8' } };
      subtitleCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE8F0FE' } // Light Blue
      };
      subtitleCell.alignment = { vertical: 'middle', horizontal: 'center' };

      // Calculate Sum of Debit and Kredit
      const totalDebit = filteredData.reduce((sum, t) => sum + (t.debit_value || 0), 0);
      const totalKredit = filteredData.reduce((sum, t) => sum + (t.kredit_value || 0), 0);

      // Add Sum Totals in Row 4 below the subtitle
      worksheet.mergeCells('B4:E4');
      const debSumCell = worksheet.getCell('B4');
      debSumCell.value = `Total Debit: Rp ${totalDebit.toLocaleString('id-ID')}`;
      debSumCell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF047857' } }; // Dark Green
      debSumCell.alignment = { vertical: 'middle', horizontal: 'left' };

      worksheet.mergeCells('F4:I4');
      const kreSumCell = worksheet.getCell('F4');
      kreSumCell.value = `Total Kredit: Rp ${totalKredit.toLocaleString('id-ID')}`;
      kreSumCell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFB91C1C' } }; // Dark Red
      kreSumCell.alignment = { vertical: 'middle', horizontal: 'left' };

      // Headers row 5 (Columns B to L)
      const headers = [
        "Tanggal", "Tgl. Nota", "Akun", "Keterangan Debit", "Keterangan", "PIC", 
        "NO. ID", "Debit", "Kredit", "Saldo Akhir", "Tgl. Penagihan"
      ];
      
      const headerRow = worksheet.getRow(5);
      headers.forEach((h, index) => {
        const colNum = index + 2; // Start at Column B (2)
        const cell = headerRow.getCell(colNum);
        cell.value = h;
        cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF1A73E8' } // Medium Blue matching screenshot
        };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF155CB0' } },
          left: { style: 'thin', color: { argb: 'FF155CB0' } },
          bottom: { style: 'medium', color: { argb: 'FF155CB0' } },
          right: { style: 'thin', color: { argb: 'FF155CB0' } }
        };
      });

      // Merge Column E (5) and F (6) headers into "Uraian"
      worksheet.mergeCells('E5:F5');
      const mergedHeader = worksheet.getCell('E5');
      mergedHeader.value = 'Uraian';
      mergedHeader.border = {
        top: { style: 'thin', color: { argb: 'FF155CB0' } },
        left: { style: 'thin', color: { argb: 'FF155CB0' } },
        bottom: { style: 'medium', color: { argb: 'FF155CB0' } }
      };
      worksheet.getCell('F5').border = {
        top: { style: 'thin', color: { argb: 'FF155CB0' } },
        right: { style: 'thin', color: { argb: 'FF155CB0' } },
        bottom: { style: 'medium', color: { argb: 'FF155CB0' } }
      };

      const borderThin = {
        top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        right: { style: 'thin', color: { argb: 'FFD1D5DB' } }
      };

      let currentRowNum = 6;
      let lastDate = null;
      let lastBalance = 0;
      let prevRowWasSeparator = false;

      filteredData.forEach(t => {
        // Check if this row is already a GSheet separator (blank structural row)
        const isGSheetSeparator = !t.tanggal && !t.debit_value && !t.kredit_value;

        if (isGSheetSeparator) {
          const row = worksheet.getRow(currentRowNum);
          row.height = 20;
          row.values = [
            '', '', '', '', '', '', '', '', null, null, t.saldo_value || 0, ''
          ];
          for (let c = 2; c <= 12; c++) {
            const cell = row.getCell(c);
            cell.border = borderThin;
            if (c === 11) { // Column K (11) is Saldo Akhir
              cell.alignment = { horizontal: 'right', vertical: 'middle' };
              cell.numFmt = '"Rp "#,##0';
            }
          }
          currentRowNum++;
          prevRowWasSeparator = true;
          lastDate = null;
          lastBalance = t.saldo_value || 0;
          return;
        }

        const dateStr = t.tanggal ? t.tanggal.split('T')[0] : '';

        // Dynamically insert separator row at date transition
        if (lastDate && dateStr && dateStr !== lastDate && !prevRowWasSeparator) {
          const sepRow = worksheet.getRow(currentRowNum);
          sepRow.height = 20;
          sepRow.values = [
            '', '', '', '', '', '', '', '', null, null, lastBalance, ''
          ];
          for (let c = 2; c <= 12; c++) {
            const cell = sepRow.getCell(c);
            cell.border = borderThin;
            if (c === 11) {
              cell.alignment = { horizontal: 'right', vertical: 'middle' };
              cell.numFmt = '"Rp "#,##0';
            }
          }
          currentRowNum++;
          prevRowWasSeparator = true;
        }

        // Write normal row
        const row = worksheet.getRow(currentRowNum);
        row.height = 20;

        const dateStrFormatted = t.tanggal ? t.tanggal.split('T')[0] : '';
        const notaDateStr = t.tgl_nota ? t.tgl_nota.split('T')[0] : '';
        const tglPenagihanStr = t.tgl_penagihan ? t.tgl_penagihan.split('T')[0] : '';
        const account = t.akun || '';
        const pic = t.pic || '';
        const noId = t.no_id || '';
        
        const debVal = t.debit_value > 0 ? t.debit_value : null;
        const kreVal = t.kredit_value > 0 ? t.kredit_value : null;
        const salVal = t.saldo_value || 0;

        const ketDeb = t.debit_value > 0 ? (t.keterangan_debit || t.keterangan || '') : '';
        const ketKre = t.kredit_value > 0 ? (t.keterangan_kredit || t.keterangan || '') : '';

        row.values = [
          '', // Column A (empty margin)
          dateStrFormatted,
          notaDateStr,
          account,
          ketDeb,
          ketKre,
          pic,
          noId,
          debVal,
          kreVal,
          salVal,
          tglPenagihanStr
        ];

        for (let c = 2; c <= 12; c++) {
          const cell = row.getCell(c);
          cell.font = { name: 'Segoe UI', size: 10 };

          // Clear middle border between E (5) and F (6)
          if (c === 5) {
            cell.border = {
              top: borderThin.top,
              bottom: borderThin.bottom,
              left: borderThin.left
            };
          } else if (c === 6) {
            cell.border = {
              top: borderThin.top,
              bottom: borderThin.bottom,
              right: borderThin.right
            };
          } else {
            cell.border = borderThin;
          }

          // Alignment & Formatting
          if (c === 2 || c === 3 || c === 4 || c === 7 || c === 8 || c === 12) {
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
          } else if (c === 9 || c === 10 || c === 11) {
            cell.alignment = { horizontal: 'right', vertical: 'middle' };
            if (cell.value !== '' && cell.value !== null) {
              cell.numFmt = '"Rp "#,##0';
            }
          } else {
            cell.alignment = { horizontal: 'left', vertical: 'middle' };
          }
        }

        currentRowNum++;
        lastDate = dateStr;
        lastBalance = salVal;
        prevRowWasSeparator = false;
      });

      // Insert final separator at the very end of list if valid data exists
      if (lastDate && !prevRowWasSeparator) {
        const sepRow = worksheet.getRow(currentRowNum);
        sepRow.height = 20;
        sepRow.values = [
          '', '', '', '', '', '', '', '', null, null, lastBalance, ''
        ];
        for (let c = 2; c <= 12; c++) {
          const cell = sepRow.getCell(c);
          cell.border = borderThin;
          if (c === 11) {
            cell.alignment = { horizontal: 'right', vertical: 'middle' };
            cell.numFmt = '"Rp "#,##0';
          }
        }
        currentRowNum++;
      }

      // Write file to buffer and download
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `Laporan_Kas_${startDate}_to_${endDate}.xlsx`;
      anchor.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export Excel failed:', err);
    }
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
          <button className="btn btn-secondary" onClick={() => setShowImportModal(true)}>
            <Upload size={18} /> Impor Excel
          </button>
          <button className="btn btn-secondary" onClick={handleExportExcel}>
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

      <ImportModal 
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSuccess={() => {
          loadData(startDate, endDate);
        }}
      />
    </div>
  );
}
