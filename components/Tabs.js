'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { ITEM_HARIAN, ITEM_MINGGUAN, STATUS_ROADMAP } from '@/lib/config';
import {
  angka, blnIndo, bulanIni, formatRibuan, hitungRekap, jam, rentangBulan, rp, tglIndo
} from '@/lib/util';

/* ---------- bantu ---------- */

function namaDari(data, id) {
  const m = data.members.find((x) => x.id === id);
  return m ? m.nama : '-';
}

// Peta item -> { user_id: row }
function petakan(rows) {
  const map = {};
  rows.forEach((r) => {
    (map[r.item] = map[r.item] || {})[r.user_id] = r;
  });
  return map;
}

function WhoChips({ data, st }) {
  const ids = Object.keys(st);
  const urut = ids.sort((a, b) => (st[a].waktu < st[b].waktu ? -1 : 1));
  const first = urut.length >= 2 && st[urut[0]].waktu !== st[urut[1]].waktu ? urut[0] : '';
  return (
    <div className="whos">
      {data.members.map((u) => {
        const r = st[u.id];
        const cls = 'who' + (r ? ' on' : '') + (u.id === first ? ' first' : '');
        return (
          <span key={u.id} className={cls}>
            {u.nama} {r ? '✓ ' + jam(r.waktu) : '–'}{u.id === first ? ' 👑' : ''}
          </span>
        );
      })}
    </div>
  );
}

function Checklist({ data, items, rows, onToggle, catatan }) {
  const [busy, setBusy] = useState('');
  const map = petakan(rows);
  return items.map((it, i) => {
    const st = map[it.id] || {};
    const mine = st[data.me];
    return (
      <button
        key={it.id}
        type="button"
        className={'item' + (mine ? ' done' : '') + (i === 0 ? ' first' : '')}
        disabled={busy === it.id}
        onClick={async () => {
          setBusy(it.id);
          await onToggle(it, mine);
          setBusy('');
        }}
      >
        <div className="box">{'✓'}</div>
        <div className="txt">
          <div className="lbl">{it.label}</div>
          {it.batas ? <div className="muted">Tepat waktu sebelum {it.batas}</div> : null}
          {catatan ? <div className="muted">{catatan}</div> : null}
          <WhoChips data={data} st={st} />
        </div>
      </button>
    );
  });
}

/* ---------- Hari Ini ---------- */

export function TabHari({ data, run, me }) {
  const partner = data.members.find((m) => m.id !== me);
  const hitung = (uid) => ITEM_HARIAN.filter((it) => data.harian.some((r) => r.item === it.id && r.user_id === uid)).length;
  const mine = hitung(me);
  const his = partner ? hitung(partner.id) : 0;
  const total = ITEM_HARIAN.length;
  const { juara } = hitungRekap(data.members, data.harian, []);
  const grup = [...new Set(ITEM_HARIAN.map((i) => i.grup))];

  const toggle = (it, mineRow) =>
    run(() =>
      mineRow
        ? supabase.from('harian').delete().eq('id', mineRow.id)
        : supabase.from('harian').insert({ tanggal: data.today, user_id: me, item: it.id })
    );

  return (
    <>
      <div className="card">
        <div className="progress-pair">
          <div className="pp me">
            {namaDari(data, me)}<b>{mine}/{total}</b>
            <div className="bar"><i style={{ width: (mine / total) * 100 + '%' }} /></div>
          </div>
          {partner && (
            <div className="pp">
              {partner.nama}<b>{his}/{total}</b>
              <div className="bar rose"><i style={{ width: (his / total) * 100 + '%' }} /></div>
            </div>
          )}
        </div>
        <div className="muted" style={{ marginTop: 8 }}>
          {juara === 'seri'
            ? 'Hari ini masih seri, ayo kejar!'
            : juara
              ? <>Unggul hari ini: <b>{namaDari(data, juara)}</b> {'👑'}</>
              : 'Belum ada poin hari ini.'}
        </div>
      </div>

      {grup.map((g) => (
        <div className="card" key={g}>
          <div className="group-title">{g}</div>
          <Checklist data={data} items={ITEM_HARIAN.filter((i) => i.grup === g)} rows={data.harian} onToggle={toggle} />
        </div>
      ))}

      {data.mode === 'LDR' && (
        <div className="card">
          <h3>Mode LDR aktif</h3>
          <div className="muted">
            Kabar saat berangkat, tiba di tujuan, dan pulang. Bila sinyal susah, cukup kabar singkat dan dilanjutkan saat memungkinkan.
          </div>
        </div>
      )}
    </>
  );
}

/* ---------- Mingguan ---------- */

export function TabMinggu({ data, run, me }) {
  const toggle = (it, mineRow) =>
    run(() =>
      mineRow
        ? supabase.from('mingguan').delete().eq('id', mineRow.id)
        : supabase.from('mingguan').insert({ minggu: data.minggu, user_id: me, item: it.id })
    );

  return (
    <>
      <div className="card">
        <h3>Minggu ini ({data.minggu})</h3>
        <div className="muted">Senin sampai Minggu. Tandai setelah kegiatan dilakukan.</div>
      </div>
      <div className="card">
        <Checklist
          data={data}
          items={ITEM_MINGGUAN}
          rows={data.mingguan}
          onToggle={toggle}
          catatan={data.mode === 'LDR' ? 'Saat LDR: lewat video call' : ''}
        />
      </div>
    </>
  );
}

/* ---------- Bulanan ---------- */

export function TabBulan({ data, run, me }) {
  const mine = data.bulanan.find((r) => r.user_id === me) || {};
  const partner = data.members.find((m) => m.id !== me);
  const his = partner ? data.bulanan.find((r) => r.user_id === partner.id) : null;
  const [f, setF] = useState({
    hal_baik: mine.hal_baik || '',
    perlu_diperbaiki: mine.perlu_diperbaiki || '',
    catatan: mine.catatan || ''
  });

  const simpan = () =>
    run(
      () =>
        supabase.from('bulanan').upsert(
          { bulan: data.bulan, user_id: me, ...f, waktu: new Date().toISOString() },
          { onConflict: 'bulan,user_id' }
        ),
      'Evaluasi tersimpan.'
    );

  const ubah = (k) => (e) => setF({ ...f, [k]: e.target.value });

  return (
    <>
      <div className="card">
        <h3>Evaluasi {blnIndo(data.bulan)}</h3>
        <div className="muted">Sekalian cek progres tabungan dan roadmap, lalu review SOP bersama.</div>
        <label className="f">Yang sudah baik bulan ini</label>
        <textarea value={f.hal_baik} onChange={ubah('hal_baik')} />
        <label className="f">Yang perlu diperbaiki</label>
        <textarea value={f.perlu_diperbaiki} onChange={ubah('perlu_diperbaiki')} />
        <label className="f">Catatan / usulan revisi SOP</label>
        <textarea value={f.catatan} onChange={ubah('catatan')} />
        <button className="btn block" style={{ marginTop: 12 }} onClick={simpan}>Simpan evaluasi</button>
        {mine.waktu && <div className="muted" style={{ marginTop: 6 }}>Terakhir disimpan {tglIndo(mine.waktu.slice(0, 10))} {jam(mine.waktu)}</div>}
      </div>

      {partner && (
        <div className="card">
          <h3>Evaluasi dari {partner.nama}</h3>
          {his ? (
            <>
              <div className="muted">Yang sudah baik</div>
              <div className="partner-note">{his.hal_baik || '-'}</div>
              <div className="muted" style={{ marginTop: 8 }}>Yang perlu diperbaiki</div>
              <div className="partner-note">{his.perlu_diperbaiki || '-'}</div>
              <div className="muted" style={{ marginTop: 8 }}>Catatan</div>
              <div className="partner-note">{his.catatan || '-'}</div>
            </>
          ) : (
            <div className="muted">Belum mengisi evaluasi bulan ini.</div>
          )}
        </div>
      )}
    </>
  );
}

/* ---------- Target: tabungan + roadmap ---------- */

