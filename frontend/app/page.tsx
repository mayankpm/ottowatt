"use client";
import React, { useState } from "react";
import "./Page.css";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [apiKey, setApiKey] = useState<string>(""); // For user-provided API key
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      alert("Please upload a file.");
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append("file", file);
    if (apiKey) formData.append("api_key", apiKey); // Attach API key if provided

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      let data;
      try {
        data = await response.json();
      } catch (jsonError) {
        console.error("Failed to parse JSON:", jsonError);
        data = { extracted_text: "", structured_text: "", error: "No valid JSON returned" };
      }

      setResult(data);
    } catch (error) {
      console.error("Fetch error:", error);
      setResult({ extracted_text: "", structured_text: "", error: String(error) });
    } finally {
      setLoading(false);
    }
  };

  const safeStructuredText = (result?.structured_text ?? "")
  .replace(/^### (.*?)$/gm, "<h3>$1</h3>")
  .replace(/^## (.*?)$/gm, "<h2>$1</h2>")
  .replace(/^# (.*?)$/gm, "<h1>$1</h1>")
  .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
  .replace(/---/g, "<hr>")
  .replace(/^\* (.*?)$/gm, "<ul><li>$1</li></ul>")
  .replace(/^\d+\. (.*?)$/gm, "<ol><li>$1</li></ol>")
  .replace(/`(.*?)`/g, "<code>$1</code>")
  .replace(/^> (.*?)$/gm, "<blockquote>$1</blockquote>")
  .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank">$1</a>')
  .replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1" />');


  return (
    <main className="main">
      <form onSubmit={handleSubmit} className="form">
        <input
          type="text"
          placeholder="Enter your OpenAI API key (optional)"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          className="apiKeyInput"
        />
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
