import React, { useState, useEffect } from 'react';
import { FaFolder, FaCog, FaTimes, FaDownload, FaExternalLinkAlt, FaInfo, FaExclamationTriangle, FaFolderOpen } from 'react-icons/fa';
import './DownloadSettings.css';

const DownloadSettings = ({ downloadPath, setDownloadPath, downloadBehavior, setDownloadBehavior, directoryHandle, setDirectoryHandle }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [fileSystemSupported, setFileSystemSupported] = useState(false);
  const [isSelectingDirectory, setIsSelectingDirectory] = useState(false);

  useEffect(() => {
    // Check if File System Access API is supported
    const isSupported = 'showDirectoryPicker' in window;
    setFileSystemSupported(isSupported);

    // Load preferences from localStorage
    const savedBehavior = localStorage.getItem('anvexan_download_behavior');
    const savedPath = localStorage.getItem('anvexan_download_path');

    if (savedBehavior) {
      setDownloadBehavior(savedBehavior);
    }
    if (savedPath) {
      setDownloadPath(savedPath);
    }
  }, [setDownloadBehavior, setDownloadPath]);

  const toggleSettings = () => {
    setIsOpen(!isOpen);
  };

  const handleBehaviorChange = (e) => {
    const behavior = e.target.value;
    setDownloadBehavior(behavior);
    localStorage.setItem('anvexan_download_behavior', behavior);
  };

  const handleSelectDirectory = async () => {
    if (!fileSystemSupported) {
      alert('File System Access API not supported in this browser');
      return;
    }

    setIsSelectingDirectory(true);
    
    try {
      const handle = await window.showDirectoryPicker();
      setDirectoryHandle(handle);
      setDownloadPath(handle.name);
      localStorage.setItem('anvexan_download_path', handle.name);
      
      // Store the directory handle reference (can't serialize the handle itself)
      localStorage.setItem('anvexan_has_directory', 'true');
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Error selecting directory:', error);
        alert('Failed to select directory');
      }
    } finally {
      setIsSelectingDirectory(false);
    }
  };

  const clearDirectory = () => {
    setDirectoryHandle(null);
    setDownloadPath('');
    localStorage.removeItem('anvexan_download_path');
    localStorage.removeItem('anvexan_has_directory');
  };

  const resetPreferences = () => {
    setDownloadBehavior('download');
    clearDirectory();
    localStorage.removeItem('anvexan_download_behavior');
  };

  return (
    <>
      {/* Settings Toggle Button */}
      <button 
        className={`settings-toggle ${isOpen ? 'active' : ''}`}
        onClick={toggleSettings}
        aria-label="Download Settings"
      >
        <FaCog />
      </button>

      {/* Settings Panel */}
      <div className={`settings-panel ${isOpen ? 'open' : ''}`}>
        <div className="settings-header">
          <h3>Download Settings</h3>
          <button 
            className="close-button"
            onClick={toggleSettings}
            aria-label="Close Settings"
          >
            <FaTimes />
          </button>
        </div>

        <div className="settings-content">
          {/* Download Behavior */}
          <div className="setting-group">
            <label htmlFor="download-behavior" className="setting-label">
              <FaDownload className="label-icon" />
              Download Behavior
            </label>
            <select
              id="download-behavior"
              value={downloadBehavior}
              onChange={handleBehaviorChange}
              className="behavior-select"
            >
              <option value="download">Download PDF Files</option>
              <option value="open">Open in New Tab</option>
              <option value="ask">Ask Each Time</option>
            </select>
            <small className="setting-help">
              {downloadBehavior === 'download' && 'Downloads files directly to your chosen directory (or browser default)'}
              {downloadBehavior === 'open' && 'Opens PDFs in a new browser tab for viewing'}
              {downloadBehavior === 'ask' && 'Shows download method options for each paper'}
            </small>
          </div>

          {/* Directory Picker */}
          {fileSystemSupported && (
            <div className="setting-group">
              <label className="setting-label">
                <FaFolder className="label-icon" />
                Download Directory
              </label>
              
              <div className="directory-controls">
                <button
                  className="directory-select-button"
                  onClick={handleSelectDirectory}
                  disabled={isSelectingDirectory}
                >
                  <FaFolderOpen className="button-icon" />
                  {isSelectingDirectory ? 'Selecting...' : 'Choose Directory'}
                </button>
                
                {directoryHandle && (
                  <button
                    className="directory-clear-button"
                    onClick={clearDirectory}
                  >
                    <FaTimes />
                  </button>
                )}
              </div>
              
              {downloadPath && (
                <div className="selected-directory">
                  <FaFolder className="directory-icon" />
                  <span>Selected: {downloadPath}</span>
                </div>
              )}
              
              <small className="setting-help">
                <FaInfo className="info-icon" />
                {directoryHandle 
                  ? 'Files will be saved to your selected directory without dialogs'
                  : 'Choose a directory to save files directly without browser dialogs'
                }
              </small>
            </div>
          )}

          {/* Browser Settings Warning for non-supported browsers */}
          {!fileSystemSupported && (
            <div className="setting-group">
              <div className="setting-warning">
                <FaExclamationTriangle className="warning-icon" />
                <div className="warning-text">
                  <strong>Browser Limitation:</strong>
                  <p>Your browser doesn't support advanced file system access. To avoid download dialogs:</p>
                  <p><strong>Chrome:</strong> Settings → Downloads → Turn off "Ask where to save"</p>
                  <p><strong>Firefox:</strong> Settings → General → Downloads → Turn off dialog</p>
                </div>
              </div>
            </div>
          )}

          {/* Reset Preferences */}
          <div className="setting-group">
            <button 
              onClick={resetPreferences}
              className="reset-button"
            >
              Reset to Defaults
            </button>
          </div>

          {/* Information Section */}
          <div className="setting-info">
            <h4>How It Works</h4>
            <div className="info-sections">
              {fileSystemSupported && (
                <div className="info-section">
                  <h5><FaFolder /> Directory Selection</h5>
                  <p>Choose a specific folder where all PDFs will be saved. No more dialogs or guessing where files went.</p>
                </div>
              )}
              <div className="info-section">
                <h5><FaDownload /> Smart Downloads</h5>
                <p>Multiple download methods with automatic fallbacks ensure files actually get saved.</p>
              </div>
              <div className="info-section">
                <h5><FaExternalLinkAlt /> Viewing Options</h5>
                <p>Option to view PDFs in browser before downloading, or download directly.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Overlay */}
      {isOpen && <div className="settings-overlay" onClick={toggleSettings}></div>}
    </>
  );
};

export default DownloadSettings;