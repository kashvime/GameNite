import "./MessageCreation.css";
import { type SubmitEvent, type KeyboardEvent, type ChangeEvent, useRef, useState } from "react";

interface MessageCreationProps {
  handleMessageCreation: (text: string) => void;
}

export default function MessageCreation({ handleMessageCreation }: MessageCreationProps) {
  const [text, setText] = useState<string>("");
  const [sendError, setSendError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // This stays intentionally small since we currently send images as data URLs
  // in the existing websocket `text` field.
  const maxAttachmentBytes = 800_000; // ~0.8MB

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.code === "Enter" && !e.shiftKey) {
      e.preventDefault(); // Don't edit text
      setSendError(null);
      handleMessageCreation(text);
      setText("");
    }
  }

  function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    setSendError(null);
    handleMessageCreation(text);
    setText("");
  }

  function readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.onload = () => {
        const { result } = reader;
        if (typeof result !== "string") {
          reject(new Error("Unexpected file reader result"));
          return;
        }
        resolve(result);
      };
      reader.readAsDataURL(file);
    });
  }

  async function handleAttachmentChange(e: ChangeEvent<HTMLInputElement>) {
    setSendError(null);

    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setSendError("Please choose an image file.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    if (file.size > maxAttachmentBytes) {
      setSendError("That image is too large. Please choose something under ~0.8MB.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      setText("");
      handleMessageCreation(dataUrl);
    } catch {
      setSendError("Could not read the image file.");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <form data-testid="message-creation-form" className="messageCreation" onSubmit={handleSubmit}>
      <div className="messageInputWrap">
        <textarea
          placeholder="Send a message to chat"
          value={text}
          onKeyDown={handleKeyDown}
          onChange={(e) => setText(e.target.value)}
        ></textarea>

        {/* Hidden input; triggered by the attach button */}
        <input
          ref={fileInputRef}
          className="messageFileInput"
          type="file"
          accept="image/*"
          onChange={handleAttachmentChange}
          aria-label="Send image or GIF"
        />
        <button
          type="button"
          className="messageAttachBtn"
          aria-label="Attach image or GIF"
          onClick={() => fileInputRef.current?.click()}
          title="Attach image/GIF"
        >
          +
        </button>
      </div>
      {sendError && (
        <p className="error-message" style={{ margin: "0 1rem" }}>
          {sendError}
        </p>
      )}
      <button className="visuallyHidden">Submit</button>
    </form>
  );
}
