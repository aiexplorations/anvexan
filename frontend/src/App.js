import React, { useState } from 'react';
import './App.css';
import SearchBar from './components/SearchBar';
import PaperList from './components/PaperList';
import DownloadSettings from './components/DownloadSettings';
import Header from './components/Header';
import LoadingSpinner from './components/LoadingSpinner';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function App() {
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [downloadPath, setDownloadPath] = useState('');
  const [downloadBehavior, setDownloadBehavior] = useState('download');
  const [directoryHandle, setDirectoryHandle] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <ThemeProvider>
      <div className="App">
        <Header />
        
        <main className="main-content">
          <div className="container">
            {/* Search Section */}
            <section className="search-section">
              <div className="search-container">
                <h1 className="search-title">
                  Search ArXiv Papers
                </h1>
                <p className="search-subtitle">
                  Discover and download research papers from ArXiv
                </p>
                
                <SearchBar 
                  onSearch={setPapers}
                  setLoading={setLoading}
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                />
              </div>
            </section>

            {/* Download Settings Sidebar */}
            <DownloadSettings 
              downloadPath={downloadPath}
              setDownloadPath={setDownloadPath}
              downloadBehavior={downloadBehavior}
              setDownloadBehavior={setDownloadBehavior}
              directoryHandle={directoryHandle}
              setDirectoryHandle={setDirectoryHandle}
            />

            {/* Loading State */}
            {loading && <LoadingSpinner />}

            {/* Results Section */}
            {papers.length > 0 && (
              <section className="results-section">
                <div className="results-header">
                  <h2>Search Results</h2>
                  <span className="results-count">
                    {papers.length} papers found for "{searchQuery}"
                  </span>
                </div>
                
                <PaperList 
                  papers={papers} 
                  downloadPath={downloadPath}
                  downloadBehavior={downloadBehavior}
                  directoryHandle={directoryHandle}
                />
              </section>
            )}

            {/* Empty State */}
            {!loading && papers.length === 0 && searchQuery && (
              <div className="empty-state">
                <div className="empty-state-content">
                  <h3>No papers found</h3>
                  <p>Try adjusting your search terms or using different keywords.</p>
                </div>
              </div>
            )}
          </div>
        </main>

        <ToastContainer
          position="bottom-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
        />
      </div>
    </ThemeProvider>
  );
}

export default App;