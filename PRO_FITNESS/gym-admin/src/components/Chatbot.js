import React, { useState, useRef, useEffect, useMemo } from 'react';
import { postChat } from '../api';
import { emitBookingConfirmed } from '../bookingEvent';
import { OPEN_EVENT } from '../chatEvent';

const WELCOME = {
  role: 'assistant',
  content: `Hello! I'm FitAssist, your gym management AI. I can help you with:\n• Client & trainer information\n• Session schedules\n• Gym management questions\n\nHow can I help you today?`,
};

/* ─── Quick-action button definitions ──────────────────────── */
const QUICK_ACTIONS = [
  { label: 'Book a Session',        message: 'I want to book a session' },
  { label: 'My Sessions',           message: 'Show me my upcoming sessions' },
  { label: 'Trainer Timings',       message: 'Show me available trainers and their timings' },
  { label: 'Cancel a Session',      message: 'I want to cancel a session' },
  { label: 'My Membership',         message: 'Show me my membership details' },
];

/* ─── Find trainer name from conversation context ────────── */
function findTrainerContext(messages) {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role === 'user') {
      const match = m.content.match(/book.*with\s+(\w+\s+\w+)/i);
      if (match) return match[1];
    }
  }
  return '';
}

/* ─── Parse bot replies for contextual follow-up buttons ───── */
function extractFollowUpButtons(messages) {
  if (messages.length === 0) return [];
  const last = messages[messages.length - 1];
  if (last.role !== 'assistant') return [];
  const text = last.content.toLowerCase();
  const fullText = last.content;
  let match;

  // After booking/cancellation → show return actions
  if (text.includes('successfully booked') || text.includes('session has been booked') || text.includes('successfully cancelled')) {
    return [
      { label: 'Book Another',   message: 'I want to book another session' },
      { label: 'My Sessions',    message: 'Show me my upcoming sessions' },
    ];
  }

  // After trainer listing → show "Book with [trainer]" buttons
  const trainerNames = [];
  const nameRegex = /(?:^|\n)\s*[-•*]?\s*\d*\.?\s*\**([A-Z][a-z]+ [A-Z][a-z]+)\**/gm;
  while ((match = nameRegex.exec(fullText)) !== null) {
    const name = match[1].trim();
    if (!name.match(/^(How Can|Let Me|I Can|No Show|Please Let|Here Are|Would You|Upper Body|Lower Body|Full Body|Session Id|Gym Management)/i)) {
      trainerNames.push(name);
    }
  }

  if (trainerNames.length > 0 && (text.includes('trainer') || text.includes('available'))) {
    return trainerNames.slice(0, 4).map(name => ({
      label: `${name}`,
      message: `I want to book a session with ${name}`,
      type: 'trainer',
    }));
  }

  // After availability shown → parse days and times (structured format: "Monday: 9:00 AM to 1:00 PM")
  const dayTimeRegex = /(\b(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b)\s*(?:[:–\-])?\s*(\d{1,2}:\d{2}\s*(?:AM|PM|am|pm))\s*(?:to|[-–])\s*(\d{1,2}:\d{2}\s*(?:AM|PM|am|pm))/gi;
  const slots = [];
  while ((match = dayTimeRegex.exec(fullText)) !== null) {
    slots.push({ day: match[1], startTime: match[2], endTime: match[3] });
  }

  // Also detect loose day lists like "(Monday, Wednesday, or Friday)" with a shared time range
  if (slots.length === 0) {
    const looseDays = [];
    const looseDayRegex = /\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b/gi;
    while ((match = looseDayRegex.exec(fullText)) !== null) {
      const d = match[1];
      if (!looseDays.some(x => x.toLowerCase() === d.toLowerCase())) looseDays.push(d);
    }
    const sharedTimeMatch = fullText.match(/(\d{1,2}:\d{2}\s*(?:AM|PM))\s*(?:and|to|[-–])\s*(\d{1,2}:\d{2}\s*(?:AM|PM))/i);
    if (looseDays.length > 0 && sharedTimeMatch) {
      looseDays.forEach(day => {
        slots.push({ day, startTime: sharedTimeMatch[1], endTime: sharedTimeMatch[2] });
      });
    } else if (looseDays.length > 0 && (text.includes('which day') || text.includes('prefer'))) {
      const trainerMatch = fullText.match(/booking with\s+([A-Z][a-z]+ [A-Z][a-z]+)/);
      const trainerCtx = trainerMatch ? trainerMatch[1] : findTrainerContext(messages);
      return looseDays.map(day => ({
        label: day,
        message: trainerCtx
          ? `I'd like to book with ${trainerCtx} on ${day}`
          : `I'd like to book on ${day}`,
        type: 'day',
      }));
    }
  }

  // Extract trainer name from bot response (e.g. "Marcus Chen's availability")
  const trainerFromBot = fullText.match(/([A-Z][a-z]+ [A-Z][a-z]+)'s\s+availability/)?.[1]
    || fullText.match(/booking with\s+([A-Z][a-z]+ [A-Z][a-z]+)/)?.[1]
    || fullText.match(/session with\s+([A-Z][a-z]+ [A-Z][a-z]+)/)?.[1];

  // When the bot asks "what time" and lists specific times, show individual time buttons
  if (text.includes('what time') || text.includes('e.g.')) {
    const listedTimes = [];
    const timeListRegex = /(\d{1,2}:\d{2}\s*(?:AM|PM))/gi;
    while ((match = timeListRegex.exec(fullText)) !== null) {
      const t = match[1].trim();
      if (!listedTimes.includes(t)) listedTimes.push(t);
    }
    const dayInResponse = fullText.match(/\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b/i)?.[1];
    const trainerCtx = trainerFromBot || findTrainerContext(messages);
    if (listedTimes.length > 1 && dayInResponse) {
      return listedTimes.slice(0, 5).map(t => ({
        label: t,
        message: trainerCtx
          ? `Book with ${trainerCtx} on ${dayInResponse} at ${t}`
          : `Book on ${dayInResponse} at ${t}`,
        type: 'time',
      }));
    }
  }

  if (slots.length > 0) {
    const trainerCtx = trainerFromBot || findTrainerContext(messages);

    const prevUser = messages.length >= 2 ? messages[messages.length - 2] : null;
    const pickedDay = prevUser?.role === 'user'
      ? prevUser.content.match(/\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b/i)?.[1]
      : null;

    if (pickedDay) {
      const daySlots = slots.filter(s => s.day.toLowerCase() === pickedDay.toLowerCase());
      if (daySlots.length > 0) {
        return daySlots.map(s => ({
          label: `${s.startTime}`,
          message: trainerCtx
            ? `Book with ${trainerCtx} on ${s.day} at ${s.startTime}`
            : `Book on ${s.day} at ${s.startTime}`,
          type: 'time',
        }));
      }
    }

    const uniqueDays = [...new Set(slots.map(s => s.day))];
    return uniqueDays.slice(0, 7).map(day => {
      const daySlots = slots.filter(s => s.day === day);
      const timeRange = daySlots.length === 1
        ? `${daySlots[0].startTime} - ${daySlots[0].endTime}`
        : `${daySlots.length} slots`;
      const ctx = trainerCtx || trainerFromBot;
      return {
        label: `${day} (${timeRange})`,
        message: ctx
          ? `I'd like to book with ${ctx} on ${day}`
          : `Show availability on ${day}`,
        type: 'day',
      };
    });
  }

  return [];
}

function Chatbot() {
  const [isOpen, setIsOpen]     = useState(false);
  const [messages, setMessages] = useState([WELCOME]);
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(false);
  const messagesEndRef           = useRef(null);

  // Listen for external open requests (e.g. "Book Session" / "Cancel" buttons)
  useEffect(() => {
    const handler = (e) => {
      setIsOpen(true);
      if (e.detail?.message) {
        // Auto-submit when opened via external button
        const msg = e.detail.message;
        setTimeout(() => {
          sendMessage(msg);
        }, 300);
      }
    };
    window.addEventListener(OPEN_EVENT, handler);
    return () => window.removeEventListener(OPEN_EVENT, handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const sendMessage = async (text) => {
    if (!text || loading) return;

    setMessages(prev => [...prev, { role: 'user', content: text }]);
    setInput('');
    setLoading(true);

    try {
      const res = await postChat(text);
      const reply = res.data?.reply || '(No response)';
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);

      if (res.data?.booking_confirmed) {
        emitBookingConfirmed();
      }
    } catch (err) {
      const msg = err.response?.status === 401
        ? 'Session expired — please sign in again.'
        : err.response?.data?.detail || err.message || 'Something went wrong.';
      setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${msg}` }]);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = () => sendMessage(input.trim());

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleQuickAction = (message) => {
    if (loading) return;
    sendMessage(message);
  };

  // Contextual follow-up buttons based on last bot message
  const followUpButtons = useMemo(
    () => (loading ? [] : extractFollowUpButtons(messages)),
    [messages, loading]
  );

  // Show initial quick actions only when at welcome or after a completed flow
  const showInitialActions = !loading && (
    messages.length <= 1 ||
    (messages.length > 1 && followUpButtons.length === 0 && messages[messages.length - 1].role === 'assistant')
  );

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
            <div className="chatbot-avatar">&#10022;</div>
            <div className="chatbot-title">
              <div className="chatbot-name">FitAssist AI</div>
              <div className={`chatbot-status ${loading ? 'thinking' : ''}`}>
                <span className="chatbot-status-dot" />
                {loading ? 'Thinking...' : 'Online'}
              </div>
            </div>
            <button className="chatbot-close" onClick={() => setIsOpen(false)}>&#215;</button>
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

            {/* Follow-up contextual buttons */}
            {followUpButtons.length > 0 && (
              <div className="chatbot-quick-actions">
                {followUpButtons.map((btn, i) => (
                  <button
                    key={i}
                    className={`chatbot-quick-btn contextual ${btn.type || ''}`}
                    onClick={() => handleQuickAction(btn.message)}
                    disabled={loading}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>
            )}

            {/* Initial quick actions (shown when idle) */}
            {showInitialActions && followUpButtons.length === 0 && (
              <div className="chatbot-quick-actions">
                {QUICK_ACTIONS.map((btn, i) => (
                  <button
                    key={i}
                    className="chatbot-quick-btn"
                    onClick={() => handleQuickAction(btn.message)}
                    disabled={loading}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="chatbot-input">
            <input
              type="text"
              placeholder="Ask me anything..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              disabled={loading}
            />
            <button className="chatbot-send" onClick={handleSend} disabled={loading || !input.trim()}>
              &#8594;
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
