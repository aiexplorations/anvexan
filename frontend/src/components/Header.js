import React from 'react';
import { FaGithub, FaSearch, FaDownload } from 'react-icons/fa';
import './Header.css';

const Header = () => {
  return (
    <header className="header">
      <div className="container">
        <div className="header-content">
          <div className="logo">
            <FaSearch className="logo-icon" />
            <span className="logo-text">AnveXan</span>
          </div>
          
          <nav className="nav">
            <a 
              href="https://github.com/aiexplorations/anvexan" 
              target="_blank" 
              rel="noopener noreferrer"
              className="nav-link"
            >
              <FaGithub className="nav-icon" />
              <span>GitHub</span>
            </a>
            
            <a 
              href="https://arxiv.org" 
              target="_blank" 
              rel="noopener noreferrer"
              className="nav-link"
            >
              <FaDownload className="nav-icon" />
              <span>ArXiv</span>
            </a>
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;