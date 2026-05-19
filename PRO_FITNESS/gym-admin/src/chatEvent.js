const OPEN_EVENT = 'pf:open_chat';

/**
 * Fire from anywhere to open the chatbot and pre-fill a message.
 * The Chatbot component listens for this event.
 */
export function openChatWith(message = '') {
  window.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: { message } }));
}

export { OPEN_EVENT };
