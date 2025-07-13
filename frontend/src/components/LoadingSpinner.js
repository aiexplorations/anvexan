import React from 'react';
import { FaSearch } from 'react-icons/fa';
import './LoadingSpinner.css';

const LoadingSpinner = () => {
  return (
    <div className="loading-container">
      <div className="loading-content">
        <div className="loading-spinner">
          <FaSearch className="search-icon" />
          <div className="spinner-ring"></div>
        </div>
        <h3 className="loading-title">Searching ArXiv</h3>
        <p className="loading-message">
          Finding the best research papers for you...
        </p>
        <div className="loading-dots">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    </div>
  );
};

export default LoadingSpinner;