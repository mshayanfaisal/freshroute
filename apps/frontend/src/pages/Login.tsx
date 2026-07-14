import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../store/auth';
import { API_BASE } from '../api/base';

export default function Login() {
  const navigate = useNavigate();
  const setSession = useAuth((s) => s.setSession);
  const [email, setEmail] = useState('admin@greenvalley.coop');
  const [password, setPassword] = useState('Password1!');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/api/auth/login`, { email, password });
      setSession(res.data);
      navigate(`/${res.data.user.role}`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrap">
      <form className="card auth-card" onSubmit={submit}>
        <div className="brand" style={{ justifyContent: 'center' }}>🥬 Fresh<span>Route</span></div>
        <p className="muted" style={{ textAlign: 'center', marginTop: 0 }}>
          AI-Powered Farm-to-Table Supply Chain
        </p>
        <label>Email</label>
        <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
        <label>Password</label>
        <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required />
        {error && <p className="error-text">{error}</p>}
        <button style={{ width: '100%', marginTop: '1rem' }} disabled={loading}>
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
        <p className="muted" style={{ textAlign: 'center', marginTop: '1rem' }}>
          No account? <Link to="/register">Register</Link>
        </p>
        <p className="muted" style={{ fontSize: '0.75rem', textAlign: 'center' }}>
          Demo: admin / maria / bistro@downtown.com / dave — password <code>Password1!</code>
        </p>
      </form>
    </div>
  );
}