export function TabTarget({ data, run, me, setModal }) {
  const [nom, setNom] = useState('');
  const [ket, setKet] = useState('');
  const total = data.tabungan.reduce((s, r) => s + Number(r.nominal), 0);
  const perUser = (uid) => data.tabungan.filter((r) => r.user_id === uid).reduce((s, r) => s + Number(r.nominal), 0);
  const target = data.target;
  const pct = target > 0 ? Math.min(100, (total / target) * 100) : 0;

  const tambah = async () => {
    const n = angka(nom);
    if (!(n > 0)) {
      run(async () => ({ error: { message: 'Nominal tabungan harus lebih dari 0.' } }));
      return;
    }
    const ok = await run(
      () => supabase.from('tabungan').insert({ tanggal: data.today, user_id: me, nominal: n, keterangan: ket.trim() }),
      'Setoran tersimpan.'
    );
    if (ok) { setNom(''); setKet(''); }
  };

  const ubahTarget = () => setModal(<FormTarget awal={target} run={run} tutup={() => setModal(null)} />);

  const hapus = (r) =>
    setModal(
      <>
        <h3>Hapus setoran {rp(r.nominal)}?</h3>
        <div className="row" style={{ marginTop: 14 }}>
          <button className="btn ghost" onClick={() => setModal(null)}>Batal</button>
          <button
            className="btn"
            style={{ flex: 1 }}
            onClick={() => { setModal(null); run(() => supabase.from('tabungan').delete().eq('id', r.id), 'Setoran dihapus.'); }}
          >
            Hapus
          </button>
        </div>
      </>
    );

  return (
    <>
      <div className="card">
        <div className="row between">
          <h3 style={{ margin: 0 }}>Tabungan nikah</h3>
          <button className="btn ghost small" onClick={ubahTarget}>Ubah target</button>
        </div>
        <div className="money" style={{ marginTop: 10 }}>{rp(total)}</div>
        <div className="muted">dari target {target > 0 ? rp(target) : <b>belum diisi</b>}</div>
        <div className="bigbar"><i style={{ width: pct + '%' }} /></div>
        <div className="row between muted">
          <span>{pct.toFixed(1)}% tercapai</span>
          <span>{target > total ? 'Kurang ' + rp(target - total) : target > 0 ? 'Target tercapai!' : ''}</span>
        </div>
        <div className="progress-pair" style={{ marginTop: 12 }}>
          {data.members.map((u) => (
            <div key={u.id} className={'pp' + (u.id === me ? ' me' : '')}>{u.nama}<b>{rp(perUser(u.id))}</b></div>
          ))}
        </div>
      </div>

      <div className="card">
        <h3>Tambah setoran</h3>
        <input className="in" inputMode="numeric" placeholder="Nominal, contoh 500.000" value={nom} onChange={(e) => setNom(formatRibuan(e.target.value))} />
        <input className="in" style={{ marginTop: 8 }} placeholder="Keterangan (opsional)" value={ket} onChange={(e) => setKet(e.target.value)} />
        <button className="btn block" style={{ marginTop: 10 }} onClick={tambah}>Simpan setoran</button>
      </div>

      <div className="card">
        <h3>Riwayat setoran</h3>
        {data.tabungan.length ? data.tabungan.slice(0, 50).map((r, i) => (
          <div key={r.id} className={'list-line' + (i === 0 ? ' first' : '')}>
            <div>
              <b>{rp(r.nominal)}</b> &middot; {namaDari(data, r.user_id)}
              <div className="muted">{tglIndo(r.tanggal)}{r.keterangan ? ' · ' + r.keterangan : ''}</div>
            </div>
            {r.user_id === me && <button className="del" onClick={() => hapus(r)}>Hapus</button>}
          </div>
        )) : <div className="muted">Belum ada setoran.</div>}
      </div>

      <div className="card">
        <h3>Roadmap menuju pernikahan</h3>
        {data.roadmap.map((r, i) => <LangkahRoadmap key={r.id + (r.diubah || '')} r={r} first={i === 0} run={run} me={me} />)}
      </div>
    </>
  );
}

function FormTarget({ awal, run, tutup }) {
  const [v, setV] = useState(awal ? formatRibuan(String(awal)) : '');
  const simpan = async () => {
    const n = angka(v);
    if (!(n > 0)) {
      run(async () => ({ error: { message: 'Target tabungan harus lebih dari 0.' } }));
      return;
    }
    tutup();
    run(() => supabase.from('pengaturan').update({ nilai: String(n) }).eq('kunci', 'target_tabungan'), 'Target tersimpan.');
  };
  return (
    <>
      <h3>Target tabungan nikah</h3>
      <input className="in" inputMode="numeric" placeholder="Contoh 50.000.000" value={v} onChange={(e) => setV(formatRibuan(e.target.value))} />
      <div className="row" style={{ marginTop: 14 }}>
        <button className="btn ghost" onClick={tutup}>Batal</button>
        <button className="btn" style={{ flex: 1 }} onClick={simpan}>Simpan</button>
      </div>
    </>
  );
}

