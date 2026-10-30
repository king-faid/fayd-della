import { ITEM_HARIAN, ITEM_SHOLAT } from './config';

export const TZ = 'Asia/Makassar';

// Bagian tanggal/jam dalam WITA dari sebuah Date
function parts(d) {
  const f = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  }).formatToParts(d);
  const o = {};
  f.forEach((p) => { o[p.type] = p.value; });
  return o;
}

export function hariIni() {
  const p = parts(new Date());
  return `${p.year}-${p.month}-${p.day}`;
}

export function bulanIni() {
  return hariIni().slice(0, 7);
}

// Jam HH:mm (WITA) dari timestamp
export function jam(ts) {
  if (!ts) return '';
  const p = parts(new Date(ts));
  return `${p.hour}:${p.minute}`;
}

// Bulan yyyy-MM (WITA) dari timestamp
export function bulanDari(ts) {
  const p = parts(new Date(ts));
  return `${p.year}-${p.month}`;
}

// Kunci minggu ISO, contoh "2026-W44" (Senin awal minggu)
export function kunciMinggu(ymd) {
  const [y0, m, d] = ymd.split('-').map(Number);
  const t = new Date(Date.UTC(y0, m - 1, d));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const y = t.getUTCFullYear();
  const w = Math.ceil(((t - Date.UTC(y, 0, 1)) / 864e5 + 1) / 7);
  return `${y}-W${String(w).padStart(2, '0')}`;
}

// Rentang tanggal sebuah bulan, untuk query
export function rentangBulan(ym) {
  const [y, m] = ym.split('-').map(Number);
  const akhir = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { awal: `${ym}-01`, akhir: `${ym}-${String(akhir).padStart(2, '0')}` };
}

const BLN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

export function tglIndo(ymd) {
  const [y, m, d] = String(ymd).split('-');
  return `${Number(d)} ${BLN[Number(m) - 1]} ${y}`;
}

export function blnIndo(ym) {
  const [y, m] = String(ym).split('-');
  return `${BULAN[Number(m) - 1]} ${y}`;
}

export function rp(n) {
  return 'Rp ' + new Intl.NumberFormat('id-ID').format(Math.round(n || 0));
}

export function angka(s) {
  return Number(String(s || '').replace(/[^\d]/g, '')) || 0;
}

export function formatRibuan(s) {
  const n = String(s || '').replace(/[^\d]/g, '');
  return n ? new Intl.NumberFormat('id-ID').format(Number(n)) : '';
}

/**
 * Rekap lomba untuk satu periode.
 * harian: baris harian di periode itu; mingguan: baris mingguan di periode itu.
 * Poin = centang harian + duluan + tepat waktu + kegiatan mingguan.
 */
export function hitungRekap(members, harian, mingguan) {
  const skor = {};
  members.forEach((u) => {
    skor[u.id] = { id: u.id, nama: u.nama, centang: 0, duluan: 0, tepat: 0, sholatLengkap: 0, mingguan: 0, poin: 0 };
  });

  const grup = {};
  const sholat = {};
  harian.forEach((r) => {
    const s = skor[r.user_id];
    if (!s) return;
    s.centang++;
    const it = ITEM_HARIAN.find((i) => i.id === r.item);
    if (it && it.batas && jam(r.waktu) <= it.batas) s.tepat++;
    const k = `${r.tanggal}|${r.item}`;
    (grup[k] = grup[k] || []).push(r);
    if (ITEM_SHOLAT.includes(r.item)) {
      const kh = `${r.user_id}|${r.tanggal}`;
      sholat[kh] = (sholat[kh] || 0) + 1;
    }
  });

  Object.values(grup).forEach((rows) => {
    if (rows.length < 2) return;
    rows.sort((a, b) => (a.waktu < b.waktu ? -1 : 1));
    if (rows[0].waktu !== rows[1].waktu && skor[rows[0].user_id]) skor[rows[0].user_id].duluan++;
  });

  Object.entries(sholat).forEach(([kh, n]) => {
    if (n >= ITEM_SHOLAT.length) {
      const uid = kh.split('|')[0];
      if (skor[uid]) skor[uid].sholatLengkap++;
    }
  });

  mingguan.forEach((r) => {
    if (skor[r.user_id]) skor[r.user_id].mingguan++;
  });

  const list = Object.values(skor)
    .map((s) => ({ ...s, poin: s.centang + s.duluan + s.tepat + s.mingguan }))
    .sort((a, b) => b.poin - a.poin);

  let juara = '';
  if (list.length > 1 && list[0].poin > 0) juara = list[0].poin > list[1].poin ? list[0].id : 'seri';
  return { list, juara };
}
