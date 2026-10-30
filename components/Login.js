'use client';

import { useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { AKUN } from '@/lib/config';

export default function Login() {
  const [pilih, setPilih] = useState('');
  const [pin, setPin] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const pinRef = useRef(null);

  const masuk = async (e) => {
    e.preventDefault();
    setErr('');
    const akun = AKUN.find((a) => a.username === pilih);
    if (!akun) {
      setErr('Pilih dulu: Faid atau Della.');
      return;
    }
    if (!/^\d{6}$/.test(pin)) {
      setErr('PIN harus 6 angka.');
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: akun.email, password: pin });
    setBusy(false);
    if (error) {
      setErr(error.message === 'Invalid login credentials' ? 'PIN salah, coba lagi ya.' : error.message);
      setPin('');
    }
  };

  return (
    <div className="login-wrap">
      <div className="hearts" aria-hidden="true">
        <span>{'♥'}</span><span>{'♥'}</span><span>{'♥'}</span><span>{'♥'}</span><span>{'♥'}</span>
      </div>
      <form className="login-card" onSubmit={masuk}>
        <div className="login-badge">{'♥'}</div>
        <h1>SOP Sayang</h1>
        <p>Saling menjaga, bertumbuh bersama, menuju pernikahan</p>

        <div className="who-pick">
          {AKUN.map((a) => (
            <button
              key={a.username}
              type="button"
              className={pilih === a.username ? 'on' : ''}
              onClick={() => {
                setPilih(a.username);
                setErr('');
                setTimeout(() => pinRef.current && pinRef.current.focus(), 0);
              }}
            >
              <span className="who-ikon">{a.ikon}</span>
              {a.nama}
            </button>
          ))}
        </div>

        <input
          ref={pinRef}
          className="pin"
          type="password"
          inputMode="numeric"
          autoComplete="current-password"
          maxLength={6}
          placeholder="PIN"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
        />
        <button className="btn block" type="submit" disabled={busy}>{busy ? 'Masuk...' : 'Masuk'}</button>
        <div className="err">{err}</div>
      </form>
      <div className="login-foot">Faid {'♥'} Della</div>
    </div>
  );
}
