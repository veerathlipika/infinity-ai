// Infinity AI Application Logic

const STORAGE_KEYS = {
  API_KEY: "infinity_ai_gemini_key",
  MODEL: "infinity_ai_model",
  SESSIONS: "infinity_ai_sessions",
  CURRENT_ID: "infinity_ai_current_id"
};

const state = {
  apiKey: localStorage.getItem(STORAGE_KEYS.API_KEY) || "",
  model: localStorage.getItem(STORAGE_KEYS.MODEL) || "gemini-3.8-flash",
  sessions: JSON.parse(localStorage.getItem(STORAGE_KEYS.SESSIONS) || "[]"),
  currentSessionId: localStorage.getItem(STORAGE_KEYS.CURRENT_ID) || null,
  busy: false,
  image: null,
  activeController: null
};

const $ = (id) => document.getElementById(id);

document.addEventListener("DOMContentLoaded", () => {
  initUI();
  setupEventListeners();
  loadCurrentSession();
});

function initUI() {
  $("apiKey").value = state.apiKey;
  $("modelSelect").value = state.model;
  updateConnectionStatus();
  renderHistoryList();
}

function updateConnectionStatus() {
  const connected = Boolean(state.apiKey);
  const providerStatus = $("providerStatus");
  const modelStatus = $("modelStatus");
  const statusDot = $("statusDot");
  const topStatusDot = $("topStatusDot");
  const topProviderLabel = $("topProviderLabel");

  if (connected) {
    providerStatus.textContent = "Gemini Connected";
    modelStatus.textContent = state.model;
    statusDot.classList.add("connected");
    topStatusDot.classList.add("connected");
    topProviderLabel.textContent = state.model;
  } else {
    providerStatus.textContent = "AI not connected";
    modelStatus.textContent = "Add your Gemini API key";
    statusDot.classList.remove("connected");
    topStatusDot.classList.remove("connected");
    topProviderLabel.textContent = "Connect Gemini";
  }
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

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !$("settingsModal").hidden) {
      closeSettings();
    }
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

  $("saveSettings").addEventListener("click", async () => {
    const key = $("apiKey").value.trim();
    const model = $("modelSelect").value;
    const msg = $("settingsMessage");

    if (!key) {
      msg.style.color = "#ffaaa5";
      msg.textContent = "Please enter a valid API key.";
      return;
    }

    msg.style.color = "#83e3b4";
    msg.textContent = "Verifying connection...";

    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: "Ping" }] }] })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error?.message || `HTTP error ${res.status}`);
      }

      state.apiKey = key;
      state.model = model;
      localStorage.setItem(STORAGE_KEYS.API_KEY, key);
      localStorage.setItem(STORAGE_KEYS.MODEL, model);

      updateConnectionStatus();
      msg.textContent = "Successfully connected to Gemini!";
      setTimeout(() => closeSettings(), 1200);
    } catch (err) {
      msg.style.color = "#ffaaa5";
      msg.textContent = `Connection failed: ${err.message}`;
    }
  });

  $("disconnectKey").addEventListener("click", () => {
    state.apiKey = "";
    localStorage.removeItem(STORAGE_KEYS.API_KEY);
    $("apiKey").value = "";
    updateConnectionStatus();
    $("settingsMessage").style.color = "#83e3b4";
    $("settingsMessage").textContent = "API key removed from browser.";
  });

  $("newChat").addEventListener("click", () => {
    createNewSession();
    if (window.innerWidth <= 760) {
      sidebar.classList.remove("open");
    }
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

  const imageInput = $("imageInput");
  $("attachButton").addEventListener("click", () => {
    if (state.busy) return;
    imageInput.click();
  });

  imageInput.addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await handleImageFile(file);
    imageInput.value = "";
  });

  const promptInput = $("promptInput");
  promptInput.addEventListener("paste", async (event) => {
    if (state.busy) return;

    const clipboardItems = Array.from(event.clipboardData?.items || []);
    const imageItem = clipboardItems.find(item =>
      item.kind === "file" && item.type.startsWith("image/")
    );

    if (!imageItem) return;

    event.preventDefault();

    const file = imageItem.getAsFile();
    if (!file) {
      alert("Could not read the copied image. Please try again.");
      return;
    }

    await handleImageFile(file);
  });

  promptInput.addEventListener("input", adjustTextareaRows);
  promptInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      $("chatForm").requestSubmit();
    }
  });

  $("chatForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    if (state.busy) {
      if (state.activeController) {
        state.activeController.abort();
      }
      return;
    }

    const text = promptInput.value.trim();
    if (!text && !state.image) return;

    if (!state.apiKey) {
      alert("Please connect your Gemini API key in settings first.");
      openSettings();
      return;
    }

    const currentMessageText = text;
    const currentImageObj = state.image;

    promptInput.value = "";
    adjustTextareaRows();
    clearImage();

    await submitUserMessage(currentMessageText, currentImageObj);
  });
}

function adjustTextareaRows() {
  const textarea = $("promptInput");
  textarea.style.height = "auto";
  textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
}

async function handleImageFile(file) {
  if (file.size > 12 * 1024 * 1024) {
    alert("The image is larger than 12 MB. Please choose a smaller image.");
    return;
  }

  try {
    const dataUrl = await fileToDataURL(file);
    state.image = {
      name: file.name || `pasted-image-${Date.now()}.png`,
      mimeType: file.type || "image/png",
      data: dataUrl.split(",")[1],
      preview: dataUrl
    };
    renderImagePreview();
  } catch (error) {
    console.error("Image loading failed:", error);
    alert("Could not load image attachment.");
  }
}

