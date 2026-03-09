import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { sendMessage, endSession, getChatHistory } from '../api/client';

function formatTime(date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function Chat() {
  const navigate = useNavigate();
  const assistantName = localStorage.getItem('assistantName') || 'Assistant';

  const [messages, setMessages]   = useState([]);
  const [input, setInput]         = useState('');
  const [isTyping, setIsTyping]   = useState(false);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [endingSession, setEndingSession] = useState(false);
  const [sessionEnded, setSessionEnded]   = useState(false);

  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  // Load history on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await getChatHistory();
        const history = res.data.history || [];
        if (history.length > 0) {
          setMessages(
            history.map((m, i) => ({
              id: i,
              role: m.role,
              content: m.content,
              time: new Date(),
            }))
          );
        }
      } catch (err) {
        // History load failure is non-fatal
        console.warn('Could not load history:', err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  function logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('assistantName');
    navigate('/login');
  }

  async function handleSend(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text || isTyping || sessionEnded) return;

    setInput('');
    setError('');

    // Optimistically add user message
    const userMsg = { id: Date.now(), role: 'user', content: text, time: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);

    try {
      const res = await sendMessage(text);
      const aiMsg = {
        id: Date.now() + 1,
        role: 'assistant',
        content: res.data.reply,
        time: new Date(),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send message. Please try again.');
      // Remove the optimistic message on error
      setMessages((prev) => prev.filter((m) => m.id !== userMsg.id));
    } finally {
      setIsTyping(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }

  async function handleEndSession() {
    if (messages.length === 0) {
      setError('Have a conversation first before ending the session.');
      return;
    }
    setEndingSession(true);
    setError('');
    try {
      await endSession();
      setSessionEnded(true);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          role: 'assistant',
          content:
            `Session saved! Your conversation has been stored as your next login verification. ` +
            `See you next time — remember what we talked about! 👋`,
          time: new Date(),
        },
      ]);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to end session.');
    } finally {
      setEndingSession(false);
    }
  }

  const initials = assistantName.slice(0, 2).toUpperCase();

  return (
    <div className="chat-container">
      {/* Top bar */}
      <div className="chat-topbar">
        <div className="assistant-info">
          <div className="assistant-avatar">{initials}</div>
          <div>
            <div className="assistant-name">{assistantName}</div>
            <div className="assistant-status">
              {sessionEnded ? 'Session ended' : 'Online'}
            </div>
          </div>
        </div>

        <div className="chat-topbar-actions">
          {!sessionEnded && (
            <button
              className="btn btn-secondary"
              onClick={handleEndSession}
              disabled={endingSession || messages.length === 0}
              title="End session and save conversation summary for next login"
            >
              {endingSession ? 'Saving…' : '✓ End Session'}
            </button>
          )}
          {sessionEnded && (
            <button className="btn btn-primary" onClick={logout}>
              Log out
            </button>
          )}
          {!sessionEnded && (
            <button className="btn btn-ghost" onClick={logout} title="Log out">
              Sign out
            </button>
          )}
        </div>
      </div>

      {/* Error bar */}
      {error && <div className="alert alert-error" style={{ marginTop: '0.5rem' }}>{error}</div>}

      {/* Messages */}
      <div className="messages-area">
        {loading ? (
          <div className="empty-chat">
            <span className="empty-icon">💬</span>
            <p>Loading conversation…</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="empty-chat">
            <span className="empty-icon">💬</span>
            <p>
              Say hello to <strong>{assistantName}</strong>!
            </p>
            <p style={{ color: '#334155', fontSize: '0.85rem' }}>
              End the session when you're done — your chat will be saved as your next login prompt.
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`message ${msg.role}`}>
              <div className="message-bubble">{msg.content}</div>
              <div className="message-time">{formatTime(msg.time)}</div>
            </div>
          ))
        )}

        {/* Typing indicator */}
        {isTyping && (
          <div className="message assistant typing-indicator">
            <div className="message-bubble">
              <div className="typing-dots">
                <span /><span /><span />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="chat-input-bar">
        <form className="chat-input-form" onSubmit={handleSend}>
          <input
            ref={inputRef}
            type="text"
            placeholder={
              sessionEnded
                ? 'Session ended — log out or continue reading'
                : `Message ${assistantName}…`
            }
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isTyping || sessionEnded}
            maxLength={2000}
            autoFocus
          />
          <button
            type="submit"
            className="send-btn"
            disabled={!input.trim() || isTyping || sessionEnded}
            title="Send"
          >
            ➤
          </button>
        </form>
      </div>
    </div>
  );
}
