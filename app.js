
"use strict";

(() => {
  const API_BASE =
    "https://generativelanguage.googleapis.com/v1beta/models/";

  const $ = (id) => document.getElementById(id);

  const MODELS = [
    "gemini-3.8-flash",
    "gemini-3.6-flash",
    "gemini-3.5-flash-lite"
  ];

  const state = {
    key: localStorage.getItem("infinity_gemini_key") || "",
    model: localStorage.getItem("infinity_gemini_model") || MODELS[0],
    history: [],
    image: null,
    busy: false
  };

  const modal = $("settingsModal");
  const promptInput = $("promptInput");
  const messages = $("messages");
  const welcome = $("welcome");

  function openSettings() {
    $("apiKey").value = state.key;
    $("modelSelect").value = state.model;
    $("settingsMessage").textContent = "";

    modal.hidden = false;
    modal.style.display = "grid";
    $("apiKey").focus();
  }

  function closeSettings() {
    modal.hidden = true;
    modal.style.display = "none";
  }

  function updateProviderUI() {
    const connected = Boolean(state.key);

    $("providerStatus").textContent =
      connected ? "Gemini key saved" : "AI not connected";

    $("modelStatus").textContent =
      connected ? state.model : "Add your Gemini API key";

    $("statusDot").classList.toggle("connected", connected);
    $("topProviderLabel").textContent =
      connected ? "Gemini key saved" : "Connect Gemini";

    document.querySelector(".green-dot")
      .classList.toggle("connected", connected);
  }

  // Settings buttons
  $("openSettings").addEventListener("click", openSettings);
  $("openSettingsTop").addEventListener("click", openSettings);
  $("closeSettings").addEventListener("click", closeSettings);

  modal.addEventListener("click", (event) => {
    if (event.target === modal) closeSettings();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !modal.hidden) closeSettings();
  });

  // Show or hide API key
  $("toggleKey").addEventListener("click", () => {
    const input = $("apiKey");
    const show = input.type === "password";

    input.type = show ? "text" : "password";
    $("toggleKey").textContent = show ? "Hide" : "Show";
  });

  // Save settings
  $("saveSettings").addEventListener("click", () => {
    const key = $("apiKey").value.trim();
    const model = $("modelSelect").value;

    if (!key) {
      $("settingsMessage").textContent = "Please paste your Gemini API key.";
      $("apiKey").focus();
      return;
    }

    if (!MODELS.includes(model)) {
      $("settingsMessage").textContent = "Please select a supported model.";
      return;
    }

    state.key = key;
    state.model = model;

    localStorage.setItem("infinity_gemini_key", key);
    localStorage.setItem("infinity_gemini_model", model);

    updateProviderUI();
    $("settingsMessage").textContent =
      "Settings saved. Testing the key when you send a message.";

    setTimeout(closeSettings, 900);
  });

  // Remove API key
  $("disconnectKey").addEventListener("click", () => {
    state.key = "";
    state.history = "";

    localStorage.removeItem("infinity_gemini_key");
    updateProviderUI();

    $("apiKey").value = "";
    $("settingsMessage").textContent = "API key removed from this browser.";
  });

  // New chat
  $("newChat").addEventListener("click", () => {
    state.history = [];
    messages.replaceChildren();
    welcome.hidden = false;
    clearImage();
    $("sidebar").classList.remove("open");
    promptInput.focus();
  });

  // Mobile sidebar
  $("mobileMenu").addEventListener("click", () => {
    $("sidebar").classList.toggle("open");
  });

  // Suggestion cards
  document.querySelectorAll(".suggestion").forEach((button) => {
    button.addEventListener("click", () => {
      promptInput.value = button.dataset.prompt || "";
      resizeInput();
      promptInput.focus();
    });
  });

  // Message input
  promptInput.addEventListener("input", resizeInput);

  promptInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      $("chatForm").requestSubmit();
    }
  });

  function resizeInput() {
    promptInput.style.height = "auto";
    promptInput.style.height =
      Math.min(promptInput.scrollHeight, 160) + "px";
  }

  // Image upload
  $("attachButton").addEventListener("click", () => {
    $("imageInput").click();
  });

  $("imageInput").addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please choose an image file.");
      clearImage();
      return;
    }

    if (file.size > 12 * 1024 * 1024) {
      alert("Please choose an image smaller than 12 MB.");
      clearImage();
      return;
    }

    try {
      const dataUrl = await fileToDataURL(file);

      state.image = {
        name: file.name,
        mimeType: file.type,
        data: dataUrl.split(",")[1],
        preview: dataUrl
      };

      const preview = $("attachmentPreview");
      preview.replaceChildren();

      const img = document.createElement("img");
      img.src = dataUrl;
      img.alt = "Selected image";

      const name = document.createElement("span");
      name.textContent = file.name;

      const remove = document.createElement("button");
      remove.type = "button";
      remove.textContent = "×";
      remove.setAttribute("aria-label", "Remove image");
      remove.addEventListener("click", clearImage);

      preview.append(img, name, remove);
      preview.hidden = false;
    } catch {
      alert("Could not read this image. Please try another image.");
      clearImage();
    }
  });

  function fileToDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("Could not read image"));
      reader.readAsDataURL(file);
    });
  }

  function clearImage() {
    state.image = null;
    $("imageInput").value = "";
    $("attachmentPreview").hidden = true;
    $("attachmentPreview").replaceChildren();
  }

  // Add a message safely
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
    wrap.scrollIntoView({ behavior: "smooth", block: "end" });

    return { wrap, content };
  }

  function setBusy(busy) {
    state.busy = busy;
    $("sendButton").disabled = busy;
    $("attachButton").disabled = busy;
    promptInput.disabled = busy;
    $("sendButton").innerHTML = busy ? "<span>…</span>" : "<span>↑</span>";
  }

  function explainApiError(data, status) {
    const detail = data?.error?.message || "";

    if (status === 400) {
      return "Gemini rejected the request. Check the model ID and API request. " + detail;
    }

    if (status === 401 || status === 403) {
      return "Gemini could not authorize this API key. Check your key and API access. " + detail;
    }

    if (status === 404) {
      return "The selected Gemini model was not found or is unavailable to this API key. Choose a model supported by your Google AI Studio account. " + detail;
    }

    if (status === 429) {
      return "Gemini rate limit or quota reached. Check your API usage and try again later. " + detail;
    }

    return detail || `Gemini request failed (HTTP ${status}). Please try again.`;
  }

  async function requestModel(model, contents) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000);

    try {
      const response = await fetch(
        `${API_BASE}${encodeURIComponent(model)}:generateContent`,
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
          }),
          signal: controller.signal
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const error = new Error(explainApiError(data, response.status));
        error.status = response.status;
        throw error;
      }

      const answer = (data.candidates?.[0]?.content?.parts || [])
        .map((part) => part.text || "")
        .join("")
        .trim();

      if (!answer) {
        throw new Error(
          "Gemini returned no text. Please try another prompt."
        );
      }

      return answer;
    } finally {
      clearTimeout(timeout);
    }
  }

  async function callGemini(userText, image) {
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

    const contents = [
      ...state.history,
      { role: "user", parts }
    ];

    const candidates = [
      state.model,
      ...MODELS.filter((model) => model !== state.model)
    ];

    let lastError;

    for (const model of candidates) {
      try {
        const answer = await requestModel(model, contents);

        state.model = model;
        localStorage.setItem("infinity_gemini_model", model);

        state.history.push(
          { role: "user", parts },
          { role: "model", parts: [{ text: answer }] }
        );

        updateProviderUI();
        return answer;
      } catch (error) {
        lastError = error;

        // Try another model for unavailable models or temporary service issues.
        const retryable = [
          404, 408, 429, 500, 502, 503, 504
        ].includes(error.status) || error.name === "AbortError";

        if (!retryable) throw error;
      }
    }

    throw lastError || new Error("No available Gemini model succeeded.");
  }

  // Submit chat message
  $("chatForm").addEventListener("submit", async (event) => {
    event.preventDefault();

    if (state.busy) return;

    const text = promptInput.value.trim();
    const image = state.image ? { ...state.image } : null;

    if (!text && !image) return;

    if (!state.key) {
      openSettings();
      $("settingsMessage").textContent =
        "Add your Gemini API key before sending a message.";
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
    } catch (error) {
      typing.content.textContent =
        error.message || "Something went wrong. Please try again.";
      typing.content.classList.add("error-message");
      typing.wrap.classList.remove("typing");
    } finally {
      setBusy(false);
      promptInput.focus();
    }
  });

  // Initial page state
  updateProviderUI();
})();
