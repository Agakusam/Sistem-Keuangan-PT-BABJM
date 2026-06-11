import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit')) || 50;
    const offset = parseInt(searchParams.get('offset')) || 0;
    const jenis = searchParams.get('jenis'); // 'DEBIT' | 'KREDIT'

    const where = {};
    if (jenis) where.jenis = jenis;

    const transactions = await prisma.cashTransaction.findMany({
      where,
      orderBy: { tanggal: 'desc' },
      take: limit,
      skip: offset,
      include: {
        bon: true
      }
    });

    const total = await prisma.cashTransaction.count({ where });

    return NextResponse.json({
      success: true,
      data: transactions.map(tx => ({
        ...tx,
        jumlah: parseFloat(tx.jumlah)
      })),
      pagination: {
        total,
        limit,
        offset
      }
    });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { tgl_nota, akun, keterangan, pic, jenis, jumlah, lampiran, bonId } = body;

    if (!keterangan || !jenis || !jumlah) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const transaction = await prisma.cashTransaction.create({
      data: {
        tgl_nota: tgl_nota ? new Date(tgl_nota) : null,
        akun,
        keterangan,
        pic,
        jenis,
        jumlah,
        lampiran,
        bonId: bonId || null
      }
    });

    return NextResponse.json({
      success: true,
      data: { ...transaction, jumlah: parseFloat(transaction.jumlah) }
    });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
