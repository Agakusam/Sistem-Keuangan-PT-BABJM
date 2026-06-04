"use client";

import { useState, useEffect } from 'react';
import { fetchFromGas } from '@/lib/api';
import TransaksiForm from '@/components/TransaksiForm';
import { Download, Plus, Filter, Search, Calendar, Wallet, ArrowUpRight, ArrowDownRight, FileText, CheckCircle2 } from 'lucide-react';

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
  
  // Date range state
  const getDates = () => {
    const today = new Date();
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(today.getDate() - 7);
    return {
      start: oneWeekAgo.toISOString().split('T')[0],
      end: today.toISOString().split('T')[0]
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

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    loadData(startDate, endDate);
  };

  const handleExport = () => {
    alert(`Fitur Export akan mengekspor data dari tanggal ${startDate} sampai ${endDate}`);
  };

  const filteredData = transactions.filter(t => 
    (t.keterangan && t.keterangan.toLowerCase().includes(searchTerm.toLowerCase())) || 
    (t.pic && t.pic.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (t.no_id && String(t.no_id).toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2>Data Transaksi Kas (Kas_log)</h2>
          <p>Kelola pencatatan kas masuk dan keluar secara dinamis</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn btn-secondary" onClick={handleExport}>
            <Download size={18} /> Export Laporan
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

        <div className="table-container">
          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Memuat data...</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>Keterangan</th>
                  <th>PIC</th>
                  <th>No. ID</th>
                  <th>Lampiran</th>
                  <th style={{ textAlign: 'right' }}>Debit (Masuk)</th>
                  <th style={{ textAlign: 'right' }}>Kredit (Keluar)</th>
                  <th style={{ textAlign: 'right' }}>Saldo Akhir</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.length > 0 ? filteredData.map((t, idx) => (
                  <tr key={idx}>
                    <td>{t.tanggal}</td>
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
                    <td>
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
                    <td colSpan="8" style={{ textAlign: 'center', padding: '2rem' }}>Tidak ada data transaksi dalam rentang ini</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
