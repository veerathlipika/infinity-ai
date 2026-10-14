
function errorText(data, status) {
  const apiMessage = data?.error?.message || "";

  if (status === 400) {
    return `Invalid Gemini request: ${apiMessage || "Check the model and request format."}`;
  }

  if (status === 401 || status === 403) {
    return "API key authentication failed. Open AI provider settings and verify your Gemini API key and permissions.";
  }

  if (status === 429) {
    return "Gemini rate limit or quota reached. The app will try another model when possible. If all models fail, check your Google AI Studio quota.";
  }

  if (status === 503 || status === 502 || status === 504) {
    return "Gemini is temporarily overloaded or unavailable. Please try again shortly.";
  }

  if (status === 404) {
    return `The selected Gemini model was not found or is unavailable to your API key. ${apiMessage}`;
  }

  return apiMessage || `Gemini request failed (HTTP ${status}). Please try again.`;
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

  // Try the selected model first, then stable alternatives.
  const models = [
    ...new Set([
      state.model || "gemini-3.8-flash",
      "gemini-3.6-flash",
      "gemini-3.5-flash-lite"
    ])
  ];

  let lastError = null;

  for (const model of models) {
    // Retry temporary server overloads twice before switching models.
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        if (attempt > 0) {
          const delay = attempt * 1500;
          await new Promise(resolve => setTimeout(resolve, delay));
        }

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
                maxOutputTokens: 2048
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
            "Gemini returned no text. Please try a different prompt."
          );
        }

        // Save conversation only after a successful response.
        state.history.push(
          { role: "user", parts },
          { role: "model", parts: [{ text: answer }] }
        );

        // Remember which model actually succeeded.
        state.model = model;
        localStorage.setItem("infinity_gemini_model", model);
        updateProviderUI();

        return answer;

      } catch (error) {
        lastError = error;

        const retryable = [
          408, 429, 500, 502, 503, 504
        ].includes(error.status);

        // Invalid key, bad request, or unsupported model:
        // stop retrying this model and move to the next one.
        if (!retryable) {
          break;
        }

        // Retry temporary failures, then try the next model.
        if (attempt === 2) {
          break;
        }
      }
    }
  }

  throw new Error(
    `${lastError?.message || "Gemini request failed."}\n\n` +
    "Tried the selected model and available fallback models. " +
    "Check your API key, model access, quota, and Google AI Studio service status."
  );
}
