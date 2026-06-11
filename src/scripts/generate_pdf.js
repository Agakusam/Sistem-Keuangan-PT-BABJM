const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const doc = new PDFDocument({
  size: 'A4',
  margin: 50,
  bufferPages: true
});

const outDir = path.join(__dirname, '../../../'); // root repo directory
const outPath = path.join(outDir, 'Manual_Book_PettyCash_BABJM.pdf');
const stream = fs.createWriteStream(outPath);
doc.pipe(stream);

// Styling constants
const COLOR_PRIMARY = '#1A73E8'; // Professional Blue
const COLOR_SECONDARY = '#2D3748'; // Dark charcoal
const COLOR_MUTED = '#718096'; // Cool gray
const COLOR_LIGHT = '#F8FAFC'; // Very light gray
const COLOR_BORDER = '#E2E8F0'; // Border light gray
const COLOR_DEBIT = '#275623'; // Dark green
const COLOR_KREDIT = '#C00000'; // Dark red
const COLOR_BG_DEBIT = '#E2EFDA'; // Light green
const COLOR_BG_KREDIT = '#F2DCDB'; // Light red

// Helper function for adding headings
function addHeading1(text) {
  doc.addPage();
  doc.fillColor(COLOR_PRIMARY).font('Helvetica-Bold').fontSize(18).text(text);
  doc.moveDown(0.5);
  doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke(COLOR_PRIMARY);
  doc.moveDown(1);
}

function addHeading2(text) {
  doc.moveDown(1.2);
  doc.fillColor(COLOR_SECONDARY).font('Helvetica-Bold').fontSize(13).text(text);
  doc.moveDown(0.4);
}

function addHeading3(text) {
  doc.moveDown(0.8);
  doc.fillColor(COLOR_SECONDARY).font('Helvetica-Bold').fontSize(10).text(text);
  doc.moveDown(0.3);
}

// Helper for standard paragraph
function addParagraph(text) {
  doc.fillColor(COLOR_SECONDARY).font('Helvetica').fontSize(10).text(text, {
    align: 'justify',
    lineGap: 3
  });
  doc.moveDown(0.6);
}

// Helper for bullet points
function addBullet(boldText, normalText) {
  doc.fillColor(COLOR_SECONDARY).font('Helvetica-Bold').fontSize(10).text('•  ' + boldText, {
    continued: true
  }).font('Helvetica').text(normalText, {
    lineGap: 2
  });
  doc.moveDown(0.4);
}

// Helper for code/command block
function addCodeBlock(code) {
  const padding = 8;
  const startY = doc.y;
  doc.font('Courier').fontSize(9);
  
  // Measure text height
  const height = doc.heightOfString(code) + (padding * 2);
  
  // Draw light gray background box
  doc.rect(50, startY, 495, height).fill(COLOR_LIGHT);
  
  // Draw text over background
  doc.fillColor('#2D3748').text(code, 50 + padding, startY + padding, {
    width: 495 - (padding * 2)
  });
  
  doc.y = startY + height;
  doc.moveDown(0.6);
}

// Helper for note/callout box
function addCalloutBox(title, text, type = 'info') {
  const padding = 10;
  const startY = doc.y;
  doc.font('Helvetica-Bold').fontSize(10);
  
  const fullText = title.toUpperCase() + '\n' + text;
  const height = doc.heightOfString(fullText, { width: 475 }) + (padding * 2);
  
  let bgColor = COLOR_LIGHT;
  let borderColor = COLOR_PRIMARY;
  let textColor = COLOR_SECONDARY;
  
  if (type === 'debit') {
    bgColor = COLOR_BG_DEBIT;
    borderColor = COLOR_DEBIT;
    textColor = COLOR_DEBIT;
  } else if (type === 'kredit') {
    bgColor = COLOR_BG_KREDIT;
    borderColor = COLOR_KREDIT;
    textColor = COLOR_KREDIT;
  }
  
  // Draw box background
  doc.rect(50, startY, 495, height).fill(bgColor);
  
  // Draw left thick border
  doc.rect(50, startY, 4, height).fill(borderColor);
  
  // Draw text
  doc.fillColor(textColor).font('Helvetica-Bold').fontSize(9).text(title.toUpperCase(), 50 + padding, startY + padding);
  doc.font('Helvetica').fontSize(9).text(text, 50 + padding, doc.y + 2, {
    width: 495 - (padding * 2) - 4
  });
  
  doc.y = startY + height;
  doc.moveDown(0.6);
}

