// Isi SOP yang tampil di aplikasi. Ubah di sini saat SOP direvisi.
// batas = jam terakhir dianggap "tepat waktu" (HH:mm, WITA). Kosongkan bila belum ditentukan.
export const ITEM_HARIAN = [
  { id: 'subuh', label: 'Sholat Subuh', grup: 'Sholat 5 Waktu', batas: '' },
  { id: 'dzuhur', label: 'Sholat Dzuhur', grup: 'Sholat 5 Waktu', batas: '' },
  { id: 'ashar', label: 'Sholat Ashar', grup: 'Sholat 5 Waktu', batas: '' },
  { id: 'maghrib', label: 'Sholat Maghrib', grup: 'Sholat 5 Waktu', batas: '' },
  { id: 'isya', label: 'Sholat Isya', grup: 'Sholat 5 Waktu', batas: '' },
  { id: 'sapa_pagi', label: 'Sapaan pagi', grup: 'Komunikasi', batas: '08:00' },
  { id: 'rencana', label: 'Kabar rencana hari ini', grup: 'Komunikasi', batas: '09:00' },
  { id: 'makan_siang', label: 'Saling ingatkan makan siang', grup: 'Komunikasi', batas: '13:00' },
  { id: 'cerita', label: 'Cerita hari ini / telepon', grup: 'Komunikasi', batas: '' },
  { id: 'sapa_malam', label: 'Ucapan malam & doa', grup: 'Komunikasi', batas: '' }
];

export const ITEM_SHOLAT = ['subuh', 'dzuhur', 'ashar', 'maghrib', 'isya'];

export const ITEM_MINGGUAN = [
  { id: 'kencan', label: 'Quality time / kencan' },
  { id: 'ngobrol', label: 'Ngobrol serius: perasaan, ganjalan, apresiasi' },
  { id: 'kegiatan', label: 'Kegiatan bersama: ibadah, olahraga, belajar' }
];

export const STATUS_ROADMAP = ['Belum', 'Proses', 'Selesai'];
