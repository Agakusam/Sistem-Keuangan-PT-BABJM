import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(request, { params }) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = params;
    
    // Find Bon
    const bon = await prisma.bon.findUnique({ where: { id } });
    if (!bon) {
      return NextResponse.json({ success: false, error: 'Bon not found' }, { status: 404 });
    }

    if (bon.status === 'SUDAH') {
      return NextResponse.json({ success: false, error: 'Bon is already settled' }, { status: 400 });
    }

    // Update Bon to 'SUDAH' and create DEBIT transaction (Pengembalian/Pertanggungan)
    const result = await prisma.$transaction(async (tx) => {
      const updatedBon = await tx.bon.update({
        where: { id },
        data: { status: 'SUDAH' }
      });

      await tx.cashTransaction.create({
        data: {
          keterangan: `Pertanggungan Bon - ${bon.pic} - ${bon.keterangan}`,
          pic: bon.pic,
          jenis: 'DEBIT',
          jumlah: bon.nominal,
          bonId: bon.id
        }
      });

      return updatedBon;
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

export async function DELETE(request, { params }) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = params;
    
    // Deleting Bon will cascade and delete associated CashTransaction due to Prisma schema
    await prisma.bon.delete({ where: { id } });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
