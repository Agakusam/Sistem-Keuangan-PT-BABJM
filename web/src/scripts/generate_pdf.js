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
const COLOR_LIGHT = '#F7FAFC'; // Very light gray
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
  doc.moveDown(1.5);
  doc.fillColor(COLOR_SECONDARY).font('Helvetica-Bold').fontSize(14).text(text);
  doc.moveDown(0.5);
}

function addHeading3(text) {
  doc.moveDown(1);
  doc.fillColor(COLOR_SECONDARY).font('Helvetica-Bold').fontSize(11).text(text);
  doc.moveDown(0.5);
}

// Helper for standard paragraph
function addParagraph(text) {
  doc.fillColor(COLOR_SECONDARY).font('Helvetica').fontSize(10).text(text, {
    align: 'justify',
    lineGap: 3
  });
  doc.moveDown(0.8);
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
  doc.fillColor('#1A202C').text(code, 50 + padding, startY + padding, {
    width: 495 - (padding * 2)
  });
  
  doc.y = startY + height;
  doc.moveDown(0.8);
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
  doc.moveDown(0.8);
}

// ─── COVER PAGE ─────────────────────────────
doc.rect(0, 0, 595.28, 841.89).fill('#1A202C'); // Dark slate background

// White accent bar
doc.rect(0, 150, 595.28, 15).fill(COLOR_PRIMARY);

// Title Box
doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(26).text('MANUAL BOOK', 50, 240);
doc.fontSize(18).text('PANDUAN EKOSISTEM PETTY CASH & KASBON', 50, 280);

doc.fillColor('#A0AEC0').font('Helvetica').fontSize(12).text('Sistem Informasi Manajemen Keuangan Petty Cash (Kas_log)\ndan Piutang Karyawan (Bon) Terintegrasi Google Sheet & Telegram Bot', 50, 315, {
  lineGap: 4
});

// Meta Box at bottom
doc.rect(50, 620, 495, 120).fill('#2D3748');
doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(11).text('KEPEMILIKAN SISTEM & HAK CIPTA:', 65, 635);
doc.font('Helvetica').fontSize(10).text('PT BERKAH AMANAH BERSAMA JAYA MAKMUR (PT BABJM)', 65, 655);
doc.fillColor('#A0AEC0').fontSize(9).text('Pengembangan Aplikasi: Next.js Frontend | Google Apps Script Backend\nVersi Manual: v1.0.0 (Revisi Juni 2026)', 65, 680, { lineGap: 3 });

// ─── PAGE 2: TABLE OF CONTENTS ──────────────
doc.addPage();
doc.fillColor(COLOR_PRIMARY).font('Helvetica-Bold').fontSize(18).text('DAFTAR ISI');
doc.moveDown(0.5);
doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke(COLOR_PRIMARY);
doc.moveDown(1.5);

const toc = [
  { title: '1. Pendahuluan & Gambaran Umum Ekosistem', page: 3 },
  { title: '2. Next.js Web Application (Dashboard & Menu Utama)', page: 4 },
  { title: '3. Manajemen Transaksi Kas (Petty Cash Ledger)', page: 5 },
  { title: '4. Panduan Ekspor & Impor Excel (Auto-fit, Legends, Overflow)', page: 6 },
  { title: '5. Manajemen Bon Karyawan (Piutang Kasbon)', page: 7 },
  { title: '6. Integrasi Telegram Bot (Quick Button & Chat Commands)', page: 8 },
  { title: '7. Cron Jobs Otomatis & Notifikasi Sistem', page: 10 }
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
addHeading1('1. Pendahuluan & Gambaran Umum Ekosistem');
addParagraph('Ekosistem petty cash dan kasbon PT BERKAH AMANAH BERSAMA JAYA MAKMUR (PT BABJM) dirancang untuk memberikan kemudahan pencatatan, transparansi, serta validasi transaksi secara real-time. Ekosistem ini menggabungkan kemudahan entri data, sistem database cloud yang andal, dan aksesibilitas pesan singkat melalui Telegram.');

addHeading2('Struktur Utama Ekosistem:');
addBullet('Frontend Web App (Next.js):', ' Aplikasi antarmuka modern yang berjalan di browser, digunakan oleh admin keuangan untuk memantau rekap visual, melakukan filter transaksi, mencetak laporan PDF, melakukan pengeditan bulk (grid mode), serta mengimpor dan mengekspor data Excel secara profesional.');
addBullet('Backend API (Google Apps Script / GAS):', ' Berfungsi sebagai mesin utama (backend) yang berjalan secara serverless di infrastruktur Google Cloud, menjembatani pertukaran data antara aplikasi web, database Google Sheets, dan Telegram Bot.');
addBullet('Database Cloud (Google Sheets):', ' Digunakan sebagai basis data utama yang menyimpan seluruh histori transaksi Kas_log (Petty Cash) dan Bon (Kasbon). Database ini terstruktur dengan formula otomatis untuk menjamin akurasi saldo akhir berkelanjutan.');
addBullet('Telegram Bot (BABJM Petty Cash Bot):', ' Bot interaktif untuk entri cepat transaksi kas (masuk/keluar) serta kasbon langsung melalui aplikasi Telegram. Bot ini dilengkapi dengan guided form (terpandu) dan auto-reminders untuk penagihan kasbon overdue.');

addCalloutBox('Penting untuk Pengguna Baru', 'Sistem ini menggunakan metode Single-Source of Truth yang berpusat pada Google Sheets. Perubahan data di web app maupun Telegram Bot akan langsung memperbarui Google Sheet secara seketika (real-time). Hindari mengubah formula saldo akhir pada Google Sheets secara manual agar tidak terjadi inkonsistensi data.', 'info');


// ─── PAGE 4: WEB APPLICATION ────────────────
addHeading1('2. Next.js Web Application (Dashboard & Menu)');
addParagraph('Aplikasi web Next.js adalah pusat komando bagi Admin Petty Cash. Di sinilah semua ringkasan dan kendali administratif dilakukan secara visual.');

addHeading2('Struktur Navigasi Utama:');
addBullet('Dashboard (Beranda):', ' Halaman utama yang langsung menampilkan saldo kas kecil saat ini, grafik ringkasan net income bulanan (Debit vs Kredit), status ringkasan bon aktif, serta ringkasan transaksi terbaru.');
addBullet('Transaksi:', ' Lembar kerja ledger kas kecil. Halaman ini digunakan untuk melihat, memfilter, mencari, mencetak, mengedit secara massal, serta melakukan ekspor-impor data dengan berkas Excel.');
addBullet('Bon:', ' Daftar piutang kasbon karyawan yang belum lunas beserta status warning (mendekati batas waktu) dan overdue (melebihi batas waktu 14 hari).');
addBullet('Pengaturan:', ' Digunakan untuk menyinkronkan token Telegram Bot, Chat ID tujuan, URL GAS, API key, serta memuat data parameter sistem.');

addHeading2('Mengakses Aplikasi:');
addParagraph('Aplikasi ini dapat diakses secara lokal oleh developer menggunakan perintah npm run dev atau di-deploy secara komersial menggunakan layanan Vercel. Kredensial URL backend dikonfigurasi melalui variabel lingkungan NEXT_PUBLIC_GAS_URL.');


// ─── PAGE 5: MANAJEMEN TRANSAKSI ─────────────
addHeading1('3. Manajemen Transaksi Kas (Petty Cash Ledger)');
addParagraph('Transaksi kas dicatat dalam tabel dinamis di halaman Transaksi. Berikut adalah panduan cara melakukan pencatatan dan pengelolaan transaksi kas.');

addHeading2('1. Pencatatan Transaksi Tunggal:');
addParagraph('Klik tombol "Transaksi Baru" di pojok kanan atas halaman Transaksi. Sebuah formulir interaktif akan muncul. Isi data dengan ketentuan berikut:');
addBullet('Tanggal Transaksi & Tanggal Nota:', ' Tanggal pencatatan kas dan tanggal fisik bukti nota belanja.');
addBullet('Akun Pengeluaran:', ' Pilih akun/kategori transaksi (misalnya ATK, Operasional, Konsumsi, dll.).');
addBullet('Jenis Kas:', ' Pilih Debit jika kas masuk (misal pengisian kas dari kantor pusat) atau Kredit jika kas keluar.');
addBullet('Nominal:', ' Masukkan angka tanpa simbol mata uang (sistem akan otomatis memformatnya menjadi Rupiah).');
addBullet('Keterangan:', ' Deskripsi detail kegunaan pengeluaran/penerimaan.');

addHeading2('2. Pencatatan Massal (Grid Mode):');
addParagraph('Admin dapat mengedit beberapa transaksi sekaligus secara langsung menggunakan antarmuka mirip Excel. Pilih baris-baris transaksi yang ingin diubah dengan mencentang kotak di kiri tabel, lalu klik tombol "Edit Grid Mode" di baris aksi melayang di bagian bawah layar. Anda dapat mengubah data langsung di dalam sel, lalu menekan simpan.');


// ─── PAGE 6: PANDUAN EKSPOR IMPOR ────────────
addHeading1('4. Panduan Ekspor & Impor Excel');
addParagraph('Untuk mempermudah administrasi berskala besar, sistem dilengkapi dengan fitur impor templat Excel serta ekspor laporan Excel berstandar tinggi.');

addHeading2('1. Impor dari Templat Excel:');
addParagraph('Klik tombol "Import" pada toolbar transaksi. Anda dapat mengunduh templat resmi yang sudah dirancang khusus. Templat ini memiliki sheet panduan dan sheet pengisian dengan kode warna indikator:');
addBullet('Merah (Wajib):', ' Kolom Tanggal wajib diisi.');
addBullet('Kuning (Kondisional):', ' Kolom Keterangan Debit & Debit wajib diisi jika jenisnya Kas Masuk. Kolom Keterangan & Kredit wajib diisi jika Kas Keluar.');
addBullet('Biru (Opsional):', ' Kolom Tgl. Nota, Akun, PIC, No. ID, dan Tgl. Penagihan bersifat opsional.');
addBullet('Abu-abu (Otomatis):', ' Saldo Akhir akan dihitung otomatis oleh sistem, tidak perlu diisi manual.');

addHeading2('2. Ekspor ke Excel:');
addParagraph('Klik tombol "Export" untuk mengunduh laporan Excel. Laporan yang diunduh langsung diformat secara profesional:');
addBullet('Auto-fit Column Width:', ' Semua lebar kolom dihitung otomatis berdasarkan panjang nilai terformat sehingga tidak akan ada teks terpotong atau kode error ###.');
addBullet('Visual Indentation Uraian:', ' Kolom Keterangan Debit (E) dipersempit (lebar 12). Jika berisi data, teks akan meluber secara alami ke kolom Keterangan Kredit (F) yang kosong karena sel kosong diisi dengan null. Hal ini memberikan efek indentasi visual yang rapi.');
addBullet('Total di Tengah (E4:F5):', ' Total Debit dan Kredit diletakkan di baris 4 & 5 kolom E (Label) & F (Nilai) dengan warna latar hijau lembut (Debit) dan merah lembut (Kredit) ber-border tipis.');


// ─── PAGE 7: MANAJEMEN BON ──────────────────
addHeading1('5. Manajemen Bon Karyawan (Piutang Kasbon)');
addParagraph('Kasbon adalah dana kas kecil yang dipinjam oleh karyawan (PIC) untuk keperluan dinas atau darurat dan wajib dipertanggungjawabkan dengan melampirkan nota pengeluaran asli.');

addHeading2('Status Batas Waktu Kasbon:');
addParagraph('Setiap bon kas baru memiliki batas pertanggungjawaban maksimal 14 hari kerja. Sistem melacak status bon ke dalam 3 tingkatan:');
addBullet('Normal (Hari 1 s.d. 9):', ' Status aman, kasbon baru dicatat dan belum jatuh tempo.');
addBullet('Warning (Hari 10 s.d. 13):', ' Status peringatan. Sistem menandai dengan warna kuning karena batas jatuh tempo segera habis.');
addBullet('Overdue (Hari 14 ke atas):', ' Status jatuh tempo terlampaui. Sistem menandai dengan warna merah bold. Notifikasi peringatan penagihan harian akan dikirim otomatis ke grup Telegram.');

addHeading2('Alur Pelunasan Kasbon (Settle):');
addParagraph('Ketika karyawan menyerahkan bukti nota belanja asli, admin mencatat pelunasan dengan menekan tombol "Lunas" di halaman Bon, mengisi nominal riil belanja, lalu menyimpan data. Selisih belanja (jika ada) akan otomatis disesuaikan menjadi transaksi kas masuk/keluar baru oleh sistem.');


// ─── PAGE 8: INTEGRASI TELEGRAM BOT ──────────
addHeading1('6. Integrasi Telegram Bot (Quick Menu)');
addParagraph('Telegram Bot merupakan gerbang utama bagi karyawan di lapangan maupun pimpinan untuk mengakses data kas secara cepat tanpa harus membuka komputer.');

addHeading2('1. Tombol Menu Utama (Keyboard Buttons):');
addParagraph('Setelah menekan perintah /start pada bot, keyboard interaktif di bagian bawah layar Telegram akan menyajikan tombol akses cepat berikut:');
addBullet('🟢 Kas Masuk:', ' Memulai alur panduan cepat mencatat transaksi Debit.');
addBullet('🔴 Kas Keluar:', ' Memulai alur panduan cepat mencatat transaksi Kredit.');
addBullet('📋 Bon Baru:', ' Memulai alur panduan cepat mencatat pengajuan kasbon baru.');
addBullet('🔍 Monitor Bon:', ' Menampilkan list bon karyawan yang berstatus belum lunas.');
addBullet('💳 Cek Saldo:', ' Mengecek jumlah saldo petty cash aktif saat ini.');
addBullet('📊 Rekap Transaksi:', ' Menampilkan rekap ringkas transaksi hari ini atau minggu ini.');

addHeading3('Flow Pengisian Cepat Kas Masuk / Kas Keluar:');
addParagraph('Cukup klik tombol "Kas Masuk" atau "Kas Keluar", lalu ketik pesan dengan format: [Nominal] [Keterangan]. Bot mendukung pembacaan nominal dengan singkatan bahasa Indonesia umum, misalnya:');
addCodeBlock('1.5jt Pengisian Saldo Kas Kecil\n500rb Beli ATK Kantor\n25k Parkir Logistik');


// ─── PAGE 9: TELEGRAM COMMANDS ──────────────
addHeading1('6. Integrasi Telegram Bot (Lanjutan)');
addParagraph('Selain tombol keyboard interaktif, pengguna terdaftar dapat menggunakan command chat manual untuk berinteraksi dengan sistem.');

addHeading2('Daftar Perintah Bot Lengkap:');
addBullet('/start', ' Mengaktifkan bot Telegram dan mendaftarkan sesi chat pengguna.');
addBullet('/help', ' Menampilkan ringkasan bantuan cara penggunaan bot.');
addBullet('/saldo', ' Menampilkan saldo petty cash terkini secara real-time dari Google Sheet.');
addBullet('/rekap [jumlah_baris]', ' Menampilkan rekap transaksi terakhir. Contoh: /rekap 5');
addBullet('/monitor', ' Menampilkan daftar bon luar (outstanding) beserta status umur bon.');
addBullet('/kas [debit/kredit] [nominal] [keterangan]', ' Mencatat kas baru dalam satu baris perintah. Contoh: /kas kredit 50rb Beli Materai');
addBullet('/bon [nama_pic] [nominal] [keterangan]', ' Mencatat kasbon baru dalam satu baris perintah. Contoh: /bon Rio 100k Bensin Logistik');
addBullet('/lunas [ID_BON]', ' Melunasi kasbon tertentu berdasarkan ID Bon. Contoh: /lunas BON-202606-003');

addHeading2('Pelunasan Instan Via Tautan Chat:');
addParagraph('Ketika melakukan /monitor atau menerima notifikasi harian, bot akan mencantumkan tautan kelunasan instan di sebelah nama PIC, misalnya /lunas_BON_202606_003. Admin cukup mengeklik teks tautan biru tersebut di Telegram untuk melunasi bon tersebut tanpa perlu mengetik ulang ID secara manual.');


// ─── PAGE 10: CRON JOBS & NOTIFIKASI ─────────
addHeading1('7. Cron Jobs Otomatis & Notifikasi Sistem');
addParagraph('Ekosistem ini dilengkapi dengan otomatisasi terjadwal yang memastikan tidak ada transaksi atau kasbon yang terlewatkan.');

addHeading2('1. Pengingat Harian (Daily Overdue Reminders):');
addParagraph('Setiap pagi pukul 08:00 WIB, pemicu waktu (Time-driven trigger) Google Apps Script akan memeriksa seluruh data kasbon. Jika ditemukan bon dengan status "Overdue" (umur bon >= 14 hari) atau "Warning" (umur bon >= 10 hari), sistem akan menyusun daftar rekapitulasi penagihan dan mengirimkannya secara otomatis ke grup Telegram default.');

addHeading3('2. Notifikasi Kejadian Real-time:');
addParagraph('GAS juga secara aktif mengirimkan notifikasi instan ke Telegram saat terjadi aktivitas penting di aplikasi web:');
addBullet('Notifikasi Transaksi Baru:', ' Memberitahukan detail tanggal, jenis (Debit/Kredit), keterangan, nominal, dan saldo terkini setiap kali ada entri baru.');
addBullet('Notifikasi Bon Baru:', ' Memberitahukan pencatatan kasbon baru lengkap dengan ID Bon, nama PIC, nominal, dan batas tenggat waktu.');
addBullet('Notifikasi Kasbon Lunas:', ' Memberitahukan penyelesaian kasbon lengkap dengan nama PIC dan waktu penyelesaian dalam hitungan hari.');

addCalloutBox('Pemeliharaan Sistem', 'Jika notifikasi berhenti berfungsi, harap periksa kembali token Telegram Bot dan Chat ID di halaman Pengaturan Aplikasi Web, dan pastikan webhook GAS tidak terblokir.', 'kredit');


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