function LangkahRoadmap({ r, first, run, me }) {
  const [target, setTarget] = useState(r.target || '');
  const [status, setStatus] = useState(r.status || 'Belum');
  const simpan = () =>
    run(
      () => supabase.from('roadmap')
        .update({ target: target.trim(), status, diubah_oleh: me, diubah: new Date().toISOString() })
        .eq('id', r.id),
      'Roadmap tersimpan.'
    );
  return (
    <div className={'rm-step' + (first ? ' first' : '')}>
      <div className="row between">
        <b>{r.langkah}</b>
        <span className={'status st-' + r.status}>{r.status}</span>
      </div>
      <div className="rm-grid">
        <input className="in" placeholder="Target waktu, contoh Maret 2027" value={target} onChange={(e) => setTarget(e.target.value)} />
        <select className="in" value={status} onChange={(e) => setStatus(e.target.value)}>
          {STATUS_ROADMAP.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>
      <button className="btn ghost small" style={{ marginTop: 8 }} onClick={simpan}>Simpan</button>
    </div>
  );
}

/* ---------- Rekap lomba ---------- */

export function TabRekap({ data, toast }) {
  const [bulan, setBulan] = useState(bulanIni());
  const [rekap, setRekap] = useState(null);

  useEffect(() => {
    let batal = false;
    const { awal, akhir } = rentangBulan(bulan);
    Promise.all([
      supabase.from('harian').select('tanggal, user_id, item, waktu').gte('tanggal', awal).lte('tanggal', akhir),
      supabase.from('mingguan').select('user_id, item, waktu')
        .gte('waktu', `${awal}T00:00:00+08:00`).lte('waktu', `${akhir}T23:59:59.999+08:00`)
    ]).then(([h, m]) => {
      if (batal) return;
      if (h.error || m.error) {
        toast((h.error || m.error).message);
        return;
      }
      setRekap(hitungRekap(data.members, h.data, m.data));
    });
    return () => { batal = true; };
  }, [bulan, data, toast]);

  const baris = [
    ['Centang harian', 'centang'],
    ['Duluan', 'duluan'],
    ['Tepat waktu', 'tepat'],
    ['Kegiatan mingguan', 'mingguan'],
    ['Hari sholat lengkap', 'sholatLengkap']
  ];

  return (
    <>
      <div className="card">
        <label className="f" style={{ marginTop: 0 }}>Pilih bulan</label>
        <input type="month" className="in" value={bulan} onChange={(e) => e.target.value && setBulan(e.target.value)} />
      </div>

      {rekap && (
        <>
          <div className="card champ">
            <div className="crown">{'🏆'}</div>
            {rekap.juara === 'seri' ? (
              <><b>Seri!</b><div className="muted">Poin kalian sama kuat</div></>
            ) : rekap.juara ? (
              <><b>{namaDari(data, rekap.juara)}</b><div className="muted">memimpin {blnIndo(bulan)}</div></>
            ) : (
              <><b>Belum ada poin</b><div className="muted">{blnIndo(bulan)}</div></>
            )}
          </div>

          <div className="score">
            {rekap.list.map((s, i) => (
              <div key={s.id} className={'sc' + (i === 0 && rekap.juara && rekap.juara !== 'seri' ? ' lead' : '')}>
                <div className="muted">{s.nama}</div>
                <div className="pts">{s.poin}</div>
                <div className="muted">poin</div>
              </div>
            ))}
          </div>

          <div className="card">
            <table className="rk">
              <thead>
                <tr><th>Rincian</th>{rekap.list.map((s) => <th key={s.id}>{s.nama}</th>)}</tr>
              </thead>
              <tbody>
                {baris.map(([label, k]) => (
                  <tr key={k}><td>{label}</td>{rekap.list.map((s) => <td key={s.id}>{s[k]}</td>)}</tr>
                ))}
              </tbody>
            </table>
            <div className="muted" style={{ marginTop: 10 }}>
              Poin = centang harian + duluan + tepat waktu + kegiatan mingguan. &quot;Duluan&quot; dihitung bila kalian berdua
              mencentang item yang sama; yang lebih dulu dapat 1 poin.
            </div>
          </div>
        </>
      )}
    </>
  );
}