// ─── COVER PAGE ─────────────────────────────
doc.rect(0, 0, 595.28, 841.89).fill('#1A202C'); // Dark slate background

// White accent bar
doc.rect(0, 150, 595.28, 15).fill(COLOR_PRIMARY);

// Title Box
doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(26).text('MANUAL BOOK', 50, 240);
doc.fontSize(18).text('PANDUAN OPERASIONAL PETTY CASH & KASBON', 50, 280);

doc.fillColor('#A0AEC0').font('Helvetica').fontSize(12).text('Panduan Lengkap Penggunaan Aplikasi Keuangan Petty Cash (Buku Kas)\ndan Piutang Karyawan (Bon) PT BABJM Terintegrasi Website & Telegram Bot', 50, 315, {
  lineGap: 4
});

// Link Box in Cover Page
doc.rect(50, 420, 495, 110).fill('#2D3748');
doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(10).text('TAUTAN AKSES EKOSISTEM (PENGGUNAAN AKTIF):', 65, 435);
doc.fillColor(COLOR_PRIMARY).font('Courier-Bold').fontSize(10).text('Aplikasi Website: https://petty-cash-babjm.vercel.app', 65, 455);
doc.text('Telegram Bot    : https://t.me/BABJM_PettyCash_bot', 65, 475);
doc.fillColor('#A0AEC0').font('Helvetica-Oblique').fontSize(9).text('Catatan: Telegram Bot dapat dicari dengan username @BABJM_PettyCash_bot', 65, 500);

// Meta Box at bottom
doc.rect(50, 620, 495, 120).fill('#2D3748');
doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(11).text('KEPEMILIKAN SISTEM & HAK CIPTA:', 65, 635);
doc.font('Helvetica').fontSize(10).text('PT BERKAH AMANAH BERSAMA JAYA MAKMUR (PT BABJM)', 65, 655);
doc.fillColor('#A0AEC0').fontSize(9).text('Pengembangan Aplikasi: Next.js Frontend | Google Apps Script Backend\nVersi Manual: v1.1.0 (Revisi Operasional & User Guide - Juni 2026)', 65, 680, { lineGap: 3 });

// ─── PAGE 2: TABLE OF CONTENTS ──────────────
doc.addPage();
doc.fillColor(COLOR_PRIMARY).font('Helvetica-Bold').fontSize(18).text('DAFTAR ISI');
doc.moveDown(0.5);
doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke(COLOR_PRIMARY);
doc.moveDown(1.5);

const toc = [
  { title: '1. Pendahuluan & Tautan Akses Sistem', page: 3 },
  { title: '2. Pengoperasian Aplikasi Web (Dashboard & Integrasi)', page: 4 },
  { title: '3. Pencatatan & Rekonsiliasi Transaksi Kas (Ledger)', page: 5 },
  { title: '4. Ekspor dan Impor Excel (Auto-fit, Legends, Overflow)', page: 6 },
  { title: '5. Manajemen Kasbon Karyawan (Alur Pertanggungjawaban)', page: 7 },
  { title: '6. Penggunaan Telegram Bot (Guided Flow & Chat Commands)', page: 8 },
  { title: '7. Alur Cepat Kelunasan Bon & Pengingat Otomatis', page: 10 }
];

toc.forEach(item => {
  const startY = doc.y;
  doc.fillColor(COLOR_SECONDARY).font('Helvetica-Bold').fontSize(11).text(item.title, 50, startY);
  
  // Draw dotted lines between title and page number
  const dots = '.'.repeat(80 - item.title.length);
  doc.fillColor(COLOR_MUTED).font('Helvetica').text(dots, 350, startY, { width: 150 });
  
  doc.fillColor(COLOR_PRIMARY).font('Helvetica-Bold').text(String(item.page), 525, startY, { align: 'right' });
  doc.moveDown(1.2);
});


// ─── PAGE 3: PENDAHULUAN ────────────────────
addHeading1('1. Pendahuluan & Tautan Akses Sistem');
addParagraph('Selamat datang di panduan operasional ekosistem keuangan PT BERKAH AMANAH BERSAMA JAYA MAKMUR (PT BABJM). Ekosistem ini dirancang khusus untuk mempermudah administrasi kas kecil (petty cash) dan piutang kasbon karyawan secara real-time, transparan, dan terintegrasi penuh.');

addParagraph('Sistem ini terdiri dari dua antarmuka utama yang saling terhubung ke database terpusat (Google Sheets): Aplikasi Website untuk manajemen visual penuh, dan Telegram Bot untuk kemudahan operasional cepat di lapangan.');

addHeading2('Tautan Akses Aktif Sistem:');
addParagraph('Silakan gunakan tautan berikut untuk membuka dan menjalankan operasional sistem:');

addCalloutBox('Aplikasi Website Utama', 'Tautan: https://petty-cash-babjm.vercel.app\nDigunakan oleh staf admin keuangan untuk melihat rekapitulasi, memfilter data, melakukan edit massal, mencetak laporan fisik, serta ekspor-impor Excel.', 'info');

addCalloutBox('BABJM Petty Cash Telegram Bot', 'Tautan: https://t.me/BABJM_PettyCash_bot\nUsername: @BABJM_PettyCash_bot\nDigunakan oleh seluruh karyawan dan pimpinan untuk input cepat kas masuk/keluar, kasbon baru, cek saldo, dan memantau status kasbon outstanding.', 'debit');

addHeading2('Mengapa Menggunakan Sistem Ini?');
addBullet('Pencatatan Real-time:', ' Data yang dimasukkan melalui web maupun Telegram langsung tersimpan di Google Sheets secara seketika.');
addBullet('Akurasi Saldo Berkelanjutan:', ' Sistem menghitung saldo akhir kas kecil secara otomatis tanpa risiko kesalahan hitung manual.');
addBullet('Pengingat Otomatis:', ' Karyawan yang belum menyelesaikan kasbon akan mendapatkan tagihan pengingat harian secara otomatis di Telegram.');


// ─── PAGE 4: WEB APPLICATION ────────────────
addHeading1('2. Pengoperasian Aplikasi Web (Dashboard & Integrasi)');
addParagraph('Aplikasi web Next.js adalah pusat kendali utama bagi staf keuangan. Di halaman ini, seluruh data transaksi kas kecil dan kasbon dapat dipantau dan dikelola secara menyeluruh.');

addHeading2('Fitur Menu Utama Aplikasi Web:');
addBullet('Dashboard (Halaman Utama):', ' Menampilkan saldo kas kecil aktif saat ini secara real-time. Dilengkapi dengan grafik grafik bulanan pengeluaran vs pemasukan (Debit vs Kredit) serta ringkasan jumlah kasbon luar (outstanding) berdasarkan statusnya.');
addBullet('Buku Kas:', ' Lembar buku besar kas kecil. Di halaman ini admin dapat melakukan filter berdasarkan rentang tanggal, mencari deskripsi transaksi, melakukan impor dari Excel, ekspor laporan Excel, dan mencetak laporan kas.');
addBullet('Bon (Kasbon):', ' Halaman khusus pelacakan pinjaman sementara karyawan. Admin dapat mencatat bon baru, memantau batas jatuh tempo, dan memproses pelunasan bon saat nota belanja diserahkan.');
addBullet('Pengaturan:', ' Tempat mengonfigurasi API, token Telegram Bot, Chat ID grup notifikasi, PIN keamanan website, dan nama penandatangan laporan ekspor.');