function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function renderImagePreview() {
  const preview = $("attachmentPreview");
  if (!state.image) {
    preview.hidden = true;
    preview.replaceChildren();
    return;
  }

  preview.replaceChildren();

  const img = document.createElement("img");
  img.src = state.image.preview;
  img.alt = "Attachment preview";

  const label = document.createElement("span");
  label.textContent = state.image.name;

  const removeBtn = document.createElement("button");
  removeBtn.type = "button";
  removeBtn.textContent = "×";
  removeBtn.setAttribute("aria-label", "Remove image");
  removeBtn.addEventListener("click", clearImage);

  preview.append(img, label, removeBtn);
  preview.hidden = false;
}

function clearImage() {
  state.image = null;
  const preview = $("attachmentPreview");
  preview.hidden = true;
  preview.replaceChildren();
  const imageInput = $("imageInput");
  if (imageInput) imageInput.value = "";
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
      if (window.innerWidth <= 760) {
        $("sidebar").classList.remove("open");
      }
    });

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "history-delete";
    deleteBtn.textContent = "×";
    deleteBtn.setAttribute("aria-label", "Delete conversation");
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
      appendMessageToDOM(msg.role, msg.text, msg.imagePreview, false);
    });
  } else {
    welcomeEl.classList.remove("hidden");
    titleEl.textContent = "Chat";
  }
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

async function submitUserMessage(text, imageObj) {
  const session = getCurrentSession();
  if (session.messages.length === 0) {
    session.title = text.length > 30 ? text.substring(0, 30) + "..." : text;
  }

  const userMsg = {
    role: "user",
    text: text,
    imagePreview: imageObj ? imageObj.preview : null,
    imagePayload: imageObj ? { mimeType: imageObj.mimeType, data: imageObj.data } : null
  };

  session.messages.push(userMsg);
  saveSessionsToStorage();
  renderHistoryList();

  $("welcome").classList.add("hidden");
  $("currentChatTitle").textContent = session.title;

  appendMessageToDOM("user", userMsg.text, userMsg.imagePreview, true);

  setBusyState(true);
  const assistantMsgId = `msg_${Date.now()}`;
  const assistantMsgContentEl = appendMessageToDOM("assistant", "Thinking...", null, true, assistantMsgId);

  state.activeController = new AbortController();

  try {
    const apiContents = buildApiPayload(session);

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${state.model}:generateContent?key=${state.apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: apiContents }),
      signal: state.activeController.signal
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error?.message || getHttpErrorMessage(res.status));
    }

    const data = await res.json();
    const candidate = data.candidates?.[0];
    const replyText = candidate?.content?.parts?.[0]?.text || "No response received from model.";

    assistantMsgContentEl.textContent = replyText;
    assistantMsgContentEl.classList.remove("typing", "error-message");

    session.messages.push({
      role: "assistant",
      text: replyText,
      imagePreview: null,
      imagePayload: null
    });
    saveSessionsToStorage();

  } catch (err) {
    if (err.name === "AbortError") {
      assistantMsgContentEl.textContent = "Generation cancelled.";
      assistantMsgContentEl.classList.remove("typing");
      assistantMsgContentEl.classList.add("error-message");
    } else {
      console.error("Gemini API Error:", err);
      assistantMsgContentEl.textContent = `Error: ${err.message}`;
      assistantMsgContentEl.classList.remove("typing");
      assistantMsgContentEl.classList.add("error-message");
    }
  } finally {
    setBusyState(false);
    state.activeController = null;
    const messagesContainer = $("messages");
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }
}

function buildApiPayload(session) {
  return session.messages.map(m => {
    const parts = [];
    if (m.text) {
      parts.push({ text: m.text });
    }
    if (m.imagePayload) {
      parts.push({
        inlineData: {
          mimeType: m.imagePayload.mimeType,
          data: m.imagePayload.data
        }
      });
    }
    return {
      role: m.role === "assistant" ? "model" : "user",
      parts: parts
    };
  });
}

function getHttpErrorMessage(status) {
  switch (status) {
    case 400: return "Bad Request (400). Check your query or model configuration.";
    case 401: return "Unauthorized (401). Your API key is invalid or expired.";
    case 403: return "Forbidden (403). Check API key permissions and billing.";
    case 404: return "Model not found (404). Selected model is unavailable.";
    case 429: return "Rate limit or Quota exceeded (429). Free tier limit reached. Please wait a moment or try switching to another model in settings.";
    default: return `Server error (HTTP ${status}).`;
  }
}

function setBusyState(busy) {
  state.busy = busy;
  const sendBtn = $("sendButton");
  const sendIcon = $("sendIcon");
  if (busy) {
    sendBtn.classList.add("stop-btn");
    sendIcon.textContent = "■";
    sendBtn.setAttribute("title", "Stop generation");
  } else {
    sendBtn.classList.remove("stop-btn");
    sendIcon.textContent = "↑";
    sendBtn.setAttribute("title", "Send message");
  }
}

function appendMessageToDOM(role, text, imagePreview, scrollToBottom = true, customId = null) {
  const messagesContainer = $("messages");

  const messageDiv = document.createElement("div");
  messageDiv.className = `message ${role}`;
  if (customId) messageDiv.id = customId;

  const avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.textContent = role === "user" ? "You" : "∞";

  const contentWrap = document.createElement("div");
  contentWrap.className = "message-content";

  if (imagePreview) {
    const img = document.createElement("img");
    img.src = imagePreview;
    img.className = "message-image";
    img.alt = "Uploaded image";
    contentWrap.append(img);
  }

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
