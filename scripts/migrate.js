const { PrismaClient } = require('@prisma/client');
// Node 18+ has fetch globally
require('dotenv').config();

const prisma = new PrismaClient();
const GAS_URL = process.env.NEXT_PUBLIC_GAS_URL;
const API_KEY = process.env.NEXT_PUBLIC_API_KEY;

async function fetchFromGas(action) {
  const url = new URL(GAS_URL);
  url.searchParams.append('action', action);
  url.searchParams.append('api_key', API_KEY);
  
  const res = await fetch(url.toString());
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Failed to fetch');
  return json.data;
}

async function migrate() {
  console.log('Starting Migration from Google Sheets to Postgres...');
  
  try {
    // 1. Migrate Cash Transactions
    console.log('Fetching Cash Transactions...');
    // listCash with no limits should get all (or write a custom GAS action to get all, here we assume it gets enough)
    // You might need to change 'listCash' to return all rows if it was paginated.
    const url = new URL(GAS_URL);
    url.searchParams.append('action', 'listCash');
    url.searchParams.append('api_key', API_KEY);
    url.searchParams.append('limit', '5000'); // large number to get all
    
    const cashRes = await fetch(url.toString());
    const cashData = await cashRes.json();
    console.log('GAS Response:', cashData);
    
    if (cashData.success && cashData.data && cashData.data.data) {
      console.log(`Found ${cashData.data.data.length} cash transactions. Inserting...`);
      for (const tx of cashData.data.data) {
        const debitVal = tx.debit ? parseFloat(String(tx.debit).replace(/[^0-9.-]/g, '')) : 0;
        const kreditVal = tx.kredit ? parseFloat(String(tx.kredit).replace(/[^0-9.-]/g, '')) : 0;
        const amount = (!isNaN(debitVal) && debitVal > 0) ? debitVal : ((!isNaN(kreditVal) && kreditVal > 0) ? kreditVal : 0);
        const jenis = (!isNaN(debitVal) && debitVal > 0) ? 'DEBIT' : 'KREDIT';
        
        await prisma.cashTransaction.create({
          data: {
            tanggal: new Date(tx.tanggal),
            tgl_nota: tx.tgl_nota ? new Date(tx.tgl_nota) : null,
            akun: tx.akun,
            keterangan: tx.keterangan || (jenis === 'DEBIT' ? tx.keterangan_debit : tx.keterangan_kredit) || '',
            pic: tx.pic || '',
            jenis: jenis,
            jumlah: amount,
            lampiran: tx.lampiran || null,
          }
        });
      }
      console.log('Cash transactions migrated.');
    }

    // 2. Migrate Bons
    console.log('Fetching Bons...');
    const bonUrl = new URL(GAS_URL);
    bonUrl.searchParams.append('action', 'listBon');
    bonUrl.searchParams.append('api_key', API_KEY);
    
    const bonRes = await fetch(bonUrl.toString());
    const bonData = await bonRes.json();
    console.log('GAS Bon Response:', bonData);
    
    if (bonData.success && bonData.data && bonData.data.data) {
      console.log(`Found ${bonData.data.data.length} bons. Inserting...`);
      for (const b of bonData.data.data) {
        await prisma.bon.create({
          data: {
            id_bon: b.id_bon,
            tanggal: new Date(b.tanggal),
            pic: b.pic,
            keterangan: b.keterangan,
            nominal: b.nominal_value || parseFloat(b.nominal.replace(/[^0-9]/g, '')),
            status: b.status,
          }
        });
      }
      console.log('Bons migrated.');
    }

    console.log('Migration Completed Successfully!');
  } catch (err) {
    console.error('Migration Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

migrate();
