"use client";
import React, { useState } from "react";
import "./Page.css";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      // Make the request — no matter what status code comes back,
      // we will try to read it as JSON.
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      // Attempt to parse JSON even if status is 500.
      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        console.error("Could not parse JSON:", parseError);
        // Fallback if server didn't return valid JSON
        data = { extracted_text: "", structured_text: "" };
      }

      // We store whatever came back, ignoring errors
      setResult(data);

    } catch (fetchError) {
      // This only triggers if fetch() itself fails (network error, etc.)
      console.error("Fetch error:", fetchError);
      // We do NOT set any error state, so the UI remains silent.
      setResult({ extracted_text: "", structured_text: "" });
    } finally {
      setLoading(false);
    }
  };

  // Safely transform structured_text (if any)
  const safeStructuredText = (result?.structured_text ?? "")
    .replace(/^### (.*?)$/gm, "<h3>$1</h3>")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/^## (.*?)$/gm, "<h2>$1</h2>")
    .replace(/^# (.*?)$/gm, "<h1>$1</h1>")
    .replace(/---/g, "<hr>");

  return (
    <main className="main">
      <form onSubmit={handleSubmit} className="form">
        <input
          type="file"
          accept=".pdf"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="fileInput"
        />
        <button type="submit" disabled={!file || loading} className="button">
          {loading ? "Processing..." : "Upload and Process"}
        </button>
      </form>

      {result && (
        <div className="results">
          {/* No explicit "Error" UI. We just won't show anything if server fails. */}
          <div className="resultBox">
            <h2>Raw Text</h2>
            <pre>{result.extracted_text}</pre>
          </div>

          <div className="resultBox">
            <h2>Structured Text</h2>
            <div
              dangerouslySetInnerHTML={{ __html: safeStructuredText }}
            />
          </div>
        </div>
      )}
    </main>
  );
}
