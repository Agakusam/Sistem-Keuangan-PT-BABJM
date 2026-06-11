"use client";

import { useState, useEffect } from 'react';
import { fetchFromGas } from '@/lib/api';
import { 
  Chart as ChartJS, 
  ArcElement, 
  Tooltip as ChartTooltip, 
  Legend as ChartLegend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title
} from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';
import { Calendar } from 'lucide-react';

ChartJS.register(ArcElement, ChartTooltip, ChartLegend, CategoryScale, LinearScale, BarElement, Title);

// Format Rupiah helper
const formatRp = (num) => {
  if (num === null || num === undefined) return 'Rp 0';
  return 'Rp ' + num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const cleanStr = String(dateStr).includes('T') ? dateStr.split('T')[0] : dateStr;
  const parts = cleanStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return cleanStr;
};

export default function LaporanPage() {
  const [rekapKas, setRekapKas] = useState(null);
  const [rekapBon, setRekapBon] = useState(null);
  const [loading, setLoading] = useState(true);

  // Date range states (defaults to first day of month to today)
  const getLocalDateString = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getDefaultDates = () => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    return {
      start: getLocalDateString(firstDay),
      end: getLocalDateString(today)
    };
  };

  const defaultDates = getDefaultDates();
  const [startDate, setStartDate] = useState(defaultDates.start);
  const [endDate, setEndDate] = useState(defaultDates.end);

  const loadData = async (start = startDate, end = endDate) => {
    setLoading(true);
    try {
      if (!process.env.NEXT_PUBLIC_GAS_URL) {
        // Dummy data fallback
        setRekapKas({
          periode: `${formatDate(start)} s.d. ${formatDate(end)}`, total_transaksi: 45,
          total_debit: 25000000, total_kredit: 18500000,
          netto: 6500000, saldo_saat_ini: 6500000
        });
        setRekapBon({
          total_bon: 15, jumlah_belum: 3, jumlah_lunas: 12,
          nominal_belum: 1200000, nominal_lunas: 5800000
        });
        setLoading(false);
        return;
      }

      const [kasRes, bonRes] = await Promise.all([
        fetchFromGas('rekapCash', { dari: start, sampai: end }),
        fetchFromGas('rekapBon')
      ]);

      if (kasRes.success) setRekapKas(kasRes.data);
      if (bonRes.success) setRekapBon(bonRes.data);
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

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Memuat laporan...</div>;

  const doughnutData = {
    labels: ['Penerimaan Kas', 'Pengeluaran Kas'],
    datasets: [{
      data: [rekapKas?.total_debit || 0, rekapKas?.total_kredit || 0],
      backgroundColor: ['rgba(16, 185, 129, 0.8)', 'rgba(239, 68, 68, 0.8)'],
      borderColor: ['rgba(16, 185, 129, 1)', 'rgba(239, 68, 68, 1)'],
      borderWidth: 1,
    }]
  };

  const bonData = {
    labels: ['Lunas', 'Belum Dipertanggungjawabkan'],
    datasets: [{
      label: 'Nominal Bon',
      data: [rekapBon?.nominal_lunas || 0, rekapBon?.nominal_belum || 0],
      backgroundColor: ['rgba(99, 102, 241, 0.8)', 'rgba(245, 158, 11, 0.8)'],
    }]
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2>Laporan & Analitik</h2>
          <p>Ringkasan transaksi kas dan perputaran bon</p>
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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>
            Rekap Kas ({formatDate(startDate)} s.d. {formatDate(endDate)})
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            <div>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)' }}>Penerimaan Kas</p>
              <p style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--success)' }}>{formatRp(rekapKas?.total_debit)}</p>
            </div>
            <div>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)' }}>Pengeluaran Kas</p>
              <p style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--danger)' }}>{formatRp(rekapKas?.total_kredit)}</p>
            </div>
            <div>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)' }}>Net Cash Flow</p>
              <p style={{ fontSize: '1.25rem', fontWeight: 600, color: (rekapKas?.netto >= 0 ? 'var(--success)' : 'var(--danger)') }}>
                {formatRp(rekapKas?.netto)}
              </p>
            </div>
            <div>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)' }}>Jumlah Transaksi</p>
              <p style={{ fontSize: '1.25rem', fontWeight: 600 }}>{rekapKas?.total_transaksi}</p>
            </div>
          </div>
          <div style={{ height: '200px', display: 'flex', justifyContent: 'center' }}>
            <Doughnut data={doughnutData} options={{ maintainAspectRatio: false }} />
          </div>
        </div>

        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>Rekap Bon Kas</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            <div>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)' }}>Bon Belum Lunas</p>
              <p style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--warning)' }}>{formatRp(rekapBon?.nominal_belum)}</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{rekapBon?.jumlah_belum} transaksi</p>
            </div>
            <div>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)' }}>Bon Lunas</p>
              <p style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--primary)' }}>{formatRp(rekapBon?.nominal_lunas)}</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{rekapBon?.jumlah_lunas} transaksi</p>
            </div>
          </div>
          <div style={{ height: '200px', display: 'flex', justifyContent: 'center' }}>
            <Bar data={bonData} options={{ maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: { display: false } } }} />
          </div>
        </div>
      </div>
    </div>
  );
}
