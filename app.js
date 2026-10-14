// Infinity AI Application Logic

const STORAGE_KEYS = {
  PROVIDER: "infinity_ai_provider",
  API_KEY: "infinity_ai_key",
  MODEL: "infinity_ai_model",
  SESSIONS: "infinity_ai_sessions",
  CURRENT_ID: "infinity_ai_current_id"
};

const PROVIDER_MODELS = {
  groq: [
    { value: "llama-3.3-70b-specdec", label: "Llama 3.3 70B SpecDec (Recommended)" },
    { value: "llama3-70b-8192", label: "Llama 3 70B (Fast Backup)" },
    { value: "mixtral-8x7b-32768", label: "Mixtral 8x7B" }
  ],
  gemini: [
    { value: "gemini-1.5-flash", label: "Gemini 1.5 Flash" },
    { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash" }
  ]
};

const state = {
  provider: localStorage.getItem(STORAGE_KEYS.PROVIDER) || "groq",
  apiKey: localStorage.getItem(STORAGE_KEYS.API_KEY) || "",
  model: localStorage.getItem(STORAGE_KEYS.MODEL) || "llama-3.3-70b-specdec",
  sessions: JSON.parse(localStorage.getItem(STORAGE_KEYS.SESSIONS) || "[]"),
  currentSessionId: localStorage.getItem(STORAGE_KEYS.CURRENT_ID) || null,
  busy: false
};

const $ = (id) => document.getElementById(id);

document.addEventListener("DOMContentLoaded", () => {
  // Migrate away from invalid model ID
  if (state.model === "llama-3.3-70b-versatile") {
    state.model = "llama-3.3-70b-specdec";
    localStorage.setItem(STORAGE_KEYS.MODEL, "llama-3.3-70b-specdec");
  }

  initUI();
  setupEventListeners();
  loadCurrentSession();
});

function initUI() {
  $("providerSelect").value = state.provider;
  populateModels(state.provider);
  $("apiKey").value = state.apiKey;
  $("modelSelect").value = state.model;
  updateConnectionStatus();
  renderHistoryList();
}

function populateModels(provider) {
  const select = $("modelSelect");
  select.replaceChildren();
  const models = PROVIDER_MODELS[provider] || PROVIDER_MODELS.groq;
  models.forEach(m => {
    const opt = document.createElement("option");
    opt.value = m.value;
    opt.textContent = m.label;
    select.appendChild(opt);
  });
  
  const footnote = $("keyLinkFootnote");
  if (provider === "groq") {
    footnote.innerHTML = `Get a free key in <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer">Groq Console ↗</a>`;
  } else {
    footnote.innerHTML = `Get a free key in <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer">Google AI Studio ↗</a>`;
  }
}

function updateConnectionStatus() {
  const connected = Boolean(state.apiKey);
  const providerStatus = $("providerStatus");
  const modelStatus = $("modelStatus");
  const statusDot = $("statusDot");
  const topStatusDot = $("topStatusDot");
  const topProviderLabel = $("topProviderLabel");

  if (connected) {
    providerStatus.textContent = state.provider === "groq" ? "Groq Connected" : "Gemini Connected";
    modelStatus.textContent = state.model;
    statusDot.classList.add("connected");
    topStatusDot.classList.add("connected");
    topProviderLabel.textContent = state.model;
  } else {
    providerStatus.textContent = "AI not connected";
    modelStatus.textContent = "Add your API key";
    statusDot.classList.remove("connected");
    topStatusDot.classList.remove("connected");
    topProviderLabel.textContent = "Connect AI";
  }
}

function showToastError(msg) {
  let container = $("toastContainer");
  if (!container) {
    container = document.createElement("div");
    container.id = "toastContainer";
    container.className = "toast-container";
    document.body.appendChild(container);
  }
  
  container.replaceChildren();

  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = msg;
  container.appendChild(toast);
  
  setTimeout(() => {
    if (toast.parentNode) {
      toast.parentNode.removeChild(toast);
    }
  }, 3800);
}

function setupEventListeners() {
  const openSettings = () => {
    $("settingsModal").hidden = false;
    $("settingsModal").style.display = "grid";
  };

  const closeSettings = () => {
    $("settingsModal").hidden = true;
    $("settingsModal").style.display = "none";
    $("settingsMessage").textContent = "";
  };

  $("openSettings").addEventListener("click", openSettings);
  $("openSettingsTop").addEventListener("click", openSettings);
  $("closeSettings").addEventListener("click", closeSettings);
  
  $("settingsModal").addEventListener("click", (e) => {
    if (e.target === $("settingsModal")) closeSettings();
  });

  $("providerSelect").addEventListener("change", (e) => {
    const selectedProvider = e.target.value;
    populateModels(selectedProvider);
  });

  const mobileMenu = $("mobileMenu");
  const sidebar = $("sidebar");
  if (mobileMenu) {
    mobileMenu.addEventListener("click", () => {
      sidebar.classList.toggle("open");
    });
  }

  $("toggleKey").addEventListener("click", () => {
    const keyInput = $("apiKey");
    if (keyInput.type === "password") {
      keyInput.type = "text";
      $("toggleKey").textContent = "Hide";
    } else {
      keyInput.type = "password";
      $("toggleKey").textContent = "Show";
    }
  });

  $("saveSettings").addEventListener("click", () => {
    const provider = $("providerSelect").value;
    const key = $("apiKey").value.trim();
    const model = $("modelSelect").value;
    const msg = $("settingsMessage");

    if (!key) {
      msg.style.color = "#ffaaa5";
      msg.textContent = "Please enter a valid API key.";
      return;
    }

    state.provider = provider;
    state.apiKey = key;
    state.model = model;
    localStorage.setItem(STORAGE_KEYS.PROVIDER, provider);
    localStorage.setItem(STORAGE_KEYS.API_KEY, key);
    localStorage.setItem(STORAGE_KEYS.MODEL, model);

    updateConnectionStatus();
    msg.style.color = "#83e3b4";
    msg.textContent = "Successfully connected!";
    
    setTimeout(() => {
      $("settingsModal").hidden = true;
      $("settingsModal").style.display = "none";
      msg.textContent = "";
    }, 1000);
  });

  $("disconnectKey").addEventListener("click", () => {
    state.apiKey = "";
    localStorage.removeItem(STORAGE_KEYS.API_KEY);
    $("apiKey").value = "";
    updateConnectionStatus();
    $("settingsMessage").style.color = "#83e3b4";
    $("settingsMessage").textContent = "API key removed.";
  });

  $("newChat").addEventListener("click", () => {
    createNewSession();
  });

  document.querySelectorAll(".suggestion").forEach((btn) => {
    btn.addEventListener("click", () => {
      const promptText = btn.getAttribute("data-prompt");
      if (promptText) {
        $("promptInput").value = promptText;
        adjustTextareaRows();
        $("promptInput").focus();
      }
    });
  });

  const promptInput = $("promptInput");
  promptInput.addEventListener("input", adjustTextareaRows);
  promptInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      $("chatForm").requestSubmit();
    }
  });

  $("chatForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    if (state.busy) return;

    const text = promptInput.value.trim();
    if (!text) return;

    if (!state.apiKey) {
      showToastError("Please connect your API key in settings first.");
      openSettings();
      return;
    }

    promptInput.value = "";
    adjustTextareaRows();

    await submitUserMessage(text);
  });
}

