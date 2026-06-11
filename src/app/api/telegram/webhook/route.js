import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Helper to format currency
const formatRp = (num) => 'Rp ' + parseFloat(num).toLocaleString('id-ID');

async function sendTelegramMessage(chatId, text, replyMarkup = null) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) return;

  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  const body = {
    chat_id: chatId,
    text: text,
    parse_mode: 'HTML'
  };

  if (replyMarkup) {
    body.reply_markup = replyMarkup;
  }

  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
  } catch (error) {
    console.error('Failed to send Telegram message:', error);
  }
}

// Parse quick amount like 50rb -> 50000, 1.5jt -> 1500000
function parseAmount(str) {
  let s = str.toLowerCase().replace(/[^0-9.a-z]/g, '');
  if (s.endsWith('rb') || s.endsWith('k')) return parseFloat(s) * 1000;
  if (s.endsWith('jt') || s.endsWith('juta')) return parseFloat(s) * 1000000;
  return parseFloat(s);
}

export async function POST(request) {
  try {
    const data = await request.json();
    
    if (!data.message && !data.callback_query) {
      return NextResponse.json({ success: true });
    }

    const isCallback = !!data.callback_query;
    const msg = isCallback ? data.callback_query.message : data.message;
    const fromId = isCallback ? data.callback_query.from.id : msg.from.id;
    const chatId = msg.chat.id;
    const text = isCallback ? data.callback_query.data : (msg.text || '');

    // Authorization Check
    const user = await prisma.user.findUnique({
      where: { telegramId: String(fromId) }
    });

    if (!user) {
      await sendTelegramMessage(chatId, '❌ <b>Akses Ditolak</b>\nAkun Telegram Anda belum terdaftar di Sistem Keuangan PT BABJM. Silakan login ke website terlebih dahulu.');
      return NextResponse.json({ success: true });
    }

    if (isCallback) {
      // Handle callbacks like "bon_lunas:BON-1234"
      const parts = text.split(':');
      if (parts[0] === 'bon_lunas' && parts[1]) {
        const bonId = parts[1];
        // Settle bon logic
        const bon = await prisma.bon.findUnique({ where: { id_bon: bonId } });
        if (bon && bon.status === 'BELUM') {
          await prisma.$transaction(async (tx) => {
            await tx.bon.update({ where: { id: bon.id }, data: { status: 'SUDAH' } });
            await tx.cashTransaction.create({
              data: {
                keterangan: `Pertanggungan Bon - ${bon.pic} - ${bon.keterangan}`,
                pic: bon.pic,
                jenis: 'DEBIT',
                jumlah: bon.nominal,
                bonId: bon.id
              }
            });
          });
          await sendTelegramMessage(chatId, `✅ Bon <b>${bonId}</b> berhasil dipertanggungjawabkan!`);
        } else {
          await sendTelegramMessage(chatId, `❌ Bon tidak ditemukan atau sudah lunas.`);
        }
      }
      return NextResponse.json({ success: true });
    }

    // Text Commands
    const args = text.trim().split(/\s+/);
    const cmd = args[0].toLowerCase();

    if (cmd === '/start' || cmd === '/help') {
      await sendTelegramMessage(chatId, 
        `👋 Halo <b>${user.firstName || user.username}</b>!\n\n` +
        `🏦 <b>Petty Cash PT BABJM</b>\n\n` +
        `📌 <b>Perintah Cepat:</b>\n` +
        `/kasmasuk [Nominal] [Keterangan] — Input Kas Masuk\n` +
        `/kaskeluar [Nominal] [Keterangan] — Input Kas Keluar\n` +
        `/bonbaru [PIC] [Nominal] [Keterangan] — Catat Bon\n` +
        `/saldo — Cek Saldo\n` +
        `/monitor — Pantau Bon Belum Lunas\n` +
        `/lunas [ID_BON] — Selesaikan Bon\n\n` +
        `💡 <i>Tips nominal: 50rb, 1.5jt, 50000</i>`
      );
      return NextResponse.json({ success: true });
    }

    if (cmd === '/saldo') {
      const [totalDebit, totalKredit] = await Promise.all([
        prisma.cashTransaction.aggregate({ _sum: { jumlah: true }, where: { jenis: 'DEBIT' } }),
        prisma.cashTransaction.aggregate({ _sum: { jumlah: true }, where: { jenis: 'KREDIT' } }),
      ]);
      const debitSum = totalDebit._sum.jumlah ? parseFloat(totalDebit._sum.jumlah) : 0;
      const kreditSum = totalKredit._sum.jumlah ? parseFloat(totalKredit._sum.jumlah) : 0;
      const saldo = debitSum - kreditSum;
      
      await sendTelegramMessage(chatId, `💳 <b>Saldo Kas Saat Ini</b>\n\n💰 ${formatRp(saldo)}`);
      return NextResponse.json({ success: true });
    }

    if (cmd === '/monitor') {
      const pendingBons = await prisma.bon.findMany({ where: { status: 'BELUM' } });
      if (pendingBons.length === 0) {
        await sendTelegramMessage(chatId, `📋 <b>Semua bon sudah lunas! 🎉</b>`);
        return NextResponse.json({ success: true });
      }

      let totalOutstanding = 0;
      let msg = `📋 <b>Monitor Bon Kas</b>\n<i>${pendingBons.length} bon belum lunas</i>\n\n`;
      
      pendingBons.forEach(b => {
        totalOutstanding += parseFloat(b.nominal);
        msg += `🔹 <b>${b.id_bon}</b> (${b.pic})\n💰 ${formatRp(b.nominal)}\n📝 ${b.keterangan}\n\n`;
      });
      
      msg += `<b>Total Outstanding:</b> ${formatRp(totalOutstanding)}`;

      // Add inline buttons for the first few
      const buttons = pendingBons.slice(0, 5).map(b => [{
        text: `✅ Lunaskan ${b.id_bon} (${b.pic})`,
        callback_data: `bon_lunas:${b.id_bon}`
      }]);

      await sendTelegramMessage(chatId, msg, { inline_keyboard: buttons });
      return NextResponse.json({ success: true });
    }

    if (cmd === '/lunas' && args.length >= 2) {
      const bonId = args[1].toUpperCase();
      const bon = await prisma.bon.findUnique({ where: { id_bon: bonId } });
      if (bon && bon.status === 'BELUM') {
        await prisma.$transaction(async (tx) => {
          await tx.bon.update({ where: { id: bon.id }, data: { status: 'SUDAH' } });
          await tx.cashTransaction.create({
            data: {
              keterangan: `Pertanggungan Bon - ${bon.pic} - ${bon.keterangan}`,
              pic: bon.pic,
              jenis: 'DEBIT',
              jumlah: bon.nominal,
              bonId: bon.id
            }
          });
        });
        await sendTelegramMessage(chatId, `✅ <b>Bon LUNAS!</b>\n\n🆔 ${bonId}\n👤 ${bon.pic}\n💰 ${formatRp(bon.nominal)}`);
      } else {
        await sendTelegramMessage(chatId, `❌ Bon tidak ditemukan atau sudah lunas.`);
      }
      return NextResponse.json({ success: true });
    }

    if (cmd === '/kasmasuk' || cmd === '/kaskeluar') {
      if (args.length < 3) {
        await sendTelegramMessage(chatId, `❌ Format salah.\nContoh: <code>${cmd} 50000 Beli ATK</code>`);
        return NextResponse.json({ success: true });
      }
      const nominal = parseAmount(args[1]);
      if (isNaN(nominal) || nominal <= 0) {
        await sendTelegramMessage(chatId, `❌ Nominal tidak valid.`);
        return NextResponse.json({ success: true });
      }
      const keterangan = args.slice(2).join(' ');
      const jenis = cmd === '/kasmasuk' ? 'DEBIT' : 'KREDIT';

      const tx = await prisma.cashTransaction.create({
        data: { keterangan, jenis, jumlah: nominal, pic: user.firstName || 'System' }
      });

      const emoji = jenis === 'DEBIT' ? '🟢' : '🔴';
      await sendTelegramMessage(chatId, `✅ <b>Tercatat!</b>\n\n${emoji} Kas ${jenis === 'DEBIT' ? 'Masuk' : 'Keluar'}: ${formatRp(nominal)}\n📝 ${keterangan}`);
      return NextResponse.json({ success: true });
    }

    if (cmd === '/bonbaru') {
      if (args.length < 4) {
        await sendTelegramMessage(chatId, `❌ Format salah.\nContoh: <code>/bonbaru Budi 500rb Belanja</code>`);
        return NextResponse.json({ success: true });
      }
      const pic = args[1];
      const nominal = parseAmount(args[2]);
      if (isNaN(nominal) || nominal <= 0) {
        await sendTelegramMessage(chatId, `❌ Nominal tidak valid.`);
        return NextResponse.json({ success: true });
      }
      const keterangan = args.slice(3).join(' ');
      const id_bon = `BON-${new Date().toISOString().split('T')[0].replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;

      await prisma.$transaction(async (tx) => {
        const newBon = await tx.bon.create({
          data: { id_bon, pic, keterangan, nominal, status: 'BELUM' }
        });
        await tx.cashTransaction.create({
          data: { keterangan: `Bon - ${pic} - ${keterangan}`, pic, jenis: 'KREDIT', jumlah: nominal, bonId: newBon.id }
        });
      });

      await sendTelegramMessage(chatId, `📋 <b>Bon Tercatat!</b>\n\n🆔 ${id_bon}\n👤 ${pic}\n💰 ${formatRp(nominal)}\n📝 ${keterangan}\n⏳ Status: BELUM`);
      return NextResponse.json({ success: true });
    }

    // Default response for unknown text
    if (text.startsWith('/')) {
      await sendTelegramMessage(chatId, `❓ Perintah tidak dikenal. Ketik /help untuk bantuan.`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook Error:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
