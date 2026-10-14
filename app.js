
/* Fix settings popup buttons */
document.addEventListener("click", function (event) {
  const target = event.target;
  if (!(target instanceof Element)) return;

  if (target.closest("#openSettings, #openSettingsTop")) {
    event.preventDefault();

    const modal = document.getElementById("settingsModal");
    if (!modal) {
      alert("Settings popup is missing from index.html.");
      return;
    }

    modal.hidden = false;
    modal.style.display = "flex";

    const keyInput = document.getElementById("apiKey");
    const modelSelect = document.getElementById("modelSelect");
    const message = document.getElementById("settingsMessage");

    if (keyInput) {
      keyInput.value = localStorage.getItem("infinity_gemini_key") || "";
      keyInput.focus();
    }

    if (modelSelect) {
      modelSelect.value =
        localStorage.getItem("infinity_gemini_model") || "gemini-3.8-flash";
    }

    if (message) message.textContent = "";
  }

  if (target.closest("#closeSettings")) {
    const modal = document.getElementById("settingsModal");
    if (modal) {
      modal.hidden = true;
      modal.style.display = "none";
    }
  }
});
