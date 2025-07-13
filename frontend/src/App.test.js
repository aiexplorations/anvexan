import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from './App';

// Mock the File System Access API
const mockDirectoryHandle = {
  name: 'Test Directory',
  getFileHandle: jest.fn(),
};

global.fetch = jest.fn();

// Mock window.showDirectoryPicker
Object.defineProperty(window, 'showDirectoryPicker', {
  value: jest.fn(),
  writable: true,
});

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

// Mock navigator.userAgent
Object.defineProperty(navigator, 'userAgent', {
  value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
  writable: true,
});

describe('App Component Directory Selection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch.mockClear();
    window.showDirectoryPicker.mockClear();
    mockLocalStorage.getItem.mockClear();
    mockLocalStorage.setItem.mockClear();
    mockLocalStorage.removeItem.mockClear();
    
    // Mock successful fetch response for search
    global.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([
        {
          title: 'Test Paper',
          summary: 'Test summary',
          link: 'https://arxiv.org/abs/1234.5678',
          pdf_link: 'https://arxiv.org/pdf/1234.5678.pdf',
          clean_title: 'test-paper'
        }
      ])
    });
  });

  test('renders app with search functionality', () => {
    render(<App />);
    
    expect(screen.getByText('AnveXan')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search for papers...')).toBeInTheDocument();
    expect(screen.getByText('Search')).toBeInTheDocument();
  });

  test('opens download settings when settings button is clicked', () => {
    render(<App />);
    
    const settingsButton = screen.getByText('⚙️');
    fireEvent.click(settingsButton);
    
    expect(screen.getByText('Download Settings')).toBeInTheDocument();
  });

  test('shows directory selection option in settings', () => {
    render(<App />);
    
    const settingsButton = screen.getByText('⚙️');
    fireEvent.click(settingsButton);
    
    expect(screen.getByText('Download Directory')).toBeInTheDocument();
    expect(screen.getByText('Choose Directory')).toBeInTheDocument();
  });

  test('handles directory selection successfully', async () => {
    window.showDirectoryPicker.mockResolvedValueOnce(mockDirectoryHandle);
    
    render(<App />);
    
    const settingsButton = screen.getByText('⚙️');
    fireEvent.click(settingsButton);
    
    const chooseDirectoryButton = screen.getByText('Choose Directory');
    fireEvent.click(chooseDirectoryButton);
    
    await waitFor(() => {
      expect(window.showDirectoryPicker).toHaveBeenCalledWith({
        mode: 'readwrite'
      });
    });
    
    await waitFor(() => {
      expect(screen.getByText('Selected: Test Directory')).toBeInTheDocument();
    });
  });

  test('handles directory selection cancellation', async () => {
    window.showDirectoryPicker.mockRejectedValueOnce(new Error('User cancelled'));
    
    render(<App />);
    
    const settingsButton = screen.getByText('⚙️');
    fireEvent.click(settingsButton);
    
    const chooseDirectoryButton = screen.getByText('Choose Directory');
    fireEvent.click(chooseDirectoryButton);
    
    await waitFor(() => {
      expect(window.showDirectoryPicker).toHaveBeenCalled();
    });
    
    // Should not show selected directory
    expect(screen.queryByText('Selected: Test Directory')).not.toBeInTheDocument();
  });

  test('handles directory selection permission errors', async () => {
    window.showDirectoryPicker.mockRejectedValueOnce(new Error('Permission denied'));
    
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    render(<App />);
    
    const settingsButton = screen.getByText('⚙️');
    fireEvent.click(settingsButton);
    
    const chooseDirectoryButton = screen.getByText('Choose Directory');
    fireEvent.click(chooseDirectoryButton);
    
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Directory selection failed:', expect.any(Error));
    });
    
    consoleSpy.mockRestore();
  });

  test('resets directory selection when reset button is clicked', async () => {
    window.showDirectoryPicker.mockResolvedValueOnce(mockDirectoryHandle);
    
    render(<App />);
    
    const settingsButton = screen.getByText('⚙️');
    fireEvent.click(settingsButton);
    
    // First select a directory
    const chooseDirectoryButton = screen.getByText('Choose Directory');
    fireEvent.click(chooseDirectoryButton);
    
    await waitFor(() => {
      expect(screen.getByText('Selected: Test Directory')).toBeInTheDocument();
    });
    
    // Then reset it
    const resetButton = screen.getByText('Reset to Defaults');
    fireEvent.click(resetButton);
    
    await waitFor(() => {
      expect(screen.queryByText('Selected: Test Directory')).not.toBeInTheDocument();
    });
  });

  test('passes directory handle to paper components after selection', async () => {
    window.showDirectoryPicker.mockResolvedValueOnce(mockDirectoryHandle);
    
    render(<App />);
    
    // First, search for papers
    const searchInput = screen.getByPlaceholderText('Search for papers...');
    fireEvent.change(searchInput, { target: { value: 'machine learning' } });
    
    const searchButton = screen.getByText('Search');
    fireEvent.click(searchButton);
    
    await waitFor(() => {
      expect(screen.getByText('Test Paper')).toBeInTheDocument();
    });
    
    // Select directory
    const settingsButton = screen.getByText('⚙️');
    fireEvent.click(settingsButton);
    
    const chooseDirectoryButton = screen.getByText('Choose Directory');
    fireEvent.click(chooseDirectoryButton);
    
    await waitFor(() => {
      expect(screen.getByText('Selected: Test Directory')).toBeInTheDocument();
    });
    
    // Close settings
    const closeButton = screen.getByText('✕');
    fireEvent.click(closeButton);
    
    // Check that download button shows directory option
    const downloadButton = screen.getByText('Download PDF');
    fireEvent.click(downloadButton);
    
    expect(screen.getByText('To Selected Directory')).toBeInTheDocument();
  });

  test('shows fallback message when File System Access API is not supported', () => {
    // Mock unsupported browser
    delete window.showDirectoryPicker;
    
    render(<App />);
    
    const settingsButton = screen.getByText('⚙️');
    fireEvent.click(settingsButton);
    
    expect(screen.getByText(/Your browser doesn't support advanced directory selection/)).toBeInTheDocument();
  });

  test('handles search functionality correctly', async () => {
    render(<App />);
    
    const searchInput = screen.getByPlaceholderText('Search for papers...');
    fireEvent.change(searchInput, { target: { value: 'quantum computing' } });
    
    const searchButton = screen.getByText('Search');
    fireEvent.click(searchButton);
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/search?query=quantum computing');
    });
    
    await waitFor(() => {
      expect(screen.getByText('Test Paper')).toBeInTheDocument();
    });
  });

  test('handles search errors gracefully', async () => {
    global.fetch.mockRejectedValueOnce(new Error('Network error'));
    
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    render(<App />);
    
    const searchInput = screen.getByPlaceholderText('Search for papers...');
    fireEvent.change(searchInput, { target: { value: 'test query' } });
    
    const searchButton = screen.getByText('Search');
    fireEvent.click(searchButton);
    
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Search failed:', expect.any(Error));
    });
    
    consoleSpy.mockRestore();
  });

  test('prevents search with empty query', () => {
    render(<App />);
    
    const searchButton = screen.getByText('Search');
    fireEvent.click(searchButton);
    
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('shows loading state during search', async () => {
    // Mock a delayed response
    global.fetch.mockImplementationOnce(() => 
      new Promise(resolve => setTimeout(resolve, 100))
    );
    
    render(<App />);
    
    const searchInput = screen.getByPlaceholderText('Search for papers...');
    fireEvent.change(searchInput, { target: { value: 'test query' } });
    
    const searchButton = screen.getByText('Search');
    fireEvent.click(searchButton);
    
    expect(screen.getByText('Searching...')).toBeInTheDocument();
  });

  test('closes settings modal when close button is clicked', () => {
    render(<App />);
    
    const settingsButton = screen.getByText('⚙️');
    fireEvent.click(settingsButton);
    
    expect(screen.getByText('Download Settings')).toBeInTheDocument();
    
    const closeButton = screen.getByText('✕');
    fireEvent.click(closeButton);
    
    expect(screen.queryByText('Download Settings')).not.toBeInTheDocument();
  });
}); 