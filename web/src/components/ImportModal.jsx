"use client";

import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { X, Upload, Download, AlertTriangle, CheckCircle, Trash2, Plus } from 'lucide-react';
import { postToGas } from '@/lib/api';

// Format Rupiah helper
const formatRp = (num) => {
  if (num === null || num === undefined || isNaN(num)) return 'Rp 0';
  return 'Rp ' + Math.round(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

// Indonesian-aware number parsing
const parseClientAmount = (val) => {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  let s = String(val).trim().toLowerCase();
  
  if (s.match(/(\d+)\s*(rb|ribu|k)$/i)) {
    return parseInt(s, 10) * 1000;
  }
  const jtMatch = s.match(/(\d+\.?\d*)\s*(jt|juta)$/i);
  if (jtMatch) {
    return parseFloat(jtMatch[1]) * 1000000;
  }
  
  let cleaned = s.replace(/rp/i, '').replace(/\s/g, '');
  if (cleaned.includes('.') && cleaned.includes(',')) {
    cleaned = cleaned.replace(/\./g, '').replace(/,/g, '.');
  } else if (cleaned.includes(',')) {
    if (cleaned.match(/,\d{3}$/)) {
      cleaned = cleaned.replace(/,/g, '');
    } else {
      cleaned = cleaned.replace(/,/g, '.');
    }
  } else if (cleaned.includes('.')) {
    if (cleaned.match(/\.\d{3}$/) || cleaned.split('.').length > 2) {
      cleaned = cleaned.replace(/\./g, '');
    }
  }
  
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
};

// Date normalizer to YYYY-MM-DD
const parseDateToISO = (val) => {
  if (!val) return '';
  if (val instanceof Date) {
    return val.toISOString().split('T')[0];
  }
  const str = String(val).trim();
  if (str.match(/^\d{4}-\d{1,2}-\d{1,2}$/)) {
    return str;
  }
  let m = str.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (m) {
    return `${m[3]}-${String(m[2]).padStart(2, '0')}-${String(m[1]).padStart(2, '0')}`;
  }
  m = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) {
    return `${m[3]}-${String(m[2]).padStart(2, '0')}-${String(m[1]).padStart(2, '0')}`;
  }
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    return d.toISOString().split('T')[0];
  }
  return str;
};

