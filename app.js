
const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models/";

const $ = (id) => document.getElementById(id);

const state = {
  key: localStorage.getItem("infinity_gemini_key") || "",
  model: localStorage.getItem("infinity_gemini_model") || "gemini-2.5-flash",
  history: [],
  image: null,
  busy: false
};

const modal = $("settingsModal");
const promptInput = $("promptInput");
const messages = $("messages");
const welcome = $("welcome");

function updateProviderUI() {
  const connected = Boolean(state.key);

  $("providerStatus").textContent = connected ? "Gemini connected" : "AI not connected";
  $("modelStatus").textContent = connected ? state.model : "Add your Gemini API key";
  $("statusDot").classList.toggle("connected", connected);
  $("topProviderLabel").textContent = connected ? "Gemini connected" : "Connect Gemini";
  document.querySelector(".green-dot").classList.toggle("connected", connected);
}

function openSettings() {
  $("apiKey").value = state.key;
  $("modelSelect").value = state.model;
  $("settingsMessage").textContent = "";
  modal.hidden = false;
  setTimeout(() => $("apiKey").focus(), 50);
}

function closeSettings() {
  modal.hidden = true;
}

$("openSettings").addEventListener("click", openSettings);
$("openSettingsTop").addEventListener("click", openSettings);
$("closeSettings").addEventListener("click", closeSettings);

modal.addEventListener("click", e => {
  if (e.target === modal) closeSettings();
});

document.addEventListener("keydown", e => {
  if (e.key === "Escape") closeSettings();
});

$("toggleKey").addEventListener("click", () => {
  const input = $("apiKey");
  input.type = input.type === "password" ? "text" : "password";
  $("toggleKey").textContent = input.type === "password" ? "Show" : "Hide";
});

$("saveSettings").addEventListener("click", () => {
  const key = $("apiKey").value.trim();

  if (!key) {
    $("settingsMessage").textContent = "Paste your API key first.";
    return;
  }

  state.key = key;
  state.model = $("modelSelect").value;

  localStorage.setItem("infinity_gemini_key", state.key);
  localStorage.setItem("infinity_gemini_model", state.model);

  updateProviderUI();

  $("settingsMessage").textContent = "Connection settings saved in this browser.";

  setTimeout(closeSettings, 650);
});

$("disconnectKey").addEventListener("click", () => {
  state.key = "";

  localStorage.removeItem("infinity_gemini_key");

  updateProviderUI();

  $("apiKey").value = "";
  $("settingsMessage").textContent = "API key removed from this browser.";
});

$("mobileMenu").addEventListener("click", () => {
  $("sidebar").classList.toggle("open");
});

$("newChat").addEventListener("click", () => {
  state.history = [];
  messages.innerHTML = "";
  welcome.hidden = false;

  $("sidebar").classList.remove("open");

  clearImage();
  promptInput.focus();
});

document.querySelectorAll(".suggestion").forEach(button => {
  button.addEventListener("click", () => {
    promptInput.value = button.dataset.prompt;
    resizeInput();
    promptInput.focus();
  });
});

promptInput.addEventListener("input", resizeInput);

promptInput.addEventListener("keydown", e => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    $("chatForm").requestSubmit();
  }
});

function resizeInput() {
  promptInput.style.height = "auto";
  promptInput.style.height = Math.min(promptInput.scrollHeight, 160) + "px";
}

$("attachButton").addEventListener("click", () => {
  $("imageInput").click();
});

$("imageInput").addEventListener("change", async e => {
  const file = e.target.files && e.target.files[0];

  if (!file) return;

  if (!file.type.startsWith("image/")) {
    alert("Please choose an image file.");
    e.target.value = "";
    return;
  }

  if (file.size > 12 * 1024 * 1024) {
    alert("Choose an image smaller than 12 MB.");
    e.target.value = "";
    return;
  }

  const dataUrl = await fileToDataURL(file);

  state.image = {
    name: file.name,
    mimeType: file.type,
    data: dataUrl.split(",")[1],
    preview: dataUrl
  };

  const preview = $("attachmentPreview");

  preview.hidden = false;
  preview.innerHTML = "";

  const img = document.createElement("img");
  img.src = dataUrl;
  img.alt = "Selected image";

  const name = document.createElement("span");
  name.textContent = file.name;

  const remove = document.createElement("button");
  remove.type = "button";
  remove.textContent = "×";
  remove.setAttribute("aria-label", "Remove image");
  remove.onclick = clearImage;

  preview.append(img, name, remove);
});

