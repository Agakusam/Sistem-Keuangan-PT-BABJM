"use client";

import { useState, useEffect } from 'react';
import { fetchFromGas } from '@/lib/api';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertCircle, 
  Wallet,
  Clock
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  Legend
);

// Format Rupiah helper
const formatRp = (num) => {
  if (num === null || num === undefined) return 'Rp 0';
  return 'Rp ' + num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

// Format Date helper to DD-MM-YYYY
const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const cleanStr = String(dateStr).includes('T') ? dateStr.split('T')[0] : dateStr;
  const parts = cleanStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return cleanStr;
};

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        // Fallback dummy data if API not connected yet
        if (!process.env.NEXT_PUBLIC_GAS_URL) {
          setData({
            saldo: 2744606,
            bulan_ini: {
              total_debit: 15000000,
              total_kredit: 12255394,
              netto: 2744606
            },
            bon: { pending: 3, warning: 1, overdue: 1 },
            recent_transactions: [
              { tanggal: '2026-06-03', keterangan: 'Biaya admin', debit: 'Rp -', kredit: 'Rp10.000', saldo_akhir: 'Rp2.734.606' }
            ]
          });
          setLoading(false);
          return;
        }

        const result = await fetchFromGas('getDashboard');
        if (result.success) {
          setData(result.data);
        } else {
          setError(result.error);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  if (loading) {
    return (
      <div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
          {[1,2,3,4].map(i => <div key={i} className="glass-card skeleton" style={{ height: '120px' }}></div>)}
        </div>
        <div className="glass-card skeleton" style={{ height: '400px' }}></div>
      </div>
    );
  }

  if (error) {
    return <div className="glass-card" style={{ padding: '2rem', color: 'var(--danger)', textAlign: 'center' }}>Error: {error}</div>;
  }

  if (!data) return null;

  // Chart options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' },
      title: { display: false }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(0,0,0,0.05)' }
      },
      x: {
        grid: { display: false }
      }
    }
  };

  // Dummy chart data representing cash flow
  const chartData = {
    labels: ['1', '5', '10', '15', '20', '25', '30'],
    datasets: [
      {
        fill: true,
        label: 'Saldo Kas (Bulan Ini)',
        data: [15000000, 12000000, 10500000, 8000000, 7500000, 5000000, data.saldo],
        borderColor: 'rgb(99, 102, 241)',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        tension: 0.4
      }
    ]
  };

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        {/* Card Saldo */}
        <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 500 }}>Saldo Tersedia</span>
            <div style={{ background: 'var(--primary-light)', color: 'var(--primary)', padding: '0.5rem', borderRadius: 'var(--radius-md)' }}>
              <Wallet size={20} />
            </div>
          </div>
          <h2 style={{ fontSize: '2rem', color: 'var(--text-primary)' }}>{formatRp(data.saldo)}</h2>
        </div>

        {/* Card Kas Masuk */}
        <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 500 }}>Kas Masuk (Bulan Ini)</span>
            <div style={{ background: 'var(--success-bg)', color: 'var(--success)', padding: '0.5rem', borderRadius: 'var(--radius-md)' }}>
              <TrendingUp size={20} />
            </div>
          </div>
          <h2 style={{ fontSize: '1.5rem', color: 'var(--text-primary)' }}>{formatRp(data.bulan_ini?.total_debit)}</h2>
        </div>

        {/* Card Kas Keluar */}
        <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 500 }}>Kas Keluar (Bulan Ini)</span>
            <div style={{ background: 'var(--danger-bg)', color: 'var(--danger)', padding: '0.5rem', borderRadius: 'var(--radius-md)' }}>
              <TrendingDown size={20} />
            </div>
          </div>
          <h2 style={{ fontSize: '1.5rem', color: 'var(--text-primary)' }}>{formatRp(data.bulan_ini?.total_kredit)}</h2>
        </div>

        {/* Card Bon Pending */}
        <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 500 }}>Bon Belum Pertanggungan</span>
            <div style={{ background: 'var(--warning-bg)', color: 'var(--warning)', padding: '0.5rem', borderRadius: 'var(--radius-md)' }}>
              <Clock size={20} />
            </div>
          </div>
          <h2 style={{ fontSize: '1.75rem', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>{data.bon?.total_nominal_formatted || 'Rp 0'}</h2>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.75rem' }}>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{data.bon?.pending || 0} bon outstanding</span>
          </div>
          
          {(data.bon?.warning > 0 || data.bon?.overdue > 0) && (
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
              {data.bon?.warning > 0 && <span className="badge badge-warning"><AlertCircle size={12} style={{ marginRight: '4px' }}/> {data.bon.warning} Warning</span>}
              {data.bon?.overdue > 0 && <span className="badge badge-danger"><AlertCircle size={12} style={{ marginRight: '4px' }}/> {data.bon.overdue} Overdue</span>}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <h3 style={{ marginBottom: '1.5rem' }}>Grafik Saldo</h3>
          <div style={{ height: '300px', width: '100%' }}>
            <Line options={chartOptions} data={chartData} />
          </div>
        </div>
      </div>

      {/* 2-Column Section: Transaksi Terakhir & Bon Belum Lunas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem', marginTop: '1.5rem' }}>
        {/* Column 1: Transaksi Terakhir */}
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>Transaksi Terakhir</h3>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>Keterangan</th>
                  <th style={{ textAlign: 'right' }}>Jumlah</th>
                </tr>
              </thead>
              <tbody>
                {data.recent_transactions && data.recent_transactions.length > 0 ? (
                  data.recent_transactions.slice(0, 5).map((t, idx) => {
                    const isDebit = t.debit && t.debit !== 'Rp -';
                    const amountText = isDebit ? t.debit : t.kredit;
                    const amountColor = isDebit ? 'var(--success)' : 'var(--danger)';
                    return (
                      <tr key={idx}>
                        <td>{formatDate(t.tanggal)}</td>
                        <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{t.keterangan}</td>
                        <td style={{ textAlign: 'right', color: amountColor, fontWeight: 600 }}>{amountText}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="3" style={{ textAlign: 'center', padding: '1.5rem' }}>Tidak ada transaksi terbaru</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Column 2: Bon Belum Lunas */}
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>Bon Belum Lunas</h3>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>ID Bon</th>
                  <th>PIC</th>
                  <th>Keterangan</th>
                  <th style={{ textAlign: 'right' }}>Nominal</th>
                </tr>
              </thead>
              <tbody>
                {data.bon?.list && data.bon.list.length > 0 ? (
                  data.bon.list.slice(0, 5).map((b, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 600 }}>{b.id_bon}</td>
                      <td>{b.pic}</td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{b.keterangan}</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            {b.alert_level === 'OVERDUE' ? (
                              <span style={{ color: 'var(--danger)', fontWeight: 600 }}>⚠️ OVERDUE ({b.days_ago}h)</span>
                            ) : b.alert_level === 'WARNING' ? (
                              <span style={{ color: 'var(--warning)', fontWeight: 600 }}>⚠️ WARNING ({b.days_ago}h)</span>
                            ) : (
                              <span>⏳ {b.days_ago} hari</span>
                            )}
                          </span>
                        </div>
                      </td>
                      <td style={{ textAlign: 'right', color: 'var(--primary)', fontWeight: 600 }}>
                        {b.nominal}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', padding: '1.5rem' }}>Semua bon sudah lunas! 🎉</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