addHeading2('Cara Membaca Metrik Keuangan di Dashboard:');
addParagraph('Saat Anda membuka Dashboard web, perhatikan tiga kartu ringkasan utama:\n'
  + '1. Saldo Kas Aktif: Menunjukkan sisa dana fisik yang harus ada di brankas kas kecil.\n'
  + '2. Netto Bulan Ini: Selisih antara total kas masuk (Debit) dan kas keluar (Kredit) dalam bulan berjalan.\n'
  + '3. Status Kasbon: Memberikan indikasi cepat apakah ada kasbon yang sudah mendekati jatuh tempo (Warning) atau telah melebihi batas 14 hari (Overdue) sehingga memerlukan tindakan penagihan.');


// ─── PAGE 5: PENCATATAN TRANSAKSI ─────────────
addHeading1('3. Pencatatan & Rekonsiliasi Transaksi Kas (Ledger)');
addParagraph('Halaman Transaksi kas kecil menyediakan dua metode pencatatan transaksi: entri satu per satu melalui formulir interaktif, dan entri massal menggunakan Excel Grid Mode.');

addHeading2('1. Entri Transaksi Tunggal (Formulir Website):');
addParagraph('Klik tombol "+ Transaksi Baru" di pojok kanan atas halaman Transaksi. Isi formulir dengan data transaksi keuangan yang valid:');
addBullet('Tanggal Transaksi & Tgl. Nota:', ' Tanggal uang dikeluarkan/diterima dan tanggal yang tertera pada bukti nota belanja fisik.');
addBullet('Akun Pengeluaran:', ' Kategori akun akuntansi (misalnya ATK, Operasional Kantor, Konsumsi Rapat, Logistik, dll.).');
addBullet('Jenis Kas:', ' Pilih Debit untuk transaksi kas masuk (misal pengisian ulang dana dari kantor pusat). Pilih Kredit untuk transaksi kas keluar (pengeluaran operasional).');
addBullet('Nominal & Keterangan:', ' Masukkan angka nominal bersih (misal 500000) dan berikan deskripsi detail kegunaan transaksi.');

addHeading2('2. Mode Edit Massal (Excel Grid Mode):');
addParagraph('Jika ada beberapa baris data transaksi kas yang perlu diubah atau disesuaikan sekaligus:');
addBullet('Langkah 1:', ' Centang kotak di sebelah kiri transaksi pada tabel transaksi yang ingin diubah.');
addBullet('Langkah 2:', ' Klik tombol "Edit Grid Mode" yang muncul pada baris aksi melayang di bagian bawah layar.');
addBullet('Langkah 3:', ' Seluruh data baris terpilih akan berubah menjadi kolom tabel yang dapat diedit langsung (mirip Excel). Ubah nilai sel yang diinginkan, lalu klik tombol "Simpan Perubahan".');

addCalloutBox('Cetak Laporan Fisik Kas', 'Admin dapat langsung mencetak salinan fisik laporan kas kecil dengan mengeklik tombol "Cetak PDF" pada web. Tampilan cetak akan otomatis menyembunyikan elemen navigasi web dan memunculkan kotak tanda tangan pembuat (Kasir/Administrasi) dan penyetuju (Pimpinan) di bagian bawah laporan.', 'info');


// ─── PAGE 6: EKSPOR IMPOR EXCEL ──────────────
addHeading1('4. Ekspor dan Impor Excel');
addParagraph('Untuk memfasilitasi kebutuhan administrasi berskala besar, aplikasi web menyediakan fitur impor templat Excel dan ekspor berkas laporan Excel dengan format yang rapi secara otomatis.');

addHeading2('1. Fitur Impor Excel (Unggah Data Massal):');
addParagraph('Admin dapat mengunggah puluhan transaksi kas sekaligus dengan mengeklik tombol "Import". Gunakan berkas templat resmi yang sudah disediakan dengan mengikuti aturan kolom berkode warna:');
addBullet('Kolom Merah (Wajib):', ' Kolom Tanggal transaksi wajib diisi.');
addBullet('Kolom Kuning (Kondisional):', ' Untuk kas masuk, isi kolom Keterangan Debit dan nominal Debit. Untuk kas keluar, isi kolom Keterangan dan nominal Kredit.');
addBullet('Kolom Biru (Opsional):', ' Kolom Tgl. Nota, Akun, PIC, No. ID, dan Tgl. Penagihan boleh diisi atau dikosongkan.');
addBullet('Kolom Abu-abu (Otomatis):', ' Kolom Saldo Akhir dihitung otomatis oleh sistem, jangan diisi manual.');

