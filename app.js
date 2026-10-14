
const API_BASE =
  "https://generativelanguage.googleapis.com/v1beta/models/";

const $ = (id) => document.getElementById(id);

const state = {
  key: localStorage.getItem("infinity_gemini_key") || "",
  model: localStorage.getItem("infinity_gemini_model") || "gemini-2.5-flash",
  history: [],
  image: null,
  busy: false
};

function initApp() {
  const required = [
    "settingsModal", "promptInput", "messages", "welcome",
    "openSettings", "openSettingsTop", "closeSettings",
    "apiKey", "modelSelect", "saveSettings", "disconnectKey",
    "toggleKey", "mobileMenu", "newChat", "chatForm",
    "sendButton", "attachButton", "imageInput", "attachmentPreview",
    "providerStatus", "modelStatus", "statusDot",
    "topProviderLabel", "sidebar"
  ];

  const missing = required.filter(id => !$(id));

  if (missing.length) {
    console.error("Infinity AI: Missing HTML elements:", missing);
    alert("Infinity AI could not initialize. Missing elements: " + missing.join(", "));
    return;
  }

  const modal = $("settingsModal");
  const promptInput = $("promptInput");
  const messages = $("messages");
  const welcome = $("welcome");

  function updateProviderUI() {
    const connected = Boolean(state.key);
    $("providerStatus").textContent =
      connected ? "Gemini key saved" : "AI not connected";
    $("modelStatus").textContent =
      connected ? state.model : "Add your Gemini API key";
    $("statusDot").classList.toggle("connected", connected);
    $("topProviderLabel").textContent =
      connected ? "Gemini key saved" : "Connect Gemini";

    const dot = document.querySelector(".green-dot");
    if (dot) dot.classList.toggle("connected", connected);
  }

  function openSettings() {
    $("apiKey").value = state.key;
    $("modelSelect").value = state.model;

    // Use a valid dropdown option if the stored model is no longer listed.
    if (!$("modelSelect").value) {
      $("modelSelect").selectedIndex = 0;
    }

    $("settingsMessage").textContent = "";
    modal.hidden = false;
    $("apiKey").focus();
  }

  function closeSettings() {
    modal.hidden = true;
  }

  $("openSettings").addEventListener("click", openSettings);
  $("openSettingsTop").addEventListener("click", openSettings);
  $("closeSettings").addEventListener("click", closeSettings);

  modal.addEventListener("click", event => {
    if (event.target === modal) closeSettings();
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") closeSettings();
  });

  $("toggleKey").addEventListener("click", () => {
    const input = $("apiKey");
    input.type = input.type === "password" ? "text" : "password";
    $("toggleKey").textContent =
      input.type === "password" ? "Show" : "Hide";
  });

  $("saveSettings").addEventListener("click", () => {
    const key = $("apiKey").value.trim();

    if (!key) {
      $("settingsMessage").textContent = "Paste your Gemini API key first.";
      return;
    }

    state.key = key;
    state.model = $("modelSelect").value;

    localStorage.setItem("infinity_gemini_key", state.key);
    localStorage.setItem("infinity_gemini_model", state.model);

    updateProviderUI();
    $("settingsMessage").textContent =
      "Key saved in this browser. Sending a test message will check API access.";

    setTimeout(closeSettings, 900);
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

  function clearImage() {
    state.image = null;
    $("imageInput").value = "";
    $("attachmentPreview").hidden = true;
    $("attachmentPreview").replaceChildren();
  }

  $("newChat").addEventListener("click", () => {
    state.history = [];
    messages.replaceChildren();
    welcome.hidden = false;
    $("sidebar").classList.remove("open");
    clearImage();
    promptInput.focus();
  });

  document.querySelectorAll(".suggestion").forEach(button => {
    button.addEventListener("click", () => {
      promptInput.value = button.dataset.prompt || "";
      resizeInput();
      promptInput.focus();
    });
  });

  promptInput.addEventListener("input", resizeInput);

  promptInput.addEventListener("keydown", event => {
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

  $("attachButton").addEventListener("click", () => {
    $("imageInput").click();
  });

  $("imageInput").addEventListener("change", async event => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select an image.");
      clearImage();
      return;
    }

    if (file.size > 12 * 1024 * 1024) {
      alert("Choose an image smaller than 12 MB.");
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
      preview.hidden = false;

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
    } catch {
      alert("Could not read that image. Please try another.");
      clearImage();
    }
  });

  function fileToDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
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

    const models = [
      ...new Set([
        state.model,
        "gemini-2.5-flash",
        "gemini-2.0-flash"
      ])
    ];

    let lastError;

    for (const model of models) {
      for (let attempt = 0; attempt < 2; attempt++) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 25000);

        try {
          const response = await fetch(
            `${API_BASE}${encodeURIComponent(model)}:generateContent`,
            {
              method: "POST",
              signal: controller.signal,
              headers: {
                "Content-Type": "application/json",
                "x-goog-api-key": state.key
              },
              body: JSON.stringify({
                contents,
                generationConfig: { maxOutputTokens: 1024 }
              })
            }
          );

          const data = await response.json().catch(() => ({}));

          if (!response.ok) {
            const error = new Error(
              data.error?.message || `Gemini API error: HTTP ${response.status}`
            );
            error.status = response.status;
            throw error;
          }

          const answer = (
            data.candidates?.[0]?.content?.parts || []
          ).map(part => part.text || "").join("").trim();

          if (!answer) {
            throw new Error("Gemini returned an empty answer. Try again.");
          }

          state.history.push(
            { role: "user", parts },
            { role: "model", parts: [{ text: answer }] }
          );

          state.model = model;
          localStorage.setItem("infinity_gemini_model", model);
          updateProviderUI();

          return answer;
        } catch (error) {
          lastError = error;

          const retryable =
            error.name === "AbortError" ||
            [429, 500, 502, 503, 504].includes(error.status);

          if (!retryable) break;

          if (attempt === 0) {
            await new Promise(resolve => setTimeout(resolve, 1200));
          }
        } finally {
          clearTimeout(timeout);
        }
      }
    }

    throw new Error(
      lastError?.name === "AbortError"
        ? "Gemini timed out. Please try again later."
        : `Gemini request failed: ${lastError?.message || "Unknown error"}`
    );
  }

  $("chatForm").addEventListener("submit", async event => {
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

  updateProviderUI();
  resizeInput();
}

try {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initApp, { once: true });
  } else {
    initApp();
  }
} catch (error) {
  console.error("Infinity AI initialization failed:", error);
  alert("Infinity AI could not start. Open the browser Console for details.");
}
