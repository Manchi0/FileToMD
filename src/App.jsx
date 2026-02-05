import React, { useState, useEffect, useCallback } from 'react';

const STATUS_ICONS = {
  pending: '○',
  converting: '◐',
  success: '✓',
  error: '✗',
};

function App() {
  const [inputPaths, setInputPaths] = useState([]);
  const [outputFolder, setOutputFolder] = useState('');
  const [isConverting, setIsConverting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, currentFile: '' });
  const [results, setResults] = useState([]);
  const [statusMessage, setStatusMessage] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);

  // Listen for conversion progress updates
  useEffect(() => {
    if (!window.electronAPI) return;

    const cleanup = window.electronAPI.onConversionProgress((data) => {
      if (data.status === 'starting' || data.status === 'ready') {
        setStatusMessage(data.message);
        if (data.total) {
          setProgress((prev) => ({ ...prev, total: data.total }));
        }
      } else if (data.status === 'converting') {
        setProgress({
          current: data.progress,
          total: data.total,
          currentFile: data.file,
        });
        setStatusMessage(data.message);
      } else if (data.status === 'converted') {
        setProgress((prev) => ({
          ...prev,
          current: data.progress,
          currentFile: data.file,
        }));
      } else if (data.status === 'complete') {
        setIsConverting(false);
        setStatusMessage(data.message);
        if (data.results) {
          setResults(data.results);
        }
      } else if (data.status === 'error') {
        setStatusMessage(`Error: ${data.error || data.message}`);
        if (!data.file) {
          setIsConverting(false);
        }
      }
    });

    return cleanup;
  }, []);

  const handleSelectFiles = async () => {
    if (!window.electronAPI) return;
    const result = await window.electronAPI.selectFiles();
    if (!result.canceled && result.files.length > 0) {
      setInputPaths((prev) => [...prev, ...result.files]);
      setResults([]);
    }
  };

  const handleSelectFolder = async () => {
    if (!window.electronAPI) return;
    const result = await window.electronAPI.selectFolder();
    if (!result.canceled && result.folder) {
      setInputPaths((prev) => [...prev, result.folder]);
      setResults([]);
    }
  };

  const handleSelectOutputFolder = async () => {
    if (!window.electronAPI) return;
    const result = await window.electronAPI.selectOutputFolder();
    if (!result.canceled && result.folder) {
      setOutputFolder(result.folder);
    }
  };

  const handleRemovePath = (index) => {
    setInputPaths((prev) => prev.filter((_, i) => i !== index));
  };

  const handleClearAll = () => {
    setInputPaths([]);
    setResults([]);
    setStatusMessage('');
    setProgress({ current: 0, total: 0, currentFile: '' });
  };

  const handleStartConversion = async () => {
    if (!window.electronAPI || inputPaths.length === 0 || !outputFolder) return;

    setIsConverting(true);
    setResults([]);
    setProgress({ current: 0, total: 0, currentFile: '' });
    setStatusMessage('Starting conversion...');

    await window.electronAPI.startConversion(inputPaths, outputFolder);
  };

  const handleCancelConversion = async () => {
    if (!window.electronAPI) return;
    await window.electronAPI.cancelConversion();
    setIsConverting(false);
    setStatusMessage('Conversion cancelled');
  };

  // Drag and drop handlers
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const items = e.dataTransfer.items;
    const paths = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file.path) {
          paths.push(file.path);
        }
      }
    }

    if (paths.length > 0) {
      setInputPaths((prev) => [...prev, ...paths]);
      setResults([]);
    }
  }, []);

  const getFileName = (path) => {
    return path.split(/[/\\]/).pop();
  };

  const progressPercent = progress.total > 0 ? (progress.current / progress.total) * 100 : 0;

  return (
    <div className="app">
      <header className="header">
        <h1>Docling Converter</h1>
        <p className="subtitle">Convert documents to Markdown</p>
      </header>

      <main className="main">
        {/* Drop Zone */}
        <div
          className={`drop-zone ${isDragOver ? 'drag-over' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="drop-zone-content">
            <span className="drop-icon">📄</span>
            <p>Drag & drop files or folders here</p>
            <p className="drop-hint">PDF, DOCX, PPTX, XLSX, HTML, Images</p>
          </div>
        </div>

        {/* Selection Buttons */}
        <div className="button-row">
          <button onClick={handleSelectFiles} disabled={isConverting}>
            Select Files
          </button>
          <button onClick={handleSelectFolder} disabled={isConverting}>
            Select Folder
          </button>
          {inputPaths.length > 0 && (
            <button onClick={handleClearAll} disabled={isConverting} className="secondary">
              Clear All
            </button>
          )}
        </div>

        {/* Input Files List */}
        {inputPaths.length > 0 && (
          <div className="file-list">
            <h3>Input ({inputPaths.length})</h3>
            <ul>
              {inputPaths.map((path, index) => (
                <li key={index}>
                  <span className="file-name">{getFileName(path)}</span>
                  <span className="file-path">{path}</span>
                  {!isConverting && (
                    <button
                      className="remove-btn"
                      onClick={() => handleRemovePath(index)}
                      title="Remove"
                    >
                      ×
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Output Folder Selection */}
        <div className="output-section">
          <h3>Output Folder</h3>
          <div className="output-row">
            <input
              type="text"
              value={outputFolder}
              readOnly
              placeholder="Select output folder..."
              className="output-input"
            />
            <button onClick={handleSelectOutputFolder} disabled={isConverting}>
              Browse
            </button>
          </div>
        </div>

        {/* Progress Section */}
        {isConverting && (
          <div className="progress-section">
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="progress-text">
              {progress.current} / {progress.total} files
            </div>
            {progress.currentFile && (
              <div className="current-file">
                Converting: {getFileName(progress.currentFile)}
              </div>
            )}
          </div>
        )}

        {/* Status Message */}
        {statusMessage && (
          <div className={`status-message ${statusMessage.startsWith('Error') ? 'error' : ''}`}>
            {statusMessage}
          </div>
        )}

        {/* Results */}
        {results.length > 0 && (
          <div className="results-section">
            <h3>Results</h3>
            <ul className="results-list">
              {results.map((result, index) => (
                <li key={index} className={result.success ? 'success' : 'error'}>
                  <span className="result-icon">
                    {result.success ? STATUS_ICONS.success : STATUS_ICONS.error}
                  </span>
                  <span className="result-file">{getFileName(result.input)}</span>
                  {result.success && result.output && (
                    <span className="result-output">→ {getFileName(result.output)}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Action Buttons */}
        <div className="action-row">
          {!isConverting ? (
            <button
              className="primary"
              onClick={handleStartConversion}
              disabled={inputPaths.length === 0 || !outputFolder}
            >
              Convert to Markdown
            </button>
          ) : (
            <button className="danger" onClick={handleCancelConversion}>
              Cancel
            </button>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
