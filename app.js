
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

  // Try the selected model first, then alternatives.
  const models = [
    ...new Set([
      state.model,
      "gemini-3.6-flash",
      "gemini-3.5-flash-lite"
    ])
  ];

  let lastError = null;

  for (const model of models) {
    // Two attempts per model, with a delay before retrying.
    for (let attempt = 0; attempt < 2; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        25000
      );

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
          const message =
            data.error?.message ||
            `Gemini API returned HTTP ${response.status}`;

          const error = new Error(message);
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

        const retryable =
          error.name === "AbortError" ||
          [408, 429, 500, 502, 503, 504].includes(error.status);

        if (!retryable) {
          throw error;
        }

        // Wait 1 second, then 2 seconds before another attempt.
        if (attempt === 0) {
          await new Promise(resolve =>
            setTimeout(resolve, 1000)
          );
        }
      } finally {
        clearTimeout(timeoutId);
      }
    }
  }

  if (lastError?.name === "AbortError") {
    throw new Error(
      "Gemini timed out on all available attempts. " +
      "Please try again later."
    );
  }

  throw new Error(
    "All attempted Gemini models failed. Last error: " +
    (lastError?.message || "Unknown API error")
  );
}
