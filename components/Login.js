'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function Login() {
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const masuk = async (e) => {
    e.preventDefault();
    setErr('');
    if (!email || !pw) {
      setErr('Isi email dan password.');
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: pw });
    setBusy(false);
    if (error) setErr(error.message === 'Invalid login credentials' ? 'Email atau password salah.' : error.message);
  };

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={masuk}>
        <h1>SOP Sayang</h1>
        <p>Saling menjaga, bertumbuh bersama, menuju pernikahan</p>
        <input className="in" type="email" autoComplete="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="in" type="password" autoComplete="current-password" placeholder="Password" value={pw} onChange={(e) => setPw(e.target.value)} />
        <button className="btn block" type="submit" disabled={busy}>{busy ? 'Masuk...' : 'Masuk'}</button>
        <div className="err">{err}</div>
      </form>
    </div>
  );
}
