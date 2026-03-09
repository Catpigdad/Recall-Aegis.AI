import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { checkEmail, checkName, verifyConversation } from '../api/client';

const STEPS = ['email', 'name', 'conversation'];

function stepTitle(step) {
  switch (step) {
    case 'email':      return 'Sign in';
    case 'name':       return 'Assistant name';
    case 'conversation': return 'Recall your conversation';
    default:           return 'Sign in';
  }
}

function stepSubtitle(step) {
  switch (step) {
    case 'email':      return 'Enter your email to continue.';
    case 'name':       return 'What did you name your AI assistant?';
    case 'conversation':
      return 'Last time we spoke — what did we talk about?';
    default: return '';
  }
}

export default function Login() {
  const navigate = useNavigate();
  const [step, setStep]             = useState(0); // 0=email, 1=name, 2=conversation
  const [email, setEmail]           = useState('');
  const [assistantName, setName]    = useState('');
  const [answer, setAnswer]         = useState('');
  const [stepToken, setStepToken]   = useState('');
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');

  // Step dot rendering
  function StepIndicator() {
    return (
      <div className="step-indicator">
        {STEPS.map((s, i) => (
          <div
            key={s}
            className={`step-dot ${i < step ? 'done' : ''} ${i === step ? 'active' : ''}`}
          />
        ))}
      </div>
    );
  }

  // --- Step 1: verify email ---
  async function handleEmailSubmit(e) {
    e.preventDefault();
    setError('');
    if (!email.trim()) { setError('Email is required.'); return; }

    setLoading(true);
    try {
      await checkEmail(email.trim());
      setStep(1);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not verify email. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // --- Step 2: verify assistant name ---
  async function handleNameSubmit(e) {
    e.preventDefault();
    setError('');
    if (!assistantName.trim()) { setError('Assistant name is required.'); return; }

    setLoading(true);
    try {
      const res = await checkName(email.trim(), assistantName.trim());
      setStepToken(res.data.token);
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.error || 'Incorrect assistant name. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // --- Step 3: verify conversation ---
  async function handleConversationSubmit(e) {
    e.preventDefault();
    setError('');
    if (!answer.trim()) { setError('Please describe what you talked about.'); return; }

    setLoading(true);
    try {
      const res = await verifyConversation(stepToken, answer.trim());
      const { token, assistantName: name } = res.data;

      // Store token and assistant name for the chat page
      localStorage.setItem('authToken', token);
      localStorage.setItem('assistantName', name);

      navigate('/chat');
    } catch (err) {
      setError(
        err.response?.data?.error ||
          'Conversation did not match. Please try again or contact support.'
      );
    } finally {
      setLoading(false);
    }
  }

  const currentStep = STEPS[step];

  return (
    <div className="page-container">
      <div className="auth-card">
        <h1>{stepTitle(currentStep)}</h1>
        <p className="subtitle">{stepSubtitle(currentStep)}</p>

        <StepIndicator />

        {error && <div className="alert alert-error">{error}</div>}

        {/* ---- Step 0: Email ---- */}
        {currentStep === 'email' && (
          <form onSubmit={handleEmailSubmit} noValidate>
            <div className="form-group">
              <label htmlFor="login-email">Email address</label>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(''); }}
                disabled={loading}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Checking…' : 'Continue'}
            </button>
          </form>
        )}

        {/* ---- Step 1: Assistant name ---- */}
        {currentStep === 'name' && (
          <form onSubmit={handleNameSubmit} noValidate>
            <div className="alert alert-info" style={{ marginBottom: '1rem' }}>
              Signing in as <strong>{email}</strong>
            </div>
            <div className="form-group">
              <label htmlFor="assistant-name">Your assistant's name</label>
              <input
                id="assistant-name"
                type="text"
                autoComplete="off"
                placeholder="Enter the name you chose"
                value={assistantName}
                onChange={(e) => { setName(e.target.value); setError(''); }}
                disabled={loading}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Verifying…' : 'Continue'}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              style={{ marginTop: '0.5rem', width: '100%' }}
              onClick={() => { setStep(0); setError(''); setName(''); }}
            >
              ← Back
            </button>
          </form>
        )}

        {/* ---- Step 2: Conversation recall ---- */}
        {currentStep === 'conversation' && (
          <form onSubmit={handleConversationSubmit} noValidate>
            <div className="alert alert-info" style={{ marginBottom: '1rem' }}>
              <strong>{assistantName}</strong> is asking: <em>"Last time we spoke, what did we talk about?"</em>
            </div>
            <div className="form-group">
              <label htmlFor="recall-answer">Your answer</label>
              <textarea
                id="recall-answer"
                placeholder="Describe the topic — a few words or a sentence is fine."
                value={answer}
                onChange={(e) => { setAnswer(e.target.value); setError(''); }}
                disabled={loading}
                rows={3}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Verifying…' : 'Sign In'}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              style={{ marginTop: '0.5rem', width: '100%' }}
              onClick={() => { setStep(1); setError(''); setAnswer(''); }}
            >
              ← Back
            </button>
          </form>
        )}

        <div className="page-link">
          No account yet? <Link to="/signup">Create one</Link>
        </div>
      </div>
    </div>
  );
}
