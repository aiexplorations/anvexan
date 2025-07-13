import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from '../App';

// Mock the File System Access API
const mockWritableStream = {
  write: jest.fn(),
  close: jest.fn(),
};

const mockFileHandle = {
  createWritable: jest.fn().mockResolvedValue(mockWritableStream),
};

const mockDirectoryHandle = {
  name: 'Downloads',
  getFileHandle: jest.fn().mockResolvedValue(mockFileHandle),
};

// Mock global APIs
global.fetch = jest.fn();
global.URL = {
  createObjectURL: jest.fn(() => 'blob:test-url'),
  revokeObjectURL: jest.fn(),
};

// Mock window.showDirectoryPicker
Object.defineProperty(window, 'showDirectoryPicker', {
  value: jest.fn(),
  writable: true,
});

describe('Download Flow Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch.mockClear();
    window.showDirectoryPicker.mockClear();
    global.URL.createObjectURL.mockClear();
    global.URL.revokeObjectURL.mockClear();
    mockWritableStream.write.mockClear();
    mockWritableStream.close.mockClear();
    mockFileHandle.createWritable.mockClear();
    mockDirectoryHandle.getFileHandle.mockClear();
  });

  const mockSearchResponse = [
    {
      title: 'Machine Learning in Practice: A Comprehensive Guide',
      summary: 'This paper provides a comprehensive overview of machine learning applications in real-world scenarios.',
      link: 'https://arxiv.org/abs/1234.5678',
      pdf_link: 'https://arxiv.org/pdf/1234.5678.pdf',
      clean_title: 'machine-learning-in-practice-a-comprehensive-guide'
    },
    {
      title: 'Deep Learning for Computer Vision',
      summary: 'An extensive review of deep learning techniques for computer vision tasks.',
      link: 'https://arxiv.org/abs/2345.6789',
      pdf_link: 'https://arxiv.org/pdf/2345.6789.pdf',
      clean_title: 'deep-learning-for-computer-vision'
    }
  ];

  test('complete flow: search, select directory, download to directory', async () => {
    // Mock search response
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockSearchResponse)
    });

    // Mock PDF download
    const mockPdfBlob = new Blob(['PDF content'], { type: 'application/pdf' });
    global.fetch.mockResolvedValueOnce({
      ok: true,
      blob: () => Promise.resolve(mockPdfBlob)
    });

    // Mock directory selection
    window.showDirectoryPicker.mockResolvedValueOnce(mockDirectoryHandle);

    render(<App />);

    // Step 1: Search for papers
    const searchInput = screen.getByPlaceholderText('Search for papers...');
    fireEvent.change(searchInput, { target: { value: 'machine learning' } });

    const searchButton = screen.getByText('Search');
    fireEvent.click(searchButton);

    // Wait for search results
    await waitFor(() => {
      expect(screen.getByText('Machine Learning in Practice: A Comprehensive Guide')).toBeInTheDocument();
    });

    // Step 2: Open settings and select directory
    const settingsButton = screen.getByText('⚙️');
    fireEvent.click(settingsButton);

    const chooseDirectoryButton = screen.getByText('Choose Directory');
    fireEvent.click(chooseDirectoryButton);

    // Wait for directory selection
    await waitFor(() => {
      expect(window.showDirectoryPicker).toHaveBeenCalledWith({
        mode: 'readwrite'
      });
    });

    await waitFor(() => {
      expect(screen.getByText('Selected: Downloads')).toBeInTheDocument();
    });

    // Step 3: Close settings
    const closeButton = screen.getByText('✕');
    fireEvent.click(closeButton);

    // Step 4: Download paper to selected directory
    const downloadButton = screen.getByText('Download PDF');
    fireEvent.click(downloadButton);

    expect(screen.getByText('To Selected Directory')).toBeInTheDocument();

    const directoryDownloadButton = screen.getByText('To Selected Directory');
    fireEvent.click(directoryDownloadButton);

    // Verify the complete download flow
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('https://arxiv.org/pdf/1234.5678.pdf');
    });

    await waitFor(() => {
      expect(mockDirectoryHandle.getFileHandle).toHaveBeenCalledWith(
        'machine-learning-in-practice-a-comprehensive-guide.pdf',
        { create: true }
      );
    });

    await waitFor(() => {
      expect(mockFileHandle.createWritable).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(mockWritableStream.write).toHaveBeenCalledWith(mockPdfBlob);
    });

    await waitFor(() => {
      expect(mockWritableStream.close).toHaveBeenCalled();
    });
  });

  test('fallback flow: download without directory selection', async () => {
    // Mock search response
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockSearchResponse)
    });

    // Mock PDF download
    const mockPdfBlob = new Blob(['PDF content'], { type: 'application/pdf' });
    global.fetch.mockResolvedValueOnce({
      ok: true,
      blob: () => Promise.resolve(mockPdfBlob)
    });

    // Mock document.createElement for blob download
    const mockAnchor = {
      href: '',
      download: '',
      click: jest.fn(),
      style: {}
    };
    document.createElement = jest.fn().mockReturnValue(mockAnchor);
    document.body.appendChild = jest.fn();
    document.body.removeChild = jest.fn();

    render(<App />);

    // Step 1: Search for papers
    const searchInput = screen.getByPlaceholderText('Search for papers...');
    fireEvent.change(searchInput, { target: { value: 'machine learning' } });

    const searchButton = screen.getByText('Search');
    fireEvent.click(searchButton);

    // Wait for search results
    await waitFor(() => {
      expect(screen.getByText('Machine Learning in Practice: A Comprehensive Guide')).toBeInTheDocument();
    });

    // Step 2: Download using browser download (no directory selected)
    const downloadButton = screen.getByText('Download PDF');
    fireEvent.click(downloadButton);

    const browserDownloadButton = screen.getByText('Browser Download');
    fireEvent.click(browserDownloadButton);

    // Verify fallback download flow
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('https://arxiv.org/pdf/1234.5678.pdf');
    });

    await waitFor(() => {
      expect(global.URL.createObjectURL).toHaveBeenCalledWith(mockPdfBlob);
    });

    await waitFor(() => {
      expect(mockAnchor.click).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('blob:test-url');
    });
  });

  test('multiple papers download to same directory', async () => {
    // Mock search response
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockSearchResponse)
    });

    // Mock PDF downloads
    const mockPdfBlob1 = new Blob(['PDF content 1'], { type: 'application/pdf' });
    const mockPdfBlob2 = new Blob(['PDF content 2'], { type: 'application/pdf' });
    global.fetch.mockResolvedValueOnce({
      ok: true,
      blob: () => Promise.resolve(mockPdfBlob1)
    });
    global.fetch.mockResolvedValueOnce({
      ok: true,
      blob: () => Promise.resolve(mockPdfBlob2)
    });

    // Mock directory selection
    window.showDirectoryPicker.mockResolvedValueOnce(mockDirectoryHandle);

    render(<App />);

    // Search and select directory
    const searchInput = screen.getByPlaceholderText('Search for papers...');
    fireEvent.change(searchInput, { target: { value: 'machine learning' } });

    const searchButton = screen.getByText('Search');
    fireEvent.click(searchButton);

    await waitFor(() => {
      expect(screen.getByText('Machine Learning in Practice: A Comprehensive Guide')).toBeInTheDocument();
    });

    // Select directory
    const settingsButton = screen.getByText('⚙️');
    fireEvent.click(settingsButton);

    const chooseDirectoryButton = screen.getByText('Choose Directory');
    fireEvent.click(chooseDirectoryButton);

    await waitFor(() => {
      expect(screen.getByText('Selected: Downloads')).toBeInTheDocument();
    });

    const closeButton = screen.getByText('✕');
    fireEvent.click(closeButton);

    // Download first paper
    const downloadButtons = screen.getAllByText('Download PDF');
    fireEvent.click(downloadButtons[0]);

    const directoryDownloadButton1 = screen.getByText('To Selected Directory');
    fireEvent.click(directoryDownloadButton1);

    await waitFor(() => {
      expect(mockDirectoryHandle.getFileHandle).toHaveBeenCalledWith(
        'machine-learning-in-practice-a-comprehensive-guide.pdf',
        { create: true }
      );
    });

    // Download second paper
    fireEvent.click(downloadButtons[1]);

    const directoryDownloadButton2 = screen.getByText('To Selected Directory');
    fireEvent.click(directoryDownloadButton2);

    await waitFor(() => {
      expect(mockDirectoryHandle.getFileHandle).toHaveBeenCalledWith(
        'deep-learning-for-computer-vision.pdf',
        { create: true }
      );
    });

    // Verify both downloads completed
    expect(mockWritableStream.write).toHaveBeenCalledTimes(2);
    expect(mockWritableStream.close).toHaveBeenCalledTimes(2);
  });

  test('handles network errors gracefully during download', async () => {
    // Mock search response
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockSearchResponse)
    });

    // Mock PDF download failure
    global.fetch.mockRejectedValueOnce(new Error('Network error'));

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(<App />);

    // Search for papers
    const searchInput = screen.getByPlaceholderText('Search for papers...');
    fireEvent.change(searchInput, { target: { value: 'machine learning' } });

    const searchButton = screen.getByText('Search');
    fireEvent.click(searchButton);

    await waitFor(() => {
      expect(screen.getByText('Machine Learning in Practice: A Comprehensive Guide')).toBeInTheDocument();
    });

    // Try to download
    const downloadButton = screen.getByText('Download PDF');
    fireEvent.click(downloadButton);

    const browserDownloadButton = screen.getByText('Browser Download');
    fireEvent.click(browserDownloadButton);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Download failed:', expect.any(Error));
    });

    consoleSpy.mockRestore();
  });

  test('handles File System Access API permission errors', async () => {
    // Mock search response
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockSearchResponse)
    });

    // Mock PDF download
    const mockPdfBlob = new Blob(['PDF content'], { type: 'application/pdf' });
    global.fetch.mockResolvedValueOnce({
      ok: true,
      blob: () => Promise.resolve(mockPdfBlob)
    });

    // Mock directory selection
    window.showDirectoryPicker.mockResolvedValueOnce(mockDirectoryHandle);

    // Mock permission error during file write
    mockDirectoryHandle.getFileHandle.mockRejectedValueOnce(new Error('Permission denied'));

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(<App />);

    // Search and select directory
    const searchInput = screen.getByPlaceholderText('Search for papers...');
    fireEvent.change(searchInput, { target: { value: 'machine learning' } });

    const searchButton = screen.getByText('Search');
    fireEvent.click(searchButton);

    await waitFor(() => {
      expect(screen.getByText('Machine Learning in Practice: A Comprehensive Guide')).toBeInTheDocument();
    });

    // Select directory
    const settingsButton = screen.getByText('⚙️');
    fireEvent.click(settingsButton);

    const chooseDirectoryButton = screen.getByText('Choose Directory');
    fireEvent.click(chooseDirectoryButton);

    await waitFor(() => {
      expect(screen.getByText('Selected: Downloads')).toBeInTheDocument();
    });

    const closeButton = screen.getByText('✕');
    fireEvent.click(closeButton);

    // Try to download
    const downloadButton = screen.getByText('Download PDF');
    fireEvent.click(downloadButton);

    const directoryDownloadButton = screen.getByText('To Selected Directory');
    fireEvent.click(directoryDownloadButton);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Directory download failed:', expect.any(Error));
    });

    consoleSpy.mockRestore();
  });

  test('preserves directory selection across app usage', async () => {
    // Mock directory selection
    window.showDirectoryPicker.mockResolvedValueOnce(mockDirectoryHandle);

    render(<App />);

    // Select directory
    const settingsButton = screen.getByText('⚙️');
    fireEvent.click(settingsButton);

    const chooseDirectoryButton = screen.getByText('Choose Directory');
    fireEvent.click(chooseDirectoryButton);

    await waitFor(() => {
      expect(screen.getByText('Selected: Downloads')).toBeInTheDocument();
    });

    // Close settings
    const closeButton = screen.getByText('✕');
    fireEvent.click(closeButton);

    // Reopen settings - directory should still be selected
    fireEvent.click(settingsButton);

    expect(screen.getByText('Selected: Downloads')).toBeInTheDocument();
  });
}); 