import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signup } from '../api/client';

export default function Signup() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', assistantName: '', initialMessage: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');

    const { email, assistantName, initialMessage } = form;
    if (!email || !assistantName || !initialMessage) {
      setError('All fields are required.');
      return;
    }

    setLoading(true);
    try {
      const res = await signup(email.trim(), assistantName.trim(), initialMessage.trim());
      const { assistantReply } = res.data;

      setSuccess(
        `Account created! ${assistantName} said: "${assistantReply}" — You can now log in.`
      );
      setTimeout(() => navigate('/login'), 3500);
    } catch (err) {
      setError(err.response?.data?.error || 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-container">
      <div className="auth-card">
        <h1>Create Account</h1>
        <p className="subtitle">
          Set up your AI guardian — it will replace your password.
        </p>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={handleChange}
              disabled={loading}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="assistantName">
              Assistant name&nbsp;
              <span style={{ color: '#475569', fontWeight: 400 }}>
                (you'll need this to log in)
              </span>
            </label>
            <input
              id="assistantName"
              name="assistantName"
              type="text"
              placeholder="e.g. Aria, Max, Echo…"
              value={form.assistantName}
              onChange={handleChange}
              disabled={loading}
              maxLength={50}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="initialMessage">
              First message to your assistant
            </label>
            <textarea
              id="initialMessage"
              name="initialMessage"
              placeholder="Say hello or start a conversation topic you'll remember…"
              value={form.initialMessage}
              onChange={handleChange}
              disabled={loading}
              maxLength={500}
              required
            />
            <small style={{ color: '#475569', fontSize: '0.8rem' }}>
              This conversation becomes your first login verification prompt.
            </small>
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Creating account…' : 'Create Account'}
          </button>
        </form>

        <div className="page-link">
          Already have an account? <Link to="/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
