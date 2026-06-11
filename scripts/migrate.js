const { PrismaClient } = require('@prisma/client');
const fetch = require('node-fetch'); // Assuming node 18+, fetch is global, but just in case
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
    
    if (cashData.success && cashData.data) {
      console.log(`Found ${cashData.data.length} cash transactions. Inserting...`);
      for (const tx of cashData.data) {
        const amount = parseFloat(tx.debit) > 0 ? parseFloat(tx.debit) : parseFloat(tx.kredit);
        const jenis = parseFloat(tx.debit) > 0 ? 'DEBIT' : 'KREDIT';
        
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
    
    if (bonData.success && bonData.data) {
      console.log(`Found ${bonData.data.length} bons. Inserting...`);
      for (const b of bonData.data) {
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
