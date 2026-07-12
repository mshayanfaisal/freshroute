import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../store/auth';
import type { UserRole } from '../types';

export default function Register() {
  const navigate = useNavigate();
  const setSession = useAuth((s) => s.setSession);
  const [form, setForm] = useState({
    name: '', email: '', password: '', role: 'buyer' as UserRole, orgName: '', address: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await axios.post('/api/auth/register', form);
      setSession(res.data);
      navigate(`/${res.data.user.role}`);
    } catch (err: any) {
      const msg = err.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : msg || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrap">
      <form className="card auth-card" onSubmit={submit}>
        <div className="brand" style={{ justifyContent: 'center' }}>🥬 Fresh<span>Route</span></div>
        <label>Full name</label>
        <input value={form.name} onChange={(e) => set('name', e.target.value)} required />
        <label>Email</label>
        <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} required />
        <label>Password (min 8 chars)</label>
        <input type="password" value={form.password} onChange={(e) => set('password', e.target.value)} required />
        <label>Role</label>
        <select value={form.role} onChange={(e) => set('role', e.target.value)}>
          <option value="buyer">Buyer (restaurant / grocer)</option>
          <option value="farmer">Farmer</option>
          <option value="driver">Driver</option>
          <option value="admin">Admin</option>
        </select>
        <label>Organisation / farm name</label>
        <input value={form.orgName} onChange={(e) => set('orgName', e.target.value)} />
        <label>Address</label>
        <input value={form.address} onChange={(e) => set('address', e.target.value)} />
        {error && <p className="error-text">{error}</p>}
        <button style={{ width: '100%', marginTop: '1rem' }} disabled={loading}>
          {loading ? 'Creating…' : 'Create account'}
        </button>
        <p className="muted" style={{ textAlign: 'center', marginTop: '1rem' }}>
          Have an account? <Link to="/login">Sign in</Link>
        </p>
      </form>
    </div>
  );
}
