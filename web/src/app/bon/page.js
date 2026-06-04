"use client";

import { useState, useEffect } from 'react';
import { fetchFromGas, postToGas } from '@/lib/api';
import BonForm from '@/components/BonForm';
import { Plus, Search, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function BonPage() {
  const [bons, setBons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      if (!process.env.NEXT_PUBLIC_GAS_URL) {
        // Dummy data
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

  const filteredData = bons.filter(b => 
    b.keterangan.toLowerCase().includes(searchTerm.toLowerCase()) || 
    b.pic.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.id_bon.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2>Monitoring Bon Kas</h2>
          <p>Catat dan pantau status pertanggungan bon kas</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          <Plus size={18} /> {showForm ? 'Tutup Form' : 'Catat Bon Baru'}
        </button>
      </div>

      {showForm && (
        <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
          <BonForm onSuccess={() => {
            setShowForm(false);
            loadData();
          }} />
        </div>
      )}

      <div className="glass-card" style={{ padding: '1.5rem' }}>
        <div style={{ position: 'relative', width: '300px', marginBottom: '1.5rem' }}>
          <Search size={18} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-tertiary)' }} />
          <input 
            type="text" 
            className="input-field" 
            placeholder="Cari bon (ID, PIC, Keterangan)..." 
            style={{ paddingLeft: '2.5rem', marginBottom: 0 }}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="excel-table-container">
          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Memuat data...</div>
          ) : (
            <table className="excel-table">
              <thead>
                <tr>
                  <th style={{ width: '35px' }}>No.</th>
                  <th>ID Bon</th>
                  <th>Tanggal</th>
                  <th>PIC</th>
                  <th>Keterangan</th>
                  <th>Nominal</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.length > 0 ? filteredData.map((b, idx) => (
                  <tr key={idx}>
                    <td className="excel-row-num">{idx + 1}</td>
                    <td style={{ fontWeight: 600 }}>{b.id_bon}</td>
                    <td>{b.tanggal ? b.tanggal.split('T')[0] : '-'}</td>
                    <td>{b.pic}</td>
                    <td>{b.keterangan}</td>
                    <td style={{ color: 'var(--primary)', fontWeight: 500 }}>{b.nominal}</td>
                    <td>
                      {b.status === 'SUDAH' ? (
                        <span className="badge badge-success">SUDAH</span>
                      ) : (
                        b.alert_level === 'OVERDUE' ? (
                          <span className="badge badge-danger" title={`${b.days_ago} hari`}>OVERDUE ({b.days_ago}h)</span>
                        ) : b.alert_level === 'WARNING' ? (
                          <span className="badge badge-warning" title={`${b.days_ago} hari`}>WARNING ({b.days_ago}h)</span>
                        ) : (
                          <span className="badge" style={{ background: '#e2e8f0', color: '#475569' }}>BELUM ({b.days_ago}h)</span>
                        )
                      )}
                    </td>
                    <td>
                      {b.status === 'BELUM' ? (
                        <button 
                          className="btn btn-success" 
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                          onClick={() => handleSettle(b.id_bon)}
                        >
                          <CheckCircle2 size={14} /> Lunaskan
                        </button>
                      ) : (
                        <span style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem' }}>-</span>
                      )}
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '2rem' }}>Tidak ada data bon</td>
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
 