addHeading2('2. Fitur Ekspor Excel (Unduh Laporan Ledger):');
addParagraph('Ketika admin mengeklik tombol "Export", sistem akan membuat berkas Excel laporan kas kecil terformat profesional dengan aturan khusus:');
addBullet('Tanpa Error Truncate (###):', ' Lebar seluruh kolom mata uang (Debit, Kredit, Saldo Akhir) dihitung otomatis menyesuaikan nilai terpanjang, menjamin berkas Excel langsung siap dibaca tanpa kolom bermasalah.');
addBullet('Total Terpusat di Baris Atas:', ' Baris Total Debit (hijau lembut) dan Total Kredit (merah lembut) diletakkan di bawah rentang tanggal tepat di tengah (Kolom E & F) lengkap dengan border tipis teratur, bukan digabung atau ditaruh di pojok.');
addBullet('Indentasi Keterangan Visual:', ' Kolom keterangan debit diset sempit (12). Karena data kas keluar memiliki nilai null pada kolom keterangan debit, teks deskripsi kas masuk akan meluber secara visual dari kolom E ke F, menciptakan layout terindentasi rapi.');


// ─── PAGE 7: MANAJEMEN KASBON ────────────────
addHeading1('5. Manajemen Kasbon Karyawan (Alur Pertanggungjawaban)');
addParagraph('Kasbon karyawan (Bon) adalah pengeluaran sementara untuk kebutuhan dinas lapangan atau operasional mendesak. Setiap kasbon wajib dilaporkan pertanggungjawabannya maksimal 14 hari setelah dicatat.');

addHeading2('Siklus Pertanggungjawaban Bon (Langkah demi Langkah):');
addBullet('Langkah 1: Pencatatan Bon Baru:', ' Admin mencatat bon baru lewat web atau Telegram dengan mengisi nama PIC karyawan, nominal bon, dan tujuan belanja.');
addBullet('Langkah 2: Pemantauan Batas Waktu:', ' Sistem secara dinamis menghitung umur bon semenjak tanggal dicatat:\n'
  + '  • Umur 1 s.d. 9 hari: Berstatus Normal (Aman).\n'
  + '  • Umur 10 s.d. 13 hari: Berstatus Warning (Kuning - Segera jatuh tempo).\n'
  + '  • Umur >= 14 hari: Berstatus Overdue (Merah Bold - Jatuh tempo terlewati).');
addBullet('Langkah 3: Penyerahan Bukti Nota Riil (Settle):', ' Ketika karyawan mengembalikan sisa uang atau meminta penggantian dana belanja, admin mengeklik tombol "Lunas" di samping data bon bersangkutan di halaman Bon.');
addBullet('Langkah 4: Rekonsiliasi Nominal Riil Belanja:', ' Admin memasukkan nominal belanja riil sesuai nota fisik:\n'
  + '  • Jika Nominal Belanja = Nominal Bon: Bon langsung lunas.\n'
  + '  • Jika Nominal Belanja < Nominal Bon (Sisa uang dikembalikan): Bon lunas, sistem otomatis membuat transaksi kas baru (Kas Masuk/Debit) sebesar selisih sisa uang yang diserahkan ke brankas kas kecil.\n'
  + '  • Jika Nominal Belanja > Nominal Bon (Dana kurang diganti admin): Bon lunas, sistem otomatis membuat transaksi kas baru (Kas Keluar/Kredit) untuk mengganti uang nomok karyawan.');

