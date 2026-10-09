const form = document.getElementById('chat-form');
const input = document.getElementById('user-input');
const chatBox = document.getElementById('chat-box');
const scrollArea = document.getElementById('conversation-scroll');
const welcome = document.getElementById('welcome');
const sendButton = document.getElementById('send-button');

let isSending = false;
let interactionId = null;

function updateComposer() {
  input.style.height = 'auto';
  input.style.height = `${Math.min(input.scrollHeight, 160)}px`;
  sendButton.disabled = isSending || !input.value.trim();
}

function scrollToLatest() {
  scrollArea.scrollTop = scrollArea.scrollHeight;
}

input.addEventListener('input', updateComposer);
input.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
    event.preventDefault();
    if (!isSending && input.value.trim()) form.requestSubmit();
  }
});

document.querySelectorAll('[data-prompt]').forEach((button) => {
  button.addEventListener('click', () => {
    if (isSending) return;
    input.value = button.dataset.prompt;
    updateComposer();
    input.focus();
  });
});


form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const userMessage = input.value.trim();
  if (!userMessage || isSending) return;


  welcome.hidden = true;
  appendMessage('user', userMessage);
  input.value = '';
  isSending = true;
  input.disabled = true;

  updateComposer();
  chatBox.setAttribute('aria-busy', 'true');
  const botMessage = appendMessage('bot', 'ARAKAS sedang berpikir...');
  botMessage.classList.add('pending');
  const botText = botMessage.querySelector('.message-text');

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: userMessage,
        ...(interactionId ? { previous_interaction_id: interactionId } : {}),
      }),
    });
    const data = await response.json();
    if (!response.ok || !data.status) {
      throw new Error(data.error || `Request gagal (HTTP ${response.status}).`);
    }
    if (typeof data.interaction_id === 'string' && data.interaction_id) {
      interactionId = data.interaction_id;
    }
    botText.textContent = data.text || 'ARAKAS tidak mengembalikan jawaban teks.';
  } catch (error) {
    botMessage.classList.add('error');
    botText.textContent = `Gagal mendapatkan jawaban: ${error.message}`;
  } finally {
    botMessage.classList.remove('pending');
    isSending = false;
    input.disabled = false;

    updateComposer();
    chatBox.setAttribute('aria-busy', 'false');
    scrollToLatest();
    input.focus();
  }
});

function appendMessage(sender, text) {
  const message = document.createElement('div');
  message.classList.add('message', sender);
  if (sender === 'bot') {
    const avatar = document.createElement('span');
    avatar.classList.add('bot-avatar');
    avatar.setAttribute('aria-hidden', 'true');
    const logo = document.createElement('img');
    logo.src = '/ads-logo-no-bg.png';
    logo.alt = '';
    avatar.appendChild(logo);
    message.appendChild(avatar);
  }
  const content = document.createElement('div');
  content.classList.add('message-text');
  content.textContent = text;
  message.appendChild(content);
  chatBox.appendChild(message);
  scrollToLatest();
  return message;
}

updateComposer();
