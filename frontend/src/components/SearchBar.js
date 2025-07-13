import React, { useState } from 'react';
import { FaSearch, FaTimes } from 'react-icons/fa';
import { toast } from 'react-toastify';
import './SearchBar.css';

const SearchBar = ({ onSearch, setLoading, searchQuery, setSearchQuery }) => {
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    
    if (!searchQuery.trim()) {
      toast.error('Please enter a search query');
      return;
    }

    setIsSearching(true);
    setLoading(true);

    try {
      const response = await fetch(`/search?query=${encodeURIComponent(searchQuery.trim())}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data && Array.isArray(data)) {
        onSearch(data);
        toast.success(`Found ${data.length} papers`);
      } else {
        onSearch([]);
        toast.info('No papers found');
      }
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Failed to search papers. Please try again.');
      onSearch([]);
    } finally {
      setIsSearching(false);
      setLoading(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    onSearch([]);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch(e);
    }
  };

  return (
    <div className="search-bar">
      <form onSubmit={handleSearch} className="search-form">
        <div className="search-input-container">
          <FaSearch className="search-icon" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Enter keywords (e.g., 'machine learning', 'quantum computing')"
            className="search-input"
            disabled={isSearching}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={clearSearch}
              className="clear-button"
              aria-label="Clear search"
            >
              <FaTimes />
            </button>
          )}
        </div>
        
        <button 
          type="submit" 
          className={`search-button ${isSearching ? 'searching' : ''}`}
          disabled={isSearching || !searchQuery.trim()}
        >
          {isSearching ? (
            <>
              <div className="spinner"></div>
              Searching...
            </>
          ) : (
            <>
              <FaSearch />
              Search
            </>
          )}
        </button>
      </form>

      <div className="search-suggestions">
        <span className="suggestions-label">Try: </span>
        {['machine learning', 'quantum computing', 'neural networks', 'deep learning'].map((suggestion) => (
          <button
            key={suggestion}
            className="suggestion-tag"
            onClick={() => {
              setSearchQuery(suggestion);
            }}
            disabled={isSearching}
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
};

export default SearchBar;