// Selección de elementos del DOM
const startBtn = document.getElementById('startChat');
const userSetup = document.querySelector('.user-setup');
const chatRoom = document.querySelector('.chat-room');
const messagesDiv = document.getElementById('messages');
const messageForm = document.getElementById('messageForm');
const messageInput = document.getElementById('messageInput');

let userData = null;
let eventSource = null;

// --- Iniciar el chat ---
startBtn.addEventListener('click', () => {
  const name = document.getElementById('username').value.trim();
  const color = document.getElementById('color').value;
  const avatarValue = document.querySelector('input[name="avatar"]:checked')?.value;

  if (!name) {
    alert('Debes ingresar un nombre de usuario');
    return;
  }

  const avatarURL = getAvatarURL(avatarValue);

  userData = { name, color, avatar: avatarURL };
  sessionStorage.setItem('userData', JSON.stringify(userData)); // ✅ Solo para esta pestaña

  enterChat();
});

// --- Revisar si ya hay usuario en esta pestaña ---
window.addEventListener('DOMContentLoaded', () => {
  const saved = sessionStorage.getItem('userData');
  if (saved) {
    userData = JSON.parse(saved);
    enterChat();
  } else {
    // Siempre empezar en la pantalla de configuración
    userSetup.classList.remove('hidden');
    chatRoom.classList.add('hidden');
  }
});

// --- Función para entrar al chat ---
function enterChat() {
  if (!userData) return; // Evita entrar si no hay datos válidos
  userSetup.classList.add('hidden');
  chatRoom.classList.remove('hidden');
  document.body.style.backgroundColor = userData.color;
  startSSE();
}

// --- SSE (Server-Sent Events) ---
function startSSE() {
  if (eventSource) eventSource.close();
  eventSource = new EventSource("http://localhost:3000/stream");

eventSource.onmessage = (event) => {
  try {
    const msg = JSON.parse(event.data);
    if (msg.type === "history" && Array.isArray(msg.data)) {
      // Mostrar historial
      messagesDiv.innerHTML = '';
      msg.data.forEach(m => displayMessage(m));
    } else if (msg.type === "new_message" && msg.data) {
      displayMessage(msg.data);
    }
  } catch (error) {
    console.error("Error parseando mensaje SSE:", error);
  }
};

  eventSource.onerror = (err) => {
    console.error("Error en la conexión SSE:", err);
  };
}

// --- Enviar mensaje ---
messageForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  e.stopPropagation();

  const text = messageInput.value.trim();
  if (!text || !userData) return;

  try {
    await fetch("http://localhost:3000/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: userData.name,
        avatar: userData.avatar,
        color: userData.color,
        text
      }),
    });
  } catch (error) {
    console.error("Error enviando mensaje:", error);
  }

  messageInput.value = '';
});

// --- Mostrar mensaje en pantalla ---
function displayMessage({ username, avatar, color, text }) {
  const msgDiv = document.createElement('div');
  msgDiv.classList.add('message');

  // Mensaje propio
  if (userData && username === userData.name) {
    msgDiv.classList.add('own');
  }

  msgDiv.innerHTML = `
    <img src="${avatar}" alt="Avatar">
    <div class="message-content">
      <div class="message-username">${username}</div>
      <div class="message-text">${text}</div>
    </div>
  `;

  messagesDiv.appendChild(msgDiv);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// --- Obtener URL del avatar ---
function getAvatarURL(value) {
  switch (value) {
    case "1": return "https://api.dicebear.com/9.x/adventurer/svg?seed=Sawyer";
    case "2": return "https://api.dicebear.com/9.x/adventurer/svg?seed=Mackenzie";
    case "3": return "https://api.dicebear.com/9.x/adventurer/svg?seed=Liliana";
    case "4": return "https://api.dicebear.com/9.x/adventurer/svg?seed=Alex";
    default: return "https://api.dicebear.com/9.x/adventurer/svg?seed=Default";
  }
}