function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;

    reader.readAsDataURL(file);
  });
}

function clearImage() {
  state.image = null;
  $("imageInput").value = "";
  $("attachmentPreview").hidden = true;
  $("attachmentPreview").innerHTML = "";
}

function addMessage(role, text, imageData = null, extraClass = "") {
  welcome.hidden = true;

  const wrap = document.createElement("div");
  wrap.className = `message ${role} ${extraClass}`.trim();

  const avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.textContent = role === "user" ? "You" : "∞";

  const content = document.createElement("div");
  content.className = "message-content";

  if (imageData) {
    const img = document.createElement("img");
    img.className = "message-image";
    img.src = imageData;
    img.alt = "Uploaded image";
    content.appendChild(img);
  }

  if (text) {
    const textNode = document.createElement("div");
    textNode.textContent = text;
    content.appendChild(textNode);
  }

  wrap.append(avatar, content);
  messages.appendChild(wrap);

  wrap.scrollIntoView({
    behavior: "smooth",
    block: "end"
  });

  return { wrap, content };
}

function setBusy(busy) {
  state.busy = busy;

  $("sendButton").disabled = busy;
  $("attachButton").disabled = busy;

  $("sendButton").innerHTML = busy ? "<span>…</span>" : "<span>↑</span>";

  promptInput.disabled = busy;
}

function errorText(data, status) {
  const apiMessage = data?.error?.message;

  if (status === 400) {
    return `Gemini rejected the request${apiMessage ? `: ${apiMessage}` : ". Check the selected model and request."}`;
  }

  if (status === 401 || status === 403) {
    return "Gemini could not authorize this key. Check that the API key is correct and the Gemini API is enabled for it.";
  }

  if (status === 429) {
    return "Gemini rate limit or quota reached. Check your Google AI Studio usage and billing/quota settings, then try again later.";
  }

  return apiMessage || `Gemini request failed (HTTP ${status}). Please try again.`;
}

async function callGemini(userText, image) {
  const contents = [...state.history];
  const parts = [];

  if (userText.trim()) {
    parts.push({ text: userText.trim() });
  }

  if (image) {
    parts.push({
      inline_data: {
        mime_type: image.mimeType,
        data: image.data
      }
    });
  }

  if (!parts.length) {
    parts.push({ text: "Please help me." });
  }

  contents.push({
    role: "user",
    parts
  });

  const response = await fetch(
    `${API_BASE}${encodeURIComponent(state.model)}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": state.key
      },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048
        }
      })
    }
  );

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(errorText(data, response.status));
  }

  const answer = (data.candidates?.[0]?.content?.parts || [])
    .map(part => part.text || "")
    .join("")
    .trim();

  if (!answer) {
    throw new Error("Gemini returned an empty response. Try rephrasing your prompt.");
  }

  state.history.push(
    { role: "user", parts },
    { role: "model", parts: [{ text: answer }] }
  );

  return answer;
}

$("chatForm").addEventListener("submit", async e => {
  e.preventDefault();

  if (state.busy) return;

  const text = promptInput.value.trim();
  const image = state.image ? { ...state.image } : null;

  if (!text && !image) return;

  if (!state.key) {
    openSettings();
    $("settingsMessage").textContent = "Connect Gemini before sending a message.";
    return;
  }

  addMessage("user", text || "What is in this image?", image?.preview);

  promptInput.value = "";
  resizeInput();
  clearImage();
  setBusy(true);

  const typing = addMessage("assistant", "Thinking…", null, "typing");

  try {
    const answer = await callGemini(text, image);

    typing.wrap.remove();
    addMessage("assistant", answer);
  } catch (err) {
    typing.content.textContent = err.message || "Something went wrong. Please try again.";
    typing.content.classList.add("error-message");
    typing.wrap.classList.remove("typing");
  } finally {
    setBusy(false);
    promptInput.focus();
  }
});

updateProviderUI();

if (!state.key) {
  setTimeout(() => {
    /* Keep first launch calm; settings open when the user sends a prompt. */
  }, 0);
}
