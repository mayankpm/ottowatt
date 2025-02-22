"use client";
import React, { useState } from "react";
import "./Page.css";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [apiKey, setApiKey] = useState<string>("");
  const [envFile, setEnvFile] = useState<File | null>(null);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleEnvFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const lines = content.split("\n");
      const apiKeyLine = lines.find((line) => line.startsWith("OPENAI_API_KEY="));
      if (apiKeyLine) {
        const [, key] = apiKeyLine.split("=");
        setApiKey(key.trim());
      } else {
        alert("No valid OPENAI_API_KEY found in the .env file");
        setEnvFile(null);
      }
    };
    reader.readAsText(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      alert("Please upload a file.");
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append("file", file);
    if (apiKey) formData.append("api_key", apiKey);

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
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/^## (.*?)$/gm, "<h2>$1</h2>")
    .replace(/^# (.*?)$/gm, "<h1>$1</h1>")
    .replace(/---/g, "<hr>");

  return (
    <main className="main">
      <form onSubmit={handleSubmit} className="form">
        <div className="apiKeyInputContainer">
          <span>Attach a .env file or enter your API key manually:</span>
          <div className="inputOptions">
            <input
              type="file"
              accept=".env"
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                setEnvFile(file);
                if (file) handleEnvFile(file);
              }}
              className="fileInput"
            />
            <span>or</span>
            <input
              type="password"
              placeholder="Enter your OpenAI API key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              disabled={!!envFile}
              className="apiKeyInput"
            />
          </div>
        </div>
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
