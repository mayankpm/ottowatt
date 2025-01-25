"use client";
import React, { useState } from "react";
import "./Page.css";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [apiKey, setApiKey] = useState<string>("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [useEnv, setUseEnv] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      alert("Please upload a file.");
      return;
    }
    setLoading(true);
    const formData = new FormData();
    formData.append("file", file);
    if (!useEnv && apiKey) formData.append("api_key", apiKey);

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      let data;
      try {
        data = await response.json();
      } catch {
        data = { extracted_text: "", structured_text: "", error: "No valid JSON returned" };
      }
      setResult(data);
    } catch (error) {
      setResult({ extracted_text: "", structured_text: "", error: String(error) });
    } finally {
      setLoading(false);
    }
  };

  const safeStructuredText = (result?.structured_text ?? "")
    .replace(/^### (.*?)$/gm, "<h3>$1</h3>")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/^## (.*?)$/gm, "<h2>$1</h2>")
    .replace(/^# (.*?)$/gm, "<h1>$1</h1>")
    .replace(/---/g, "<hr>");

  return (
    <main className="main">
      <form onSubmit={handleSubmit} className="form">
        <label>
          <input
            type="checkbox"
            checked={useEnv}
            onChange={() => setUseEnv(!useEnv)}
          />
          Use .env file
        </label>
        {!useEnv && (
          <input
            type="password"
            placeholder="Enter your OpenAI API key (optional)"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="apiKeyInput"
          />
        )}
        <input
          type="file"
          accept=".pdf"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="fileInput"
        />
        <button type="submit" disabled={!file || loading} className="button">
          Submit
        </button>
      </form>

      {loading && <p>Please wait for a few seconds</p>}
      
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