function adjustTextareaRows() {
  const textarea = $("promptInput");
  textarea.style.height = "auto";
  textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
}

function createNewSession() {
  const newSession = {
    id: `session_${Date.now()}`,
    title: "New conversation",
    messages: []
  };

  state.sessions.unshift(newSession);
  state.currentSessionId = newSession.id;
  saveSessionsToStorage();
  renderHistoryList();
  loadCurrentSession();
}

function getCurrentSession() {
  if (!state.currentSessionId || state.sessions.length === 0) {
    createNewSession();
  }
  let session = state.sessions.find(s => s.id === state.currentSessionId);
  if (!session) {
    session = state.sessions[0];
    state.currentSessionId = session?.id || null;
  }
  return session;
}

function saveSessionsToStorage() {
  localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(state.sessions));
  localStorage.setItem(STORAGE_KEYS.CURRENT_ID, state.currentSessionId || "");
}

function renderHistoryList() {
  const listContainer = $("historyList");
  listContainer.replaceChildren();

  state.sessions.forEach(session => {
    const item = document.createElement("div");
    item.className = `history-item ${session.id === state.currentSessionId ? "active" : ""}`;

    const titleSpan = document.createElement("span");
    titleSpan.className = "history-title";
    titleSpan.textContent = session.title;
    titleSpan.addEventListener("click", () => {
      state.currentSessionId = session.id;
      saveSessionsToStorage();
      renderHistoryList();
      loadCurrentSession();
    });

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "history-delete";
    deleteBtn.textContent = "×";
    deleteBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      deleteSession(session.id);
    });

    item.append(titleSpan, deleteBtn);
    listContainer.append(item);
  });
}