addCalloutBox('Akurasi Selisih Kasbon', 'Melalui alur penyelesaian ini, admin keuangan tidak perlu lagi mencatat transaksi selisih kasbon secara manual di ledger kas kecil. Sistem secara otomatis menyinkronkan pengembalian atau kekurangan uang belanja langsung ke database kas.', 'debit');


// ─── PAGE 8: INTEGRASI TELEGRAM BOT ──────────
addHeading1('6. Penggunaan Telegram Bot (Guided Flow)');
addParagraph('Telegram Bot (@BABJM_PettyCash_bot) dirancang sebagai alat bantu input kilat transaksi keuangan langsung dari chat room Telegram, baik lewat chat pribadi maupun grup operasional.');

addHeading2('1. Menggunakan Tombol Menu Keyboard Utama:');
addParagraph('Setelah mengaktifkan bot dengan mengetik perintah /start, keyboard interaktif di bawah kolom input chat Telegram Anda akan menampilkan 6 tombol utama:');
addBullet('🟢 Kas Masuk:', ' Memulai proses terbimbing untuk mencatat Kas Masuk (Debit).');
addBullet('🔴 Kas Keluar:', ' Memulai proses terbimbing untuk mencatat Kas Keluar (Kredit).');
addBullet('📋 Bon Baru:', ' Memulai proses terbimbing untuk membuat Kasbon karyawan baru.');
addBullet('🔍 Monitor Bon:', ' Menampilkan daftar semua bon aktif karyawan yang belum diselesaikan.');
addBullet('💳 Cek Saldo:', ' Menampilkan saldo petty cash terkini secara instan dari Google Sheets.');
addBullet('📊 Rekap Transaksi:', ' Mengirimkan ringkasan transaksi kas dalam rentang waktu terdekat.');

addHeading3('Cara Mengisi Nominal dan Keterangan Cepat (Format Teks):');
addParagraph('Setelah mengeklik menu Kas Masuk, Kas Keluar, atau Bon Baru, ketik pesan Anda dengan format: [Nominal] [Keterangan]. Bot telah dilengkapi pembaca teks cerdas yang mengenali singkatan angka nominal umum di Indonesia:');
addBullet('Singkatan Ratusan Ribu (rb / k):', ' Contoh 250rb atau 250k dibaca otomatis oleh bot sebagai 250000.');
addBullet('Singkatan Jutaan (jt / juta):', ' Contoh 1.5jt atau 1.5juta dibaca otomatis sebagai 1500000.');

addCodeBlock('Contoh ketik pesan Kas Masuk: 1.5jt Pengisian ulang kas kecil dari kantor pusat\nContoh ketik pesan Kas Keluar: 120rb Beli konsumsi rapat internal logistik\nContoh ketik pesan Bon Baru: Rio 500k Belanja bensin mobil logistik');


// ─── PAGE 9: TELEGRAM COMMANDS ──────────────
addHeading1('6. Penggunaan Telegram Bot (Lanjutan)');
addParagraph('Bagi pengguna tingkat lanjut, bot mendukung pemicuan perintah langsung menggunakan format simbol garis miring (/) di dalam chat room.');

addHeading2('Daftar Lengkap Perintah Chat (Command-based):');
addBullet('/start', ' Mengaktifkan bot, mendaftarkan identitas chat, dan memunculkan menu tombol interaktif.');
addBullet('/help', ' Menampilkan daftar bantuan format penulisan pesan dan perintah bot.');
addBullet('/saldo', ' Mengecek saldo kas kecil riil saat ini (terhubung langsung ke sel Google Sheets).');
addBullet('/rekap [jumlah]', ' Menampilkan rekap histori transaksi kas terakhir. Contoh: /rekap 5');
addBullet('/monitor', ' Menampilkan daftar nama PIC, nominal, dan sisa hari jatuh tempo dari bon karyawan yang belum lunas.');
addBullet('/kas [debit/kredit] [nominal] [keterangan]', ' Mencatat transaksi kas baru dalam satu pesan singkat. Contoh: /kas kredit 50rb Beli Materai Tempel');
addBullet('/bon [nama_pic] [nominal] [keterangan]', ' Mencatat kasbon baru dalam satu pesan singkat. Contoh: /bon Fita 300k Panjar Belanja ATK');
addBullet('/lunas [ID_BON]', ' Melunasi kasbon karyawan tertentu secara manual menggunakan kode ID Bon. Contoh: /lunas BON-202606-003');

