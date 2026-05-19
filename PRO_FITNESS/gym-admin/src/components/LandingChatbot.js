import React, { useState, useRef, useEffect } from 'react';
import { postPublicChat } from '../api';

const WELCOME = {
  role: 'bot',
  content: "Hi! I'm the HAACHIKO FITNESS assistant.\n\nI can help with:\n• Membership plans & pricing\n• Trainer info & availability\n• Session booking\n• General gym questions\n\nWhat would you like to know?",
};

function renderContent(content) {
  return content.split('\n').map((line, i, arr) => (
    <span key={i}>
      {line.split(/(\*\*[^*]+\*\*)/).map((chunk, j) =>
        chunk.startsWith('**') && chunk.endsWith('**')
          ? <strong key={j}>{chunk.slice(2, -2)}</strong>
          : chunk
      )}
      {i < arr.length - 1 && <br />}
    </span>
  ));
}

export default function LandingChatbot({ onGoToPricing }) {
  const [open, setOpen]         = useState(false);
  const [messages, setMessages] = useState([WELCOME]);
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(false);
  const endRef                  = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setMessages(prev => [...prev, { role: 'user', content: text }]);
    setInput('');
    setLoading(true);

    try {
      const res = await postPublicChat(text);
      const reply = res.data?.reply || "I'm not sure about that — try checking our pricing section or contact us!";
      setMessages(prev => [...prev, { role: 'bot', content: reply }]);
    } catch {
      setMessages(prev => [...prev, {
        role: 'bot',
        content: "Sorry, I couldn't connect right now. Browse our pricing below or email admin@haachikofitness.com.",
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const handlePricing = () => {
    setOpen(false);
    document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' });
    if (onGoToPricing) onGoToPricing();
  };

  return (
    <div className="lc-container">
      {open && (
        <div className="lc-window">
          {/* Header */}
          <div className="lc-header">
            <div className="lc-avatar">✦</div>
            <div className="lc-title">
              <div className="lc-name">HAACHIKO Assistant</div>
              <div className={`lc-status ${loading ? 'thinking' : ''}`}>
                <span className="lc-dot" />{loading ? 'Thinking…' : 'Online'}
              </div>
            </div>
            <button className="lc-close" onClick={() => setOpen(false)}>×</button>
          </div>

          {/* Messages */}
          <div className="lc-messages">
            {messages.map((msg, i) => (
              <div key={i} className={`lc-msg lc-msg-${msg.role}`}>
                {renderContent(msg.content)}
              </div>
            ))}
            {loading && (
              <div className="lc-msg lc-msg-bot lc-typing">
                <div className="typing-dots"><span /><span /><span /></div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* Quick action */}
          <div className="lc-quick">
            <button className="lc-quick-btn" onClick={handlePricing}>
              ✦ View Pricing Plans
            </button>
          </div>

          {/* Input */}
          <div className="lc-input">
            <input
              type="text"
              placeholder="Ask me anything…"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              disabled={loading}
            />
            <button className="lc-send" onClick={send} disabled={loading || !input.trim()}>→</button>
          </div>
        </div>
      )}

      <button className="lc-toggle" onClick={() => setOpen(o => !o)}>
        {open ? '×' : '✦'}
      </button>
    </div>
  );
}
