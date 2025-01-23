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
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      // Even if the server returns 4xx/5xx, we want to parse the body:
      let data;
      try {
        data = await response.json();
      } catch (jsonError) {
        console.error("Failed to parse JSON:", jsonError);
        // Fallback if no valid JSON came back
        data = { extracted_text: "", structured_text: "", error: "No valid JSON" };
      }

      setResult(data);
    } catch (error) {
      // This catch only triggers if fetch() itself fails (e.g., network down)
      console.error("Fetch error:", error);
      setResult({ extracted_text: "", structured_text: "", error: String(error) });
    } finally {
      setLoading(false);
    }
  };

  // Safely handle missing or empty strings for structured_text
  const safeStructuredText = (result?.structured_text ?? "")
    // Optionally transform the text if it's not empty:
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
          {result.error && (
            <div className="errorBox">
              <p style={{ color: "red" }}>Error: {result.error}</p>
            </div>
          )}

          <div className="resultBox">
            <h2>Raw Text</h2>
            <pre>{result.extracted_text}</pre>
          </div>

          <div className="resultBox">
            <h2>Structured Text</h2>
            <div
              dangerouslySetInnerHTML={{
                __html: safeStructuredText,
              }}
            />
          </div>
        </div>
      )}
    </main>
  );
}