export default function ImportModal({ isOpen, onClose, onSuccess }) {
  const [rows, setRows] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setRows([]);
      setError('');
      setSuccess('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Row validation rules
  const validateRow = (row) => {
    const errs = [];
    if (!row.tanggal) {
      errs.push('Tanggal wajib diisi');
    } else {
      const d = new Date(row.tanggal);
      if (isNaN(d.getTime())) {
        errs.push('Format tanggal tidak valid');
      }
    }

    const deb = parseClientAmount(row.debit);
    const kre = parseClientAmount(row.kredit);

    if (deb === 0 && kre === 0) {
      errs.push('Debit atau Kredit wajib diisi nominal');
    } else if (deb > 0 && kre > 0) {
      errs.push('Hanya boleh isi salah satu: Debit atau Kredit');
    } else {
      if (deb > 0 && !row.keterangan_debit?.trim()) {
        errs.push('Keterangan Debit wajib diisi');
      }
      if (kre > 0 && !row.keterangan_kredit?.trim()) {
        errs.push('Keterangan Kredit (Keterangan) wajib diisi');
      }
    }

    return {
      isValid: errs.length === 0,
      errors: errs
    };
  };

  const handleCellChange = (index, field, value) => {
    setRows(prev => prev.map((row, idx) => {
      if (idx === index) {
        return { ...row, [field]: value };
      }
      return row;
    }));
  };

  // Excel Grid keyboard navigation
  const handleKeyDown = (e, rowIndex, field) => {
    const colOrder = [
      'tanggal', 'tgl_nota', 'akun', 'keterangan_debit', 
      'keterangan_kredit', 'pic', 'no_id', 'debit', 'kredit', 
      'tgl_penagihan', 'lampiran'
    ];
    const currentColIndex = colOrder.indexOf(field);

    if (e.key === 'Enter' || e.key === 'ArrowDown') {
      e.preventDefault();
      const nextInput = document.querySelector(`[data-import-row="${rowIndex + 1}"][data-import-col="${field}"]`);
      if (nextInput) {
        nextInput.focus();
        if (nextInput.select) nextInput.select();
      }
    } else if (e.key === 'ArrowUp' && rowIndex > 0) {
      e.preventDefault();
      const prevInput = document.querySelector(`[data-import-row="${rowIndex - 1}"][data-import-col="${field}"]`);
      if (prevInput) {
        prevInput.focus();
        if (prevInput.select) prevInput.select();
      }
    } else if (e.key === 'ArrowRight') {
      const target = e.target;
      const isAtEnd = target.selectionEnd === null || target.selectionEnd === target.value.length;
      if (isAtEnd && currentColIndex < colOrder.length - 1) {
        const nextCol = colOrder[currentColIndex + 1];
        const nextInput = document.querySelector(`[data-import-row="${rowIndex}"][data-import-col="${nextCol}"]`);
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
        const prevInput = document.querySelector(`[data-import-row="${rowIndex}"][data-import-col="${prevCol}"]`);
        if (prevInput) {
          prevInput.focus();
          if (prevInput.select) prevInput.select();
        }
      }
    }

    // Ctrl + D: Copy value from cell above
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

  // Excel Grid Copy-Paste
  const handlePaste = (e, rowIndex, colKey) => {
    const clipboardData = e.clipboardData || window.clipboardData;
    const pastedText = clipboardData.getData('text');
    
    if (pastedText.includes('\t') || pastedText.includes('\n')) {
      e.preventDefault();
      
      const rowsData = pastedText.split(/\r?\n/).map(row => row.split('\t'));
      const colOrder = [
        'tanggal', 'tgl_nota', 'akun', 'keterangan_debit', 
        'keterangan_kredit', 'pic', 'no_id', 'debit', 'kredit', 
        'tgl_penagihan', 'lampiran'
      ];
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
                let val = cellValue.trim();
                if (colName === 'tanggal' || colName === 'tgl_nota' || colName === 'tgl_penagihan') {
                  val = parseDateToISO(val);
                }
                newRows[targetRowIndex][colName] = val;
              }
            });
          }
        });
        
        return newRows;
      });
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (file) => {
    setError('');
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert sheet to 2D array
        const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false });
        
        if (rawRows.length === 0) {
          setError('File Excel kosong atau tidak terbaca');
          return;
        }

        // Search for the header row containing "Tanggal" and either "Debit", "Kredit", or "Keterangan"
        let headerRowIdx = -1;
        for (let i = 0; i < rawRows.length; i++) {
          const row = rawRows[i];
          if (row && row.some(cell => String(cell).toLowerCase().includes('tanggal')) &&
              row.some(cell => String(cell).toLowerCase().includes('debit') || String(cell).toLowerCase().includes('kredit') || String(cell).toLowerCase().includes('keterangan'))) {
            headerRowIdx = i;
            break;
          }
        }

        if (headerRowIdx === -1) {
          setError('Format kolom tidak sesuai. Pastikan file memiliki baris header dengan kolom "Tanggal" dan "Debit"/"Kredit"');
          return;
        }

        const headers = rawRows[headerRowIdx].map(h => String(h).trim().toLowerCase());
        
        // Map headers to column indices
        const colIndices = {
          tanggal: headers.findIndex(h => h.includes('tanggal')),
          tgl_nota: headers.findIndex(h => h.includes('nota')),
          akun: headers.findIndex(h => h.includes('akun')),
          keterangan_debit: headers.findIndex(h => h.includes('keterangan') && h.includes('debit')),
          keterangan_kredit: headers.findIndex(h => (h.includes('keterangan') || h.trim() === 'keterangan') && !h.includes('debit')),
          pic: headers.findIndex(h => h.includes('pic')),
          no_id: headers.findIndex(h => h.includes('id')),
          debit: headers.findIndex(h => h.includes('debit') && !h.includes('keterangan') && !h.includes('ket.')),
          kredit: headers.findIndex(h => h.includes('kredit') && !h.includes('keterangan') && !h.includes('ket.')),
          tgl_penagihan: headers.findIndex(h => h.includes('penagihan') || h.includes('tagih')),
          lampiran: headers.findIndex(h => h.includes('lampiran') || h.includes('link'))
        };

        const parsedList = [];
        for (let i = headerRowIdx + 1; i < rawRows.length; i++) {
          const row = rawRows[i];
          if (!row || row.length === 0) continue;

          // Check if row is completely empty
          const isEmpty = row.every(cell => cell === null || cell === undefined || String(cell).trim() === '');
          if (isEmpty) continue;

          const getVal = (colKey) => {
            const idx = colIndices[colKey];
            return (idx !== undefined && idx !== -1 && row[idx] !== undefined) ? String(row[idx]).trim() : '';
          };

          const debitRaw = getVal('debit');
          const kreditRaw = getVal('kredit');
          const ketKredit = getVal('keterangan_kredit');

          // Skip structural Saldo Awal row if present
          if (ketKredit === 'Saldo Awal') {
            continue;
          }

          parsedList.push({
            tanggal: parseDateToISO(getVal('tanggal')),
            tgl_nota: parseDateToISO(getVal('tgl_nota')),
            akun: getVal('akun'),
            keterangan_debit: getVal('keterangan_debit'),
            keterangan_kredit: ketKredit,
            pic: getVal('pic'),
            no_id: getVal('no_id'),
            debit: debitRaw ? String(parseClientAmount(debitRaw)) : '',
            kredit: kreditRaw ? String(parseClientAmount(kreditRaw)) : '',
            tgl_penagihan: parseDateToISO(getVal('tgl_penagihan')),
            lampiran: getVal('lampiran')
          });
        }

        if (parsedList.length === 0) {
          setError('Tidak ditemukan baris transaksi kas yang valid untuk diimpor');
        } else {
          setRows(parsedList);
        }
      } catch (err) {
        setError('Gagal membaca file: ' + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Generate and download Excel template
  const downloadTemplate = async () => {
    try {
      const ExcelJS = (await import('exceljs')).default;
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Cash_log', {
        views: [{ showGridLines: true }]
      });

      // Set Row Heights
      worksheet.getRow(1).height = 15;
      worksheet.getRow(2).height = 30; // Title banner
      worksheet.getRow(3).height = 20; // Subtitle
      worksheet.getRow(4).height = 25; // Legend row
      worksheet.getRow(5).height = 28; // Header row
      worksheet.getRow(6).height = 22; // Sample row 1
      worksheet.getRow(7).height = 22; // Sample row 2

      // Set Column widths
      worksheet.columns = [
        { key: 'tanggal', width: 18 },
        { key: 'tgl_nota', width: 16 },
        { key: 'akun', width: 12 },
        { key: 'keterangan_debit', width: 35 },
        { key: 'keterangan_kredit', width: 35 },
        { key: 'pic', width: 15 },
        { key: 'no_id', width: 22 },
        { key: 'debit', width: 20 },
        { key: 'kredit', width: 20 },
        { key: 'saldo_akhir', width: 22 },
        { key: 'tgl_penagihan', width: 18 },
        { key: 'lampiran', width: 25 }
      ];

      // Title Banner
      worksheet.mergeCells('A2:L2');
      const titleCell = worksheet.getCell('A2');
      titleCell.value = 'PT BERKAH AMANAH BERSAMA JAYA MAKMUR (PT BABJM)';
      titleCell.font = { name: 'Segoe UI', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
      titleCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF107C41' } // Professional Excel Green
      };
      titleCell.alignment = { vertical: 'middle', horizontal: 'center' };

      // Subtitle
      worksheet.mergeCells('A3:L3');
      const subtitleCell = worksheet.getCell('A3');
      subtitleCell.value = 'TEMPLATE IMPORT DATA TRANSAKSI KAS KECIL (GSHEET ALIGNMENT)';
      subtitleCell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF107C41' } };
      subtitleCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE1F0E7' } // Light Green
      };
      subtitleCell.alignment = { vertical: 'middle', horizontal: 'center' };

      // Legend / Color Keys in Row 4
      worksheet.mergeCells('A4:C4');
      const leg1 = worksheet.getCell('A4');
      leg1.value = '🛑 WARNA MERAH = WAJIB DIISI';
      leg1.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FF991B1B' } };
      leg1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
      leg1.alignment = { vertical: 'middle', horizontal: 'center' };
      leg1.border = {
        top: { style: 'thin', color: { argb: 'FFEF4444' } },
        left: { style: 'thin', color: { argb: 'FFEF4444' } },
        bottom: { style: 'thin', color: { argb: 'FFEF4444' } },
        right: { style: 'thin', color: { argb: 'FFEF4444' } }
      };

      worksheet.mergeCells('D4:E4');
      const leg2 = worksheet.getCell('D4');
      leg2.value = '⚠️ WARNA KUNING = WAJIB JIKA TRANSAKSI';
      leg2.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FF92400E' } };
      leg2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
      leg2.alignment = { vertical: 'middle', horizontal: 'center' };
      leg2.border = {
        top: { style: 'thin', color: { argb: 'FFF59E0B' } },
        left: { style: 'thin', color: { argb: 'FFF59E0B' } },
        bottom: { style: 'thin', color: { argb: 'FFF59E0B' } },
        right: { style: 'thin', color: { argb: 'FFF59E0B' } }
      };

      worksheet.mergeCells('F4:I4');
      const leg3 = worksheet.getCell('F4');
      leg3.value = 'ℹ️ WARNA BIRU = OPSIONAL (BEBAS DIISI)';
      leg3.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FF0369A1' } };
      leg3.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0F2FE' } };
      leg3.alignment = { vertical: 'middle', horizontal: 'center' };
      leg3.border = {
        top: { style: 'thin', color: { argb: 'FF38BDF8' } },
        left: { style: 'thin', color: { argb: 'FF38BDF8' } },
        bottom: { style: 'thin', color: { argb: 'FF38BDF8' } },
        right: { style: 'thin', color: { argb: 'FF38BDF8' } }
      };

      worksheet.mergeCells('J4:L4');
      const leg4 = worksheet.getCell('J4');
      leg4.value = '🔒 ABU-ABU = OTOMATIS (JANGAN DIISI)';
      leg4.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FF4B5563' } };
      leg4.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } };
      leg4.alignment = { vertical: 'middle', horizontal: 'center' };
      leg4.border = {
        top: { style: 'thin', color: { argb: 'FF9CA3AF' } },
        left: { style: 'thin', color: { argb: 'FF9CA3AF' } },
        bottom: { style: 'thin', color: { argb: 'FF9CA3AF' } },
        right: { style: 'thin', color: { argb: 'FF9CA3AF' } }
      };

      // Define Headers Data & Styles
      const headers = [
        { text: 'Tanggal', type: 'required' },
        { text: 'Tgl. Nota', type: 'optional' },
        { text: 'Akun', type: 'optional' },
        { text: 'Keterangan Debit', type: 'conditional' },
        { text: 'Keterangan', type: 'conditional' }, // Keterangan Kredit in Gsheet
        { text: 'PIC', type: 'optional' },
        { text: 'NO. ID', type: 'optional' },
        { text: 'Debit', type: 'conditional' },
        { text: 'Kredit', type: 'conditional' },
        { text: 'Saldo Akhir', type: 'automatic' },
        { text: 'Tgl. Penagihan', type: 'optional' },
        { text: 'Lampiran', type: 'optional' }
      ];

      const headerRow = worksheet.getRow(5);
      headers.forEach((h, index) => {
        const cell = headerRow.getCell(index + 1);
        cell.value = h.text;
        
        // Choose styling based on field type
        let fgColor, fontColor, borderStyle;
        if (h.type === 'required') {
          fgColor = 'FFFEE2E2'; // Pastel Red
          fontColor = 'FF991B1B'; // Dark Red
          borderStyle = 'FFEF4444';
        } else if (h.type === 'conditional') {
          fgColor = 'FFFEF3C7'; // Pastel Yellow
          fontColor = 'FF92400E'; // Dark Yellow
          borderStyle = 'FFF59E0B';
        } else if (h.type === 'optional') {
          fgColor = 'FFE0F2FE'; // Pastel Blue
          fontColor = 'FF0369A1'; // Dark Blue
          borderStyle = 'FF38BDF8';
        } else if (h.type === 'automatic') {
          fgColor = 'FFE5E7EB'; // Gray
          fontColor = 'FF4B5563'; // Dark Gray
          borderStyle = 'FF9CA3AF';
        }

        cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: fontColor } };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: fgColor }
        };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = {
          top: { style: 'medium', color: { argb: borderStyle } },
          left: { style: 'thin', color: { argb: borderStyle } },
          bottom: { style: 'medium', color: { argb: borderStyle } },
          right: { style: 'thin', color: { argb: borderStyle } }
        };
      });

      // Insert Sample Row 1
      const r6 = worksheet.getRow(6);
      r6.values = ['2026-06-05', '', '', 'Pengisian Saldo Kas Kecil', '', 'Fita', 'TRX-101', 5500000, '', '', '', 'https://drive.google.com/...'];
      
      // Insert Sample Row 2
      const r7 = worksheet.getRow(7);
      r7.values = ['2026-06-05', '2026-06-05', '5012', '', 'Konsumsi Rapat Direksi', 'Budiman', 'NOTA-202', '', 120000, '', '', ''];

      // Apply cell styling to sample rows
      const borderThin = {
        top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        right: { style: 'thin', color: { argb: 'FFD1D5DB' } }
      };

      const fontData = { name: 'Segoe UI', size: 10 };

      [6, 7].forEach(rowNum => {
        const row = worksheet.getRow(rowNum);
        for (let c = 1; c <= 12; c++) {
          const cell = row.getCell(c);
          cell.font = fontData;
          cell.border = borderThin;
          
          // Alignments & formats
          if (c === 1 || c === 2 || c === 3 || c === 6 || c === 7 || c === 11) {
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
          } else if (c === 8 || c === 9 || c === 10) {
            cell.alignment = { horizontal: 'right', vertical: 'middle' };
            if (cell.value !== '' && cell.value !== null) {
              cell.numFmt = '"Rp "#,##0';
            }
          } else {
            cell.alignment = { horizontal: 'left', vertical: 'middle' };
          }
          
          // Gray out the automated saldo cell
          if (c === 10) {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFF3F4F6' }
            };
          }
        }
      });

      // Create Guide Sheet (Panduan_Pengisian)
      const wsGuide = workbook.addWorksheet('Panduan_Pengisian', {
        views: [{ showGridLines: true }]
      });
      
      wsGuide.columns = [
        { width: 25 }, // Topic
        { width: 70 }, // Instruction
        { width: 35 }  // Example
      ];

      // Set row heights for guide
      wsGuide.getRow(1).height = 15;
      wsGuide.getRow(2).height = 30; // Title banner
      wsGuide.getRow(3).height = 20;

      // Title Banner
      wsGuide.mergeCells('A2:C2');
      const guideTitle = wsGuide.getCell('A2');
      guideTitle.value = 'PANDUAN LENGKAP PENGISIAN TEMPLATE IMPORT KAS KECIL';
      guideTitle.font = { name: 'Segoe UI', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
      guideTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF107C41' } };
      guideTitle.alignment = { vertical: 'middle', horizontal: 'center' };

      // Subtitle
      wsGuide.mergeCells('A3:C3');
      const guideSubtitle = wsGuide.getCell('A3');
      guideSubtitle.value = 'Harap perhatikan ketentuan warna kolom berikut agar proses impor tidak gagal.';
      guideSubtitle.font = { name: 'Segoe UI', size: 9, italic: true, color: { argb: 'FF4B5563' } };
      guideSubtitle.alignment = { vertical: 'middle', horizontal: 'center' };

      // Write guides
      const guideData = [
        ['1. Ketentuan Umum', 'Kolom berwarna MERAH adalah kolom wajib diisi (tidak boleh kosong).', 'Tanggal (WAJIB)'],
        ['', 'Kolom berwarna KUNING wajib diisi bersesuaian dengan tipe transaksi (Debit atau Kredit).', 'Keterangan Debit & Keterangan (Kredit)'],
        ['', 'Kolom berwarna BIRU adalah kolom opsional (boleh diisi atau dikosongkan).', 'Tgl. Nota, Akun, PIC, No. ID, Tgl. Penagihan, Lampiran'],
        ['', 'Kolom berwarna ABU-ABU GELAP akan terisi secara otomatis oleh sistem (jangan diisi).', 'Saldo Akhir'],
        ['', '', ''],
        ['2. Transaksi Masuk (Debit)', 'Isi nominal uang pada kolom Debit (nominal). Hanya angka saja, tanpa Rp, titik, atau koma.', '5500000 (menjadi Rp 5.500.000)'],
        ['', 'Tulis deskripsi kas masuk pada kolom Keterangan Debit.', 'Pengisian kas dari kantor pusat'],
        ['', 'Kosongkan kolom Kredit (nominal) dan Keterangan (Kredit).', '[Kosong]'],
        ['', '', ''],
        ['3. Transaksi Keluar (Kredit)', 'Isi nominal uang pada kolom Kredit (nominal). Hanya angka saja, tanpa Rp, titik, atau koma.', '120000 (menjadi Rp 120.000)'],
        ['', 'Tulis deskripsi kas keluar pada kolom Keterangan (Kredit).', 'Pembelian konsumsi rapat tim'],
        ['', 'Kosongkan kolom Debit (nominal) dan Keterangan Debit.', '[Kosong]'],
        ['', '', ''],
        ['4. Format Tanggal', 'Gunakan format standar internasional YYYY-MM-DD atau format Indonesia DD-MM-YYYY.', '2026-06-05 atau 05-06-2026'],
        ['', '', ''],
        ['5. Lampiran Bukti Nota', 'Masukkan tautan link online (misal Google Drive, Dropbox, e-proc) dokumen nota fisik.', 'https://drive.google.com/...']
      ];

      let currentGuideRow = 5;
      guideData.forEach(rowVal => {
        const row = wsGuide.getRow(currentGuideRow);
        row.values = rowVal;
        row.height = 20;

        const cellA = row.getCell(1);
        const cellB = row.getCell(2);
        const cellC = row.getCell(3);

        // Topic formatting
        if (rowVal[0]) {
          cellA.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF1F2937' } };
          cellA.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } };
          cellA.alignment = { vertical: 'middle', horizontal: 'left' };
          cellA.border = {
            top: { style: 'thin', color: { argb: 'FF9CA3AF' } },
            bottom: { style: 'thin', color: { argb: 'FF9CA3AF' } }
          };
        } else {
          cellA.border = {};
        }

        // Rules & Examples formatting
        if (rowVal[1] || rowVal[2]) {
          cellB.font = { name: 'Segoe UI', size: 10, color: { argb: 'FF4B5563' } };
          cellB.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
          cellB.border = borderThin;

          cellC.font = { name: 'Segoe UI', size: 10, italic: true, color: { argb: 'FF047857' } };
          cellC.alignment = { vertical: 'middle', horizontal: 'left' };
          cellC.border = borderThin;
        }

        currentGuideRow++;
      });

      // Build and Download file
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'Template_Import_PettyCash.xlsx';
      anchor.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError('Gagal membuat template: ' + err.message);
    }
  };

  const handleAddRow = () => {
    setRows(prev => [...prev, {
      tanggal: new Date().toISOString().split('T')[0],
      tgl_nota: '',
      akun: '',
      keterangan_debit: '',
      keterangan_kredit: '',
      pic: '',
      no_id: '',
      debit: '',
      kredit: '',
      tgl_penagihan: '',
      lampiran: ''
    }]);
  };

  const handleDeleteRow = (index) => {
    setRows(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async () => {
    // Validate rows
    const validatedRows = rows.map(r => ({ row: r, val: validateRow(r) }));
    const validTransactions = validatedRows
      .filter(vr => vr.val.isValid)
      .map(vr => {
        const deb = parseClientAmount(vr.row.debit);
        const kre = parseClientAmount(vr.row.kredit);
        const jenis = deb > 0 ? 'DEBIT' : 'KREDIT';
        const keterangan = jenis === 'DEBIT' ? vr.row.keterangan_debit : vr.row.keterangan_kredit;
        return {
          tanggal: vr.row.tanggal,
          tgl_nota: vr.row.tgl_nota,
          akun: vr.row.akun,
          jenis: jenis,
          keterangan: keterangan,
          pic: vr.row.pic,
          no_id: vr.row.no_id,
          jumlah: jenis === 'DEBIT' ? deb : kre,
          tgl_penagihan: vr.row.tgl_penagihan,
          lampiran: vr.row.lampiran
        };
      });

    if (validTransactions.length === 0) {
      setError('Tidak ada data transaksi valid untuk diimpor. Silakan perbaiki sel yang ditandai merah terlebih dahulu.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await postToGas('importCashBulk', { transactions: validTransactions });
      if (res.success) {
        setSuccess(`Berhasil mengimpor ${validTransactions.length} transaksi kas!`);
        setTimeout(() => {
          onClose();
          if (onSuccess) onSuccess();
        }, 1200);
      } else {
        setError(res.error || 'Gagal mengimpor data ke Google Sheets');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Count validation metrics
  const validationSummary = rows.reduce((acc, r) => {
    const v = validateRow(r);
    if (v.isValid) acc.valid += 1;
    else acc.invalid += 1;
    return acc;
  }, { valid: 0, invalid: 0 });

  return (
    <div style={{
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
        maxWidth: '95%', 
        width: '1200px', 
        maxHeight: '90vh', 
        display: 'flex', 
        flexDirection: 'column', 
        padding: '1.5rem',
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-2xl)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
          <h3 style={{ margin: 0 }}>Import Laporan Kas (Cash_log)</h3>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
            <X size={20} />
          </button>
        </div>

        {rows.length === 0 ? (
          // Upload File Zone
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '2rem 1rem', alignItems: 'center' }}>
            <div 
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              style={{
                width: '100%',
                maxWidth: '600px',
                height: '220px',
                border: dragActive ? '2px dashed var(--primary)' : '2px dashed var(--border)',
                background: dragActive ? 'rgba(99, 102, 241, 0.05)' : 'transparent',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '1rem',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onClick={() => document.getElementById('file-upload-input').click()}
            >
              <Upload size={48} style={{ color: dragActive ? 'var(--primary)' : 'var(--text-tertiary)' }} />
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontWeight: 600, margin: '0 0 0.25rem 0' }}>Seret dan lepas file Excel atau CSV di sini</p>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', margin: 0 }}>atau klik untuk mencari dokumen (.xlsx, .csv)</p>
              </div>
              <input 
                id="file-upload-input"
                type="file"
                accept=".xlsx, .xls, .csv"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
            </div>

            {error && <div style={{ background: 'var(--danger-bg)', color: 'var(--danger)', padding: '0.75rem 1.25rem', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', maxWidth: '600px', width: '100%' }}>{error}</div>}

            <div style={{ borderTop: '1px solid var(--border)', width: '100%', maxWidth: '600px', margin: '0.5rem 0' }}></div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>Belum punya template file import?</p>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={downloadTemplate}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <Download size={16} /> Download Template Excel
              </button>
            </div>
          </div>
        ) : (
          // Excel Preview Grid Mode
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1, minHeight: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem', fontWeight: 600 }}>
                <div style={{ background: 'var(--success-bg)', color: 'var(--success)', padding: '4px 10px', borderRadius: 'var(--radius-sm)' }}>
                  Valid: {validationSummary.valid} baris
                </div>
                {validationSummary.invalid > 0 && (
                  <div style={{ background: 'var(--danger-bg)', color: 'var(--danger)', padding: '4px 10px', borderRadius: 'var(--radius-sm)' }}>
                    Tidak Valid: {validationSummary.invalid} baris
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={handleAddRow}
                  style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                >
                  <Plus size={14} /> Tambah Baris
                </button>
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => setRows([])}
                  style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                >
                  Ulangi Upload
                </button>
              </div>
            </div>

            <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', margin: 0 }}>
              * Ketik pada sel tabel untuk memperbaiki kesalahan input secara langsung. Ctrl+D untuk Fill Down.
            </p>

            {error && <div style={{ background: 'var(--danger-bg)', color: 'var(--danger)', padding: '0.75rem', borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }}>{error}</div>}
            {success && <div style={{ background: 'var(--success-bg)', color: 'var(--success)', padding: '0.75rem', borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }}>{success}</div>}

            {/* Scrollable grid container */}
            <div className="excel-bulk-scrollable" style={{ flex: 1, overflowY: 'auto', maxHeight: '420px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
              <table className="excel-table excel-table-green" style={{ tableLayout: 'fixed', width: '100%' }}>
                <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                  <tr>
                    <th style={{ width: '40px' }}>No.</th>
                    <th style={{ width: '50px', textAlign: 'center' }}>Status</th>
                    <th style={{ width: '120px' }}>Tanggal *</th>
                    <th style={{ width: '90px' }}>Tgl. Nota</th>
                    <th style={{ width: '80px' }}>Akun</th>
                    <th style={{ width: '160px' }}>Keterangan Debit</th>
                    <th style={{ width: '160px' }}>Keterangan (Kredit)</th>
                    <th style={{ width: '100px' }}>PIC</th>
                    <th style={{ width: '90px' }}>NO. ID</th>
                    <th style={{ width: '110px' }}>Debit (Rp)</th>
                    <th style={{ width: '110px' }}>Kredit (Rp)</th>
                    <th style={{ width: '90px' }}>Tgl Penagihan</th>
                    <th style={{ width: '130px' }}>Lampiran</th>
                    <th style={{ width: '45px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => {
                    const validation = validateRow(row);
                    return (
                      <tr key={idx} style={{ background: !validation.isValid ? 'rgba(239, 68, 68, 0.05)' : '' }}>
                        <td className="excel-row-num">{idx + 1}</td>
                        <td style={{ textAlign: 'center', padding: '0.25rem' }}>
                          {validation.isValid ? (
                            <CheckCircle size={16} style={{ color: 'var(--success)' }} title="Data valid" />
                          ) : (
                            <AlertTriangle 
                              size={16} 
                              style={{ color: 'var(--danger)' }} 
                              title={validation.errors.join('\n')} 
                            />
                          )}
                        </td>
                        <td>
                          <input 
                            type="date" 
                            className="excel-input" 
                            value={row.tanggal} 
                            data-import-row={idx}
                            data-import-col="tanggal"
                            onChange={e => handleCellChange(idx, 'tanggal', e.target.value)}
                            onKeyDown={e => handleKeyDown(e, idx, 'tanggal')}
                            onPaste={e => handlePaste(e, idx, 'tanggal')}
                          />
                        </td>
                        <td>
                          <input 
                            type="text" 
                            placeholder="DD-MM-YYYY"
                            className="excel-input" 
                            value={row.tgl_nota} 
                            data-import-row={idx}
                            data-import-col="tgl_nota"
                            onChange={e => handleCellChange(idx, 'tgl_nota', e.target.value)}
                            onKeyDown={e => handleKeyDown(e, idx, 'tgl_nota')}
                            onPaste={e => handlePaste(e, idx, 'tgl_nota')}
                          />
                        </td>
                        <td>
                          <input 
                            type="text" 
                            className="excel-input" 
                            value={row.akun} 
                            data-import-row={idx}
                            data-import-col="akun"
                            onChange={e => handleCellChange(idx, 'akun', e.target.value)}
                            onKeyDown={e => handleKeyDown(e, idx, 'akun')}
                            onPaste={e => handlePaste(e, idx, 'akun')}
                          />
                        </td>
                        <td>
                          <input 
                            type="text" 
                            className="excel-input" 
                            placeholder="Wajib jika Debit"
                            value={row.keterangan_debit} 
                            data-import-row={idx}
                            data-import-col="keterangan_debit"
                            onChange={e => handleCellChange(idx, 'keterangan_debit', e.target.value)}
                            onKeyDown={e => handleKeyDown(e, idx, 'keterangan_debit')}
                            onPaste={e => handlePaste(e, idx, 'keterangan_debit')}
                          />
                        </td>
                        <td>
                          <input 
                            type="text" 
                            className="excel-input" 
                            placeholder="Wajib jika Kredit"
                            value={row.keterangan_kredit} 
                            data-import-row={idx}
                            data-import-col="keterangan_kredit"
                            onChange={e => handleCellChange(idx, 'keterangan_kredit', e.target.value)}
                            onKeyDown={e => handleKeyDown(e, idx, 'keterangan_kredit')}
                            onPaste={e => handlePaste(e, idx, 'keterangan_kredit')}
                          />
                        </td>
                        <td>
                          <input 
                            type="text" 
                            className="excel-input" 
                            value={row.pic} 
                            data-import-row={idx}
                            data-import-col="pic"
                            onChange={e => handleCellChange(idx, 'pic', e.target.value)}
                            onKeyDown={e => handleKeyDown(e, idx, 'pic')}
                            onPaste={e => handlePaste(e, idx, 'pic')}
                          />
                        </td>
                        <td>
                          <input 
                            type="text" 
                            className="excel-input" 
                            value={row.no_id} 
                            data-import-row={idx}
                            data-import-col="no_id"
                            onChange={e => handleCellChange(idx, 'no_id', e.target.value)}
                            onKeyDown={e => handleKeyDown(e, idx, 'no_id')}
                            onPaste={e => handlePaste(e, idx, 'no_id')}
                          />
                        </td>
                        <td>
                          <input 
                            type="text" 
                            className="excel-input" 
                            style={{ textAlign: 'right' }}
                            placeholder="Debit"
                            value={row.debit} 
                            data-import-row={idx}
                            data-import-col="debit"
                            onChange={e => handleCellChange(idx, 'debit', e.target.value)}
                            onKeyDown={e => handleKeyDown(e, idx, 'debit')}
                            onPaste={e => handlePaste(e, idx, 'debit')}
                          />
                        </td>
                        <td>
                          <input 
                            type="text" 
                            className="excel-input" 
                            style={{ textAlign: 'right' }}
                            placeholder="Kredit"
                            value={row.kredit} 
                            data-import-row={idx}
                            data-import-col="kredit"
                            onChange={e => handleCellChange(idx, 'kredit', e.target.value)}
                            onKeyDown={e => handleKeyDown(e, idx, 'kredit')}
                            onPaste={e => handlePaste(e, idx, 'kredit')}
                          />
                        </td>
                        <td>
                          <input 
                            type="text" 
                            placeholder="DD-MM-YYYY"
                            className="excel-input" 
                            value={row.tgl_penagihan} 
                            data-import-row={idx}
                            data-import-col="tgl_penagihan"
                            onChange={e => handleCellChange(idx, 'tgl_penagihan', e.target.value)}
                            onKeyDown={e => handleKeyDown(e, idx, 'tgl_penagihan')}
                            onPaste={e => handlePaste(e, idx, 'tgl_penagihan')}
                          />
                        </td>
                        <td>
                          <input 
                            type="text" 
                            className="excel-input" 
                            placeholder="Link lampiran"
                            value={row.lampiran} 
                            data-import-row={idx}
                            data-import-col="lampiran"
                            onChange={e => handleCellChange(idx, 'lampiran', e.target.value)}
                            onKeyDown={e => handleKeyDown(e, idx, 'lampiran')}
                            onPaste={e => handlePaste(e, idx, 'lampiran')}
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
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', borderTop: '1px solid var(--border)', paddingTop: '0.75rem', marginTop: '0.5rem' }}>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={onClose}
                disabled={loading}
              >
                Batal
              </button>
              <button 
                type="button" 
                className="btn excel-green-btn" 
                disabled={loading || validationSummary.valid === 0}
                onClick={handleSubmit}
              >
                {loading ? 'Mengimpor...' : `Impor ${validationSummary.valid} Data Valid`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
