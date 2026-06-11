import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit')) || 50;
    const offset = parseInt(searchParams.get('offset')) || 0;
    const status = searchParams.get('status');

    const where = {};
    if (status) where.status = status;

    const bons = await prisma.bon.findMany({
      where,
      orderBy: { tanggal: 'desc' },
      take: limit,
      skip: offset,
      include: {
        transactions: true
      }
    });

    const total = await prisma.bon.count({ where });

    return NextResponse.json({
      success: true,
      data: bons.map(bon => ({
        ...bon,
        nominal: parseFloat(bon.nominal)
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
    const { id_bon, pic, keterangan, nominal } = body;

    if (!id_bon || !pic || !keterangan || !nominal) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    // Ensure id_bon is unique
    const existing = await prisma.bon.findUnique({ where: { id_bon } });
    if (existing) {
      return NextResponse.json({ success: false, error: 'ID Bon already exists' }, { status: 400 });
    }

    // Create Bon and KREDIT CashTransaction together
    const result = await prisma.$transaction(async (tx) => {
      const newBon = await tx.bon.create({
        data: {
          id_bon,
          pic,
          keterangan,
          nominal,
          status: 'BELUM'
        }
      });

      await tx.cashTransaction.create({
        data: {
          keterangan: `Bon - ${pic} - ${keterangan}`,
          pic,
          jenis: 'KREDIT',
          jumlah: nominal,
          bonId: newBon.id
        }
      });

      return newBon;
    });

    return NextResponse.json({
      success: true,
      data: { ...result, nominal: parseFloat(result.nominal) }
    });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
