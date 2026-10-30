'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase, supabaseReady } from '@/lib/supabase';
import { bulanIni, hariIni, kunciMinggu, tglIndo } from '@/lib/util';
import Login from '@/components/Login';
import Modal from '@/components/Modal';
import { TabHari, TabMinggu, TabBulan, TabTarget, TabRekap } from '@/components/Tabs';

const TABS = [
  { id: 'hari', ikon: '☀️', label: 'Hari Ini' },
  { id: 'minggu', ikon: '📅', label: 'Mingguan' },
  { id: 'bulan', ikon: '📝', label: 'Bulanan' },
  { id: 'target', ikon: '💍', label: 'Target' },
  { id: 'rekap', ikon: '🏆', label: 'Rekap' }
];

export default function Home() {
  const [session, setSession] = useState(undefined);
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('hari');
  const [loading, setLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [modal, setModal] = useState(null);
  const toastTimer = useRef(null);

  const toast = useCallback((m) => {
    setToastMsg(m);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(''), 2600);
  }, []);

  // Sesi login
  useEffect(() => {
    if (!supabaseReady) return;
    supabase.auth.getSession().then(({ data: d }) => setSession(d.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  // Ambil semua data hari / minggu / bulan ini
  const load = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    const today = hariIni();
    const minggu = kunciMinggu(today);
    const bulan = bulanIni();
    const [pr, hr, mg, bl, tb, rm, st] = await Promise.all([
      supabase.from('profiles').select('id, username, nama').order('username'),
      supabase.from('harian').select('*').eq('tanggal', today),
      supabase.from('mingguan').select('*').eq('minggu', minggu),
      supabase.from('bulanan').select('*').eq('bulan', bulan),
      supabase.from('tabungan').select('*').order('tanggal', { ascending: false }).order('created_at', { ascending: false }),
      supabase.from('roadmap').select('*').order('id'),
      supabase.from('pengaturan').select('*')
    ]);
    setLoading(false);
    const gagal = [pr, hr, mg, bl, tb, rm, st].find((r) => r.error);
    if (gagal) {
      toast('Gagal memuat data: ' + gagal.error.message);
      return;
    }
    const set = {};
    st.data.forEach((r) => { set[r.kunci] = r.nilai; });
    setData({
      me: session.user.id,
      members: pr.data,
      today,
      minggu,
      bulan,
      harian: hr.data,
      mingguan: mg.data,
      bulanan: bl.data,
      tabungan: tb.data,
      roadmap: rm.data,
      target: Number(set.target_tabungan) || 0,
      mode: set.mode || 'Satu Kota'
    });
  }, [session, toast]);

  useEffect(() => { load(); }, [load]);

  // Realtime: centang pasangan langsung tampil
  useEffect(() => {
    if (!session) return;
    const ch = supabase
      .channel('sop-sayang')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'harian' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mingguan' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pengaturan' }, () => load())
      .subscribe();
    const onFocus = () => load();
    window.addEventListener('focus', onFocus);
    return () => {
      supabase.removeChannel(ch);
      window.removeEventListener('focus', onFocus);
    };
  }, [session, load]);

  // Jalankan aksi database, tampilkan error, lalu muat ulang
  const run = useCallback(async (fn, pesanSukses) => {
    setLoading(true);
    const { error } = await fn();
    setLoading(false);
    if (error) {
      toast(error.message);
      return false;
    }
    if (pesanSukses) toast(pesanSukses);
    await load();
    return true;
  }, [load, toast]);

  if (!supabaseReady) {
    return (
      <div className="center">
        <div className="card">
          <h3>Supabase belum dihubungkan</h3>
          <div className="muted">Isi NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY di Vercel atau .env.local.</div>
        </div>
      </div>
    );
  }

  if (session === undefined) return <div className="loading" />;
  if (!session) return <Login />;

  const meProfile = data && data.members.find((m) => m.id === data.me);

  if (data && !meProfile) {
    return (
      <div className="center">
        <div className="card">
          <h3>Akun belum terdaftar</h3>
          <div className="muted">Email {session.user.email} belum ada di tabel profiles. Jalankan perintah insert profiles di supabase/schema.sql.</div>
          <button className="btn ghost block" style={{ marginTop: 14 }} onClick={() => supabase.auth.signOut()}>Keluar</button>
        </div>
      </div>
    );
  }

  const gantiMode = () => {
    const next = data.mode === 'LDR' ? 'Satu Kota' : 'LDR';
    setModal(
      <>
        <h3>Ganti mode ke {next}?</h3>
        <p className="muted">
          {next === 'LDR'
            ? 'Mode LDR: kabar saat berangkat, tiba, dan pulang; telepon menyesuaikan jadwal.'
            : 'Kembali ke mode satu kota.'}
        </p>
        <div className="row" style={{ marginTop: 14 }}>
          <button className="btn ghost" onClick={() => setModal(null)}>Batal</button>
          <button
            className="btn"
            style={{ flex: 1 }}
            onClick={() => {
              setModal(null);
              run(() => supabase.from('pengaturan').update({ nilai: next }).eq('kunci', 'mode'), 'Mode diganti ke ' + next);
            }}
          >
            Ya, ganti
          </button>
        </div>
      </>
    );
  };

  const akun = () => setModal(<Akun email={session.user.email} nama={meProfile.nama} tutup={() => setModal(null)} toast={toast} />);

  const props = { data, run, toast, setModal, me: session.user.id };

  return (
    <>
      {loading && <div className="loading" />}
      <header className="top">
        <div className="hdr">
          <div>
            <h2>Hai, {meProfile ? meProfile.nama : ''}</h2>
            <small>{data ? tglIndo(data.today) : ''}</small>
          </div>
          {data && (
            <div className="hdr-actions">
              <button className="chip-mode" onClick={gantiMode}>{data.mode === 'LDR' ? 'Mode LDR' : 'Satu Kota'}</button>
              <button className="icon-btn" onClick={akun} aria-label="Akun">{'⚙'}</button>
            </div>
          )}
        </div>
      </header>

      <main>
        {data && tab === 'hari' && <TabHari {...props} />}
        {data && tab === 'minggu' && <TabMinggu {...props} />}
        {data && tab === 'bulan' && <TabBulan {...props} />}
        {data && tab === 'target' && <TabTarget {...props} />}
        {data && tab === 'rekap' && <TabRekap {...props} />}
      </main>

      <nav className="bottom">
        {TABS.map((t) => (
          <button key={t.id} className={tab === t.id ? 'on' : ''} onClick={() => { setTab(t.id); window.scrollTo(0, 0); }}>
            <span>{t.ikon}</span>{t.label}
          </button>
        ))}
      </nav>

      {modal && <Modal onClose={() => setModal(null)}>{modal}</Modal>}
      {toastMsg && <div className="toast">{toastMsg}</div>}
    </>
  );
}

function Akun({ email, nama, tutup, toast }) {
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);

  const simpan = async () => {
    if (pw.length < 6) {
      toast('Password minimal 6 karakter.');
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) toast(error.message);
    else {
      tutup();
      toast('Password berhasil diganti.');
    }
  };

  return (
    <>
      <h3>Akun {nama}</h3>
      <p className="muted">{email}</p>
      <label className="f">Password baru</label>
      <input className="in" type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Minimal 6 karakter" />
      <div className="row" style={{ marginTop: 14 }}>
        <button className="btn ghost" onClick={tutup}>Tutup</button>
        <button className="btn" style={{ flex: 1 }} disabled={busy} onClick={simpan}>Simpan password</button>
      </div>
      <button className="btn ghost block" style={{ marginTop: 14 }} onClick={() => { tutup(); supabase.auth.signOut(); }}>Keluar</button>
    </>
  );
}