function deleteSession(id) {
  state.sessions = state.sessions.filter(s => s.id !== id);
  if (state.sessions.length === 0) {
    createNewSession();
  } else if (state.currentSessionId === id) {
    state.currentSessionId = state.sessions[0].id;
  }
  saveSessionsToStorage();
  renderHistoryList();
  loadCurrentSession();
}

function loadCurrentSession() {
  const session = getCurrentSession();
  const messagesContainer = $("messages");
  const welcomeEl = $("welcome");
  const titleEl = $("currentChatTitle");

  messagesContainer.replaceChildren();

  if (session.messages.length > 0) {
    welcomeEl.classList.add("hidden");
    titleEl.textContent = session.title;
    session.messages.forEach(msg => {
      appendMessageToDOM(msg.role, msg.text, false);
    });
  } else {
    welcomeEl.classList.remove("hidden");
    titleEl.textContent = "Chat";
  }
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

async function submitUserMessage(text) {
  const session = getCurrentSession();
  if (session.messages.length === 0) {
    session.title = text.length > 30 ? text.substring(0, 30) + "..." : text;
  }

  const userMsg = { role: "user", text: text };
  session.messages.push(userMsg);
  saveSessionsToStorage();
  renderHistoryList();

  $("welcome").classList.add("hidden");
  $("currentChatTitle").textContent = session.title;

  appendMessageToDOM("user", userMsg.text, true);

  setBusyState(true);
  const assistantMsgId = `msg_${Date.now()}`;
  const assistantMsgContentEl = appendMessageToDOM("assistant", "Thinking...", true, assistantMsgId);

  try {
    let replyText = "";

    if (state.provider === "groq") {
      const groqFormattedMessages = session.messages.map(m => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.text || ""
      }));

      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${state.apiKey.trim()}`
        },
        body: JSON.stringify({
          model: state.model,
          messages: groqFormattedMessages
        })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error?.message || `Groq API connection error (${res.status})`);
      }

      const data = await res.json();
      replyText = data.choices?.[0]?.message?.content || "No response received.";
    } else {
      const geminiContents = session.messages.map(m => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.text || "" }]
      }));

      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${state.model}:generateContent?key=${state.apiKey.trim()}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: geminiContents })
      });

      if (!res.ok) {
        throw new Error("Gemini API connection error. Check key or model quota.");
      }

      const data = await res.json();
      replyText = data.candidates?.[0]?.content?.parts?.[0]?.text || "No response received.";
    }

    assistantMsgContentEl.textContent = replyText;
    assistantMsgContentEl.classList.remove("typing");

    session.messages.push({ role: "assistant", text: replyText });
    saveSessionsToStorage();

  } catch (err) {
    const assistantMessageBlock = document.getElementById(assistantMsgId);
    if (assistantMessageBlock) assistantMessageBlock.remove();

    showToastError(err.message);
  } finally {
    setBusyState(false);
    const messagesContainer = $("messages");
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }
}

function setBusyState(busy) {
  state.busy = busy;
  const sendBtn = $("sendButton");
  const sendIcon = $("sendIcon");
  if (busy) {
    sendBtn.classList.add("stop-btn");
    sendIcon.textContent = "■";
  } else {
    sendBtn.classList.remove("stop-btn");
    sendIcon.textContent = "↑";
  }
}

function appendMessageToDOM(role, text, scrollToBottom = true, customId = null) {
  const messagesContainer = $("messages");

  const messageDiv = document.createElement("div");
  messageDiv.className = `message ${role}`;
  if (customId) messageDiv.id = customId;

  const avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.textContent = role === "user" ? "You" : "∞";

  const contentWrap = document.createElement("div");
  contentWrap.className = "message-content";

  const textNode = document.createElement("div");
  textNode.textContent = text;
  if (role === "assistant" && text === "Thinking...") {
    textNode.classList.add("typing");
  }
  contentWrap.append(textNode);

  messageDiv.append(avatar, contentWrap);
  messagesContainer.append(messageDiv);

  if (scrollToBottom) {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  return textNode;
}
