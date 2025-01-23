// app/page.tsx
'use client';
import React, { useState } from 'react';
import './Page.css';

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/upload`, {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

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
          {loading ? 'Processing...' : 'Upload and Process'}
        </button>
      </form>

      {result && (
        <div className="results">
          <div className="resultBox">
            <h2>Raw Text</h2>
            <pre>{result.extracted_text}</pre>
          </div>
          <div className="resultBox">
            <h2>Structured Text</h2>
            <div dangerouslySetInnerHTML={{ 
            __html: result.structured_text
                .replace(/^### (.*?)$/gm, '<h3>$1</h3>')
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/^## (.*?)$/gm, '<h2>$1</h2>')
                .replace(/^# (.*?)$/gm, '<h1>$1</h1>')
                .replace(/---/g, '<hr>')
            }} />

          </div>
        </div>
      )}
    </main>
  );
}
