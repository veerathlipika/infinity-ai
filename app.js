
  // Paste screenshots and copied images directly into the chat box.
  promptInput.addEventListener("paste", async (event) => {
    if (state.busy) return;

    const clipboardItems = Array.from(event.clipboardData?.items || []);
    const imageItem = clipboardItems.find(item =>
      item.kind === "file" && item.type.startsWith("image/")
    );

    // Allow normal text pasting when the clipboard has no image.
    if (!imageItem) return;

    event.preventDefault();

    const file = imageItem.getAsFile();
    if (!file) {
      alert("Could not read the copied image. Please try again.");
      return;
    }

    if (file.size > 12 * 1024 * 1024) {
      alert("The image is larger than 12 MB. Please copy a smaller image.");
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

      const preview = $("attachmentPreview");
      preview.replaceChildren();

      const img = document.createElement("img");
      img.src = dataUrl;
      img.alt = "Pasted screenshot preview";

      const label = document.createElement("span");
      label.textContent = "Pasted screenshot";

      const remove = document.createElement("button");
      remove.type = "button";
      remove.textContent = "×";
      remove.setAttribute("aria-label", "Remove pasted image");
      remove.addEventListener("click", clearImage);

      preview.append(img, label, remove);
      preview.hidden = false;
    } catch (error) {
      console.error("Image paste failed:", error);
      alert("Could not paste the screenshot. Please try the + button.");
    }
  });
