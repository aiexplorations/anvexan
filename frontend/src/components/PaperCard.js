import React, { useState } from 'react';
import { FaExternalLinkAlt, FaDownload, FaEye, FaChevronDown, FaChevronUp, FaTimes, FaFolder } from 'react-icons/fa';
import { toast } from 'react-toastify';
import './PaperCard.css';

const PaperCard = ({ paper, downloadPath, downloadBehavior, directoryHandle }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showDownloadOptions, setShowDownloadOptions] = useState(false);

  const handleDirectoryDownload = async () => {
    if (!directoryHandle) {
      toast.error('No directory selected. Please choose a download directory in settings.');
      return handleBlobDownload();
    }

    setIsDownloading(true);
    
    try {
      // Fetch the PDF content
      const response = await fetch(`/download?pdf_link=${encodeURIComponent(paper.pdf_link)}&title=${encodeURIComponent(paper.clean_title || paper.title)}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/pdf',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const blob = await response.blob();
      const filename = `${paper.clean_title || 'paper'}.pdf`;
      
      // Create file in the selected directory
      const fileHandle = await directoryHandle.getFileHandle(filename, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(blob);
      await writable.close();
      
      toast.success(`File saved to ${downloadPath}/${filename}`);
    } catch (error) {
      console.error('Directory download error:', error);
      if (error.name === 'NotAllowedError') {
        toast.error('Permission denied. Please re-select the directory.');
      } else {
        toast.error('Failed to save to directory. Trying fallback method...');
        // Fallback to blob download
        handleBlobDownload();
      }
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDirectDownload = async () => {
    setIsDownloading(true);
    
    try {
      // Create a direct download link without fetching blob first
      const downloadUrl = `/download?pdf_link=${encodeURIComponent(paper.pdf_link)}&title=${encodeURIComponent(paper.clean_title || paper.title)}`;
      
      // Create temporary anchor element
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `${paper.clean_title || 'paper'}.pdf`;
      link.target = '_blank';
      
      // Add to document, click, and remove
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Download started - check your downloads folder!');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download paper. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleBlobDownload = async () => {
    setIsDownloading(true);
    
    try {
      const response = await fetch(`/download?pdf_link=${encodeURIComponent(paper.pdf_link)}&title=${encodeURIComponent(paper.clean_title || paper.title)}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/pdf',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const blob = await response.blob();
      
      // Create blob URL
      const blobUrl = window.URL.createObjectURL(blob);
      
      // Create download link
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `${paper.clean_title || 'paper'}.pdf`;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up blob URL
      window.URL.revokeObjectURL(blobUrl);
      
      toast.success('Paper downloaded successfully!');
    } catch (error) {
      console.error('Blob download error:', error);
      toast.error('Blob download failed. Trying direct method...');
      // Fallback to direct download
      handleDirectDownload();
    } finally {
      setIsDownloading(false);
    }
  };

  const handleWindowOpen = () => {
    // Open download URL in new window (may trigger download without dialog)
    const downloadUrl = `/download?pdf_link=${encodeURIComponent(paper.pdf_link)}&title=${encodeURIComponent(paper.clean_title || paper.title)}`;
    window.open(downloadUrl, '_blank');
    toast.info('Download opened in new window');
  };

  const handleOpenInNewTab = () => {
    window.open(paper.pdf_link, '_blank', 'noopener,noreferrer');
    toast.info('PDF opened in new tab');
  };

  const handleDownload = () => {
    if (downloadBehavior === 'ask') {
      setShowDownloadOptions(true);
    } else if (downloadBehavior === 'open') {
      handleOpenInNewTab();
    } else {
      // Use directory download if available, otherwise fallback to blob
      if (directoryHandle) {
        handleDirectoryDownload();
      } else {
        handleBlobDownload();
      }
    }
  };

  const handleDownloadOption = (option) => {
    setShowDownloadOptions(false);
    
    switch (option) {
      case 'directory':
        handleDirectoryDownload();
        break;
      case 'blob':
        handleBlobDownload();
        break;
      case 'direct':
        handleDirectDownload();
        break;
      case 'window':
        handleWindowOpen();
        break;
      case 'open':
        handleOpenInNewTab();
        break;
      default:
        break;
    }
  };

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  const truncateText = (text, maxLength = 200) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <div className="paper-card">
      <div className="paper-header">
        <h3 className="paper-title">{paper.title}</h3>
      </div>

      <div className="paper-content">
        <div className="paper-summary">
          <p className="summary-text">
            {isExpanded ? paper.summary : truncateText(paper.summary)}
          </p>
          
          {paper.summary.length > 200 && (
            <button 
              className="expand-button"
              onClick={toggleExpanded}
            >
              {isExpanded ? (
                <>
                  <FaChevronUp /> Show Less
                </>
              ) : (
                <>
                  <FaChevronDown /> Show More
                </>
              )}
            </button>
          )}
        </div>
      </div>

      <div className="paper-actions">
        <a
          href={paper.link}
          target="_blank"
          rel="noopener noreferrer"
          className="action-button secondary"
        >
          <FaExternalLinkAlt />
          <span>View on ArXiv</span>
        </a>

        <a
          href={paper.pdf_link}
          target="_blank"
          rel="noopener noreferrer"
          className="action-button secondary"
        >
          <FaEye />
          <span>Preview PDF</span>
        </a>

        <button
          className={`action-button primary ${isDownloading ? 'downloading' : ''}`}
          onClick={handleDownload}
          disabled={isDownloading}
        >
          {isDownloading ? (
            <>
              <div className="spinner"></div>
              <span>Downloading...</span>
            </>
          ) : (
            <>
              <FaDownload />
              <span>
                {downloadBehavior === 'open' ? 'Open PDF' : 
                 downloadBehavior === 'ask' ? 'Download Options' : 
                 'Download PDF'}
              </span>
            </>
          )}
        </button>
      </div>

      {downloadPath && (
        <div className="download-info">
          <small>Saves to: {downloadPath}/</small>
        </div>
      )}

      {/* Download Options Modal */}
      {showDownloadOptions && (
        <div className="download-options-overlay">
          <div className="download-options-modal">
            <div className="modal-header">
              <h4>Download Options</h4>
              <button
                className="close-modal-button"
                onClick={() => setShowDownloadOptions(false)}
              >
                <FaTimes />
              </button>
            </div>
            
            <div className="modal-content">
              <p className="modal-subtitle">Choose a download method:</p>
              
              <div className="download-options">
                {directoryHandle && (
                  <button
                    className="download-option-button"
                    onClick={() => handleDownloadOption('directory')}
                  >
                    <FaFolder className="option-icon" />
                    <div className="option-text">
                      <span className="option-title">Save to {downloadPath}</span>
                      <span className="option-description">Save directly to your chosen directory</span>
                    </div>
                  </button>
                )}

                <button
                  className="download-option-button"
                  onClick={() => handleDownloadOption('blob')}
                >
                  <FaDownload className="option-icon" />
                  <div className="option-text">
                    <span className="option-title">Browser Download</span>
                    <span className="option-description">Download using browser (may show dialog)</span>
                  </div>
                </button>

                <button
                  className="download-option-button"
                  onClick={() => handleDownloadOption('direct')}
                >
                  <FaFolder className="option-icon" />
                  <div className="option-text">
                    <span className="option-title">Direct Link</span>
                    <span className="option-description">Direct link download</span>
                  </div>
                </button>

                <button
                  className="download-option-button"
                  onClick={() => handleDownloadOption('window')}
                >
                  <FaExternalLinkAlt className="option-icon" />
                  <div className="option-text">
                    <span className="option-title">New Window</span>
                    <span className="option-description">Open download in new window</span>
                  </div>
                </button>

                <button
                  className="download-option-button"
                  onClick={() => handleDownloadOption('open')}
                >
                  <FaEye className="option-icon" />
                  <div className="option-text">
                    <span className="option-title">View PDF</span>
                    <span className="option-description">Open PDF for viewing</span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaperCard;