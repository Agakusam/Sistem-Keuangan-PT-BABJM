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

const formatRp = (num) => {
  if (num === null || num === undefined) return 'Rp 0';
  return 'Rp ' + num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

export default function LaporanPage() {
  const [rekapKas, setRekapKas] = useState(null);
  const [rekapBon, setRekapBon] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        if (!process.env.NEXT_PUBLIC_GAS_URL) {
          // Dummy data
          setRekapKas({
            periode: 'Bulan Ini', total_transaksi: 45,
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
          fetchFromGas('rekapCash'),
          fetchFromGas('rekapBon')
        ]);

        if (kasRes.success) setRekapKas(kasRes.data);
        if (bonRes.success) setRekapBon(bonRes.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Memuat laporan...</div>;

  const doughnutData = {
    labels: ['Kas Masuk', 'Kas Keluar'],
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
        <button className="btn btn-secondary">
          <Calendar size={18} /> Filter Periode
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>Rekap Kas ({rekapKas?.periode})</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            <div>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)' }}>Total Masuk</p>
              <p style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--success)' }}>{formatRp(rekapKas?.total_debit)}</p>
            </div>
            <div>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)' }}>Total Keluar</p>
              <p style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--danger)' }}>{formatRp(rekapKas?.total_kredit)}</p>
            </div>
            <div>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)' }}>Netto</p>
              <p style={{ fontSize: '1.25rem', fontWeight: 600 }}>{formatRp(rekapKas?.netto)}</p>
            </div>
            <div>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)' }}>Total Transaksi</p>
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
