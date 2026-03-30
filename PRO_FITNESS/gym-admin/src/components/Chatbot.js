import React, { useState, useRef, useEffect } from 'react';
import { getUsers, getSessions } from '../api';

const WELCOME = {
  role: 'assistant',
  content: `Hello! I'm FitAssist, your gym management AI. I can help you with:\n• Client & trainer information\n• Session schedules\n• Gym management questions\n\nHow can I help you today?`,
};

async function callClaude(messages, systemContext) {
  const apiKey = process.env.REACT_APP_ANTHROPIC_API_KEY;
  if (!apiKey) {
    return "⚠️ No API key configured. Set REACT_APP_ANTHROPIC_API_KEY in your .env file.";
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: systemContext,
      messages,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || `API error ${response.status}`);
  }

  const data = await response.json();
  return data.content?.[0]?.text || '(No response)';
}

function Chatbot() {
  const [isOpen, setIsOpen]     = useState(false);
  const [messages, setMessages] = useState([WELCOME]);
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [gymData, setGymData]   = useState(null);
  const messagesEndRef           = useRef(null);

  // Pre-load gym data so the bot has context
  useEffect(() => {
    if (!isOpen || gymData) return;
    Promise.all([getUsers(), getSessions()])
      .then(([uRes, sRes]) => {
        const users    = uRes.data?.Data || [];
        const clients  = users.filter(u => u.role === 'client');
        const trainers = users.filter(u => u.role === 'trainer');

        const rawSessions = sRes.data;
        const sessions = Array.isArray(rawSessions?.Data)
          ? rawSessions.Data
          : Array.isArray(rawSessions) ? rawSessions : [];

        setGymData({ clients, trainers, sessions });
      })
      .catch(() => setGymData({ clients: [], trainers: [], sessions: [] }));
  }, [isOpen, gymData]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const buildSystemPrompt = () => {
    if (!gymData) return 'You are FitAssist, a gym management assistant.';

    const clientList  = gymData.clients.map(c => `${c.first_name} ${c.last_name} (${c.email})`).join(', ') || 'none';
    const trainerList = gymData.trainers.map(t => `${t.first_name} ${t.last_name} (${t.email})`).join(', ') || 'none';
    const sessionCount = gymData.sessions.length;

    return `You are FitAssist, an AI assistant for a gym management admin portal called FitnessPro.

Current gym data:
- Clients (${gymData.clients.length}): ${clientList}
- Trainers (${gymData.trainers.length}): ${trainerList}
- Total sessions in database: ${sessionCount}

Help admins with questions about clients, trainers, schedules, and general gym management.
Keep responses concise and helpful. Use bullet points for lists.`;
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg = { role: 'user', content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      // Build conversation history for Claude (exclude welcome, keep last 10)
      const history = newMessages
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .slice(-10)
        .map(m => ({ role: m.role, content: m.content }));

      const reply = await callClaude(history, buildSystemPrompt());
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Sorry, I ran into an error: ${err.message}`,
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const renderContent = (content) => {
    // Simple markdown-ish: bold **text**, bullets •
    return content.split('\n').map((line, i) => (
      <span key={i}>
        {line.split(/(\*\*[^*]+\*\*)/).map((chunk, j) =>
          chunk.startsWith('**') && chunk.endsWith('**')
            ? <strong key={j}>{chunk.slice(2, -2)}</strong>
            : chunk
        )}
        {i < content.split('\n').length - 1 && <br />}
      </span>
    ));
  };

  return (
    <div className="chatbot-container">
      {isOpen && (
        <div className="chatbot-window">
          {/* Header */}
          <div className="chatbot-header">
            <div className="chatbot-avatar">✦</div>
            <div className="chatbot-title">
              <div className="chatbot-name">FitAssist AI</div>
              <div className={`chatbot-status ${loading ? 'thinking' : ''}`}>
                <span className="chatbot-status-dot" />
                {loading ? 'Thinking…' : 'Online'}
              </div>
            </div>
            <button className="chatbot-close" onClick={() => setIsOpen(false)}>×</button>
          </div>

          {/* Messages */}
          <div className="chatbot-messages">
            {messages.map((msg, i) => (
              <div key={i} className={`chat-message ${msg.role === 'user' ? 'user' : 'bot'}`}>
                {renderContent(msg.content)}
              </div>
            ))}
            {loading && (
              <div className="chat-message typing">
                <div className="typing-dots">
                  <span /><span /><span />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="chatbot-input">
            <input
              type="text"
              placeholder="Ask me anything…"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              disabled={loading}
            />
            <button className="chatbot-send" onClick={handleSend} disabled={loading || !input.trim()}>
              →
            </button>
          </div>
        </div>
      )}

      <button className="chatbot-toggle" onClick={() => setIsOpen(!isOpen)}>
        {isOpen ? '×' : '✦'}
      </button>
    </div>
  );
}

export default Chatbot;
