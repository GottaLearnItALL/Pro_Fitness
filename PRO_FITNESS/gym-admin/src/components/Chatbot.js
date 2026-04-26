import React, { useState, useRef, useEffect } from 'react';
import { postChat } from '../api';
import { emitBookingConfirmed } from '../bookingEvent';

const WELCOME = {
  role: 'assistant',
  content: `Hello! I'm FitAssist, your gym management AI. I can help you with:\n• Client & trainer information\n• Session schedules\n• Gym management questions\n\nHow can I help you today?`,
};

function Chatbot() {
  const [isOpen, setIsOpen]     = useState(false);
  const [messages, setMessages] = useState([WELCOME]);
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(false);
  const messagesEndRef           = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;

    setMessages(prev => [...prev, { role: 'user', content: text }]);
    setInput('');
    setLoading(true);

    try {
      const res = await postChat(text);
      const reply = res.data?.reply || '(No response)';
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);

      // Backend inspects the raw tool messages and tells us definitively
      // whether create_booking succeeded — no fragile text matching needed.
      if (res.data?.booking_confirmed) {
        emitBookingConfirmed();
      }
    } catch (err) {
      const msg = err.response?.status === 401
        ? 'Session expired — please sign in again.'
        : err.response?.data?.detail || err.message || 'Something went wrong.';
      setMessages(prev => [...prev, { role: 'assistant', content: `⚠️ ${msg}` }]);
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
