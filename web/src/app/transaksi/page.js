"use client";

import { useState, useEffect } from 'react';
import { fetchFromGas } from '@/lib/api';
import TransaksiForm from '@/components/TransaksiForm';
import { Download, Plus, Filter, Search } from 'lucide-react';
import { format } from 'date-fns';

export default function TransaksiPage() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      if (!process.env.NEXT_PUBLIC_GAS_URL) {
        // Dummy data
        setTransactions([
          { _row: 3, tanggal: '2026-06-03', keterangan: 'Beli ATK', pic: 'Fita', no_id: '123', debit: 'Rp -', kredit: 'Rp50.000', saldo_akhir: 'Rp2.694.606' }
        ]);
        setLoading(false);
        return;
      }
      
      const res = await fetchFromGas('listCash', { limit: 100 });
      if (res.success) {
        setTransactions(res.data.reverse()); // Show newest first
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

  const handleExport = () => {
    // We'll implement export modal later, for now just basic alert
    alert("Fitur Export akan membuka modal rentang tanggal");
  };

  const filteredData = transactions.filter(t => 
    t.keterangan.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (t.pic && t.pic.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2>Data Transaksi Kas</h2>
          <p>Kelola pencatatan kas masuk dan keluar</p>
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
            loadData();
          }} />
        </div>
      )}

      <div className="glass-card" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <div style={{ position: 'relative', width: '300px' }}>
            <Search size={18} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-tertiary)' }} />
            <input 
              type="text" 
              className="input-field" 
              placeholder="Cari transaksi atau PIC..." 
              style={{ paddingLeft: '2.5rem', marginBottom: 0 }}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="btn btn-secondary">
            <Filter size={18} /> Filter
          </button>
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
                    <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{t.keterangan}</td>
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
                    <td colSpan="7" style={{ textAlign: 'center', padding: '2rem' }}>Tidak ada data transaksi</td>
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
