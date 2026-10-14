
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

  // Try at most two models to avoid long waits.
  const fallback =
    state.model === "gemini-3.8-flash"
      ? "gemini-3.6-flash"
      : "gemini-3.8-flash";

  const models = [...new Set([state.model, fallback])];
  let lastError = null;

  for (const model of models) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

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
            generationConfig: {
              maxOutputTokens: 1024
            }
          })
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const error = new Error(errorText(data, response.status));
        error.status = response.status;
        throw error;
      }

      const answer = (
        data.candidates?.[0]?.content?.parts || []
      )
        .map(part => part.text || "")
        .join("")
        .trim();

      if (!answer) {
        throw new Error(
          "Gemini returned an empty response. Please try again."
        );
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

      const canTryFallback =
        error.name === "AbortError" ||
        [404, 429, 500, 502, 503, 504].includes(error.status);

      if (!canTryFallback) {
        throw error;
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }

  if (lastError?.name === "AbortError") {
    throw new Error(
      "Gemini took too long to respond. Both model attempts timed out. " +
      "Please check your connection or try again later."
    );
  }

  throw new Error(
    lastError?.message ||
    "Gemini is temporarily unavailable. Please try again later."
  );
}
