import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Calculate current balance (Total Debit - Total Kredit)
    const [totalDebit, totalKredit] = await Promise.all([
      prisma.cashTransaction.aggregate({ _sum: { jumlah: true }, where: { jenis: 'DEBIT' } }),
      prisma.cashTransaction.aggregate({ _sum: { jumlah: true }, where: { jenis: 'KREDIT' } }),
    ]);

    const debitSum = totalDebit._sum.jumlah ? parseFloat(totalDebit._sum.jumlah) : 0;
    const kreditSum = totalKredit._sum.jumlah ? parseFloat(totalKredit._sum.jumlah) : 0;
    const saldo = debitSum - kreditSum;

    // Calculate this month's debit and kredit
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const [monthDebit, monthKredit] = await Promise.all([
      prisma.cashTransaction.aggregate({
        _sum: { jumlah: true },
        where: { jenis: 'DEBIT', tanggal: { gte: startOfMonth, lte: endOfMonth } }
      }),
      prisma.cashTransaction.aggregate({
        _sum: { jumlah: true },
        where: { jenis: 'KREDIT', tanggal: { gte: startOfMonth, lte: endOfMonth } }
      })
    ]);

    // Pending Bon
    const pendingBons = await prisma.bon.findMany({
      where: { status: 'BELUM' },
      orderBy: { tanggal: 'asc' }
    });

    let warningBon = 0;
    let overdueBon = 0;
    let totalNominalBon = 0;
    
    const bonList = pendingBons.map(bon => {
      const bonDate = new Date(bon.tanggal);
      const diffTime = Math.abs(now - bonDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
      
      let alert_level = 'NORMAL';
      if (diffDays >= 7) { overdueBon++; alert_level = 'OVERDUE'; }
      else if (diffDays >= 3) { warningBon++; alert_level = 'WARNING'; }
      
      const nominal = parseFloat(bon.nominal);
      totalNominalBon += nominal;
      
      return {
        id_bon: bon.id_bon,
        pic: bon.pic,
        keterangan: bon.keterangan,
        nominal: 'Rp ' + nominal.toLocaleString('id-ID'),
        days_ago: diffDays,
        alert_level
      };
    });

    // Recent Transactions
    const recentTransactions = await prisma.cashTransaction.findMany({
      orderBy: { tanggal: 'desc' },
      take: 10
    });

    return NextResponse.json({
      success: true,
      data: {
        saldo,
        bulan_ini: {
          debit: monthDebit._sum.jumlah ? parseFloat(monthDebit._sum.jumlah) : 0,
          kredit: monthKredit._sum.jumlah ? parseFloat(monthKredit._sum.jumlah) : 0
        },
        bon: {
          total: pendingBons.length,
          warning: warningBon,
          overdue: overdueBon,
          total_nominal: totalNominalBon,
          list: bonList
        },
        recent_transactions: recentTransactions.map(tx => ({
          ...tx,
          jumlah: parseFloat(tx.jumlah)
        }))
      }
    });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