addCalloutBox('Kemudahan Bagi Staf Lapangan', 'Seluruh perintah bot di atas bersifat case-insensitive (huruf besar atau kecil tidak berpengaruh). Bot akan memberikan balasan notifikasi berupa pesan konfirmasi centang hijau jika transaksi berhasil tercatat ke dalam database Google Sheets.', 'debit');


// ─── PAGE 10: ALUR CEPAT & PENGINGAT ──────────
addHeading1('7. Alur Cepat Kelunasan Bon & Pengingat Otomatis');
addParagraph('Untuk memastikan disiplin keuangan berjalan dengan lancar, sistem dilengkapi dengan otomatisasi alur kelunasan instan dan notifikasi terjadwal.');

addHeading2('1. Alur Cepat Kelunasan Bon via Tautan Telegram:');
addParagraph('Setiap kali admin menjalankan perintah /monitor atau menerima rekapitulasi harian kasbon, bot Telegram akan menyajikan daftar bon outstanding lengkap dengan tautan biru di samping nama PIC, contoh: /lunas_BON_202606_003.');
addBullet('Kelunasan Sekali Klik:', ' Admin cukup mengetuk/mengeklik tautan biru tersebut di Telegram. Bot akan memproses pelunasan kasbon tersebut secara instan tanpa perlu mengetik ID secara manual.');
addBullet('Rekonsiliasi Otomatis:', ' Pelunasan instan via Telegram diasumsikan nominal belanja riil sama dengan nominal bon asli. Jika ada selisih uang belanja, disarankan admin melakukan pelunasan melalui aplikasi web.');

addHeading2('2. Pemicu Pengingat Jatuh Tempo (Cron Jobs):');
addParagraph('Sistem ini dikonfigurasi dengan pemicu waktu harian (Time-driven trigger) Google Apps Script yang berjalan otomatis setiap pagi pukul 08:00 WIB:');
addBullet('Pengecekan Otomatis:', ' Sistem memindai database Google Sheets mencari bon kas yang telah berstatus "Warning" (umur 10-13 hari) atau "Overdue" (umur >= 14 hari).');
addBullet('Notifikasi Tagihan:', ' Hasil pemindaian tersebut dirangkum dalam satu daftar penagihan kasbon luar dan dikirimkan secara otomatis ke grup chat Telegram default sebagai pengingat agar PIC segera menyerahkan nota belanja fisik.');

addCalloutBox('Hubungi Tim Pemeliharaan Sistem', 'Jika notifikasi transaksi atau pengingat otomatis pagi hari berhenti terkirim ke Telegram grup, silakan masuk ke menu Pengaturan di web app untuk memastikan parameter token bot dan Chat ID grup tujuan sudah terkonfigurasi dengan benar.', 'kredit');


// ─── FOOTER & PAGINATION GENERATOR ──────────
const range = doc.bufferedPageRange();
for (let i = 0; i < range.count; i++) {
  doc.switchToPage(i);
  if (i > 0) { // Skip cover page
    // Draw Header
    doc.fillColor(COLOR_MUTED).font('Helvetica').fontSize(8);
    doc.text('PT BABJM — Panduan Penggunaan Ekosistem Petty Cash & Kasbon', 50, 30, { align: 'left' });
    
    // Draw top separator line
    doc.moveTo(50, 42).lineTo(545, 42).lineWidth(0.5).stroke(COLOR_BORDER);
    
    // Draw Bottom separator line
    doc.moveTo(50, 792).lineTo(545, 792).lineWidth(0.5).stroke(COLOR_BORDER);
    
    // Draw Footer Page Number
    doc.text(`Halaman ${i + 1} dari ${range.count}`, 50, 800, { align: 'right' });
  }
}

doc.end();
console.log('PDF Manual Book generated successfully at: ' + outPath);
