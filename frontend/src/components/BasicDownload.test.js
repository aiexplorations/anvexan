import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import PaperCard from './PaperCard';

// Mock the File System Access API
const mockWritableStream = {
  write: jest.fn(),
  close: jest.fn(),
};

const mockFileHandle = {
  createWritable: jest.fn().mockResolvedValue(mockWritableStream),
};

const mockDirectoryHandle = {
  name: 'TestDirectory',
  getFileHandle: jest.fn().mockResolvedValue(mockFileHandle),
};

// Mock global APIs
global.fetch = jest.fn();
global.URL = {
  createObjectURL: jest.fn(() => 'blob:test-url'),
  revokeObjectURL: jest.fn(),
};

const mockPaper = {
  title: 'Test Paper: Machine Learning',
  summary: 'This is a test paper.',
  link: 'https://arxiv.org/abs/1234.5678',
  pdf_link: 'https://arxiv.org/pdf/1234.5678.pdf',
  clean_title: 'test-paper-machine-learning'
};

describe('Basic Download Functionality', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch.mockClear();
    global.URL.createObjectURL.mockClear();
    global.URL.revokeObjectURL.mockClear();
    mockWritableStream.write.mockClear();
    mockWritableStream.close.mockClear();
    mockFileHandle.createWritable.mockClear();
    mockDirectoryHandle.getFileHandle.mockClear();
  });

  test('renders paper card with download button', () => {
    render(<PaperCard paper={mockPaper} />);
    
    expect(screen.getByText('Test Paper: Machine Learning')).toBeInTheDocument();
    expect(screen.getByText('Download PDF')).toBeInTheDocument();
  });

  test('PROOF: Directory-based download works end-to-end', async () => {
    // Mock successful PDF fetch
    const mockPdfBlob = new Blob(['PDF content'], { type: 'application/pdf' });
    global.fetch.mockResolvedValueOnce({
      ok: true,
      blob: () => Promise.resolve(mockPdfBlob)
    });

    render(<PaperCard paper={mockPaper} directoryHandle={mockDirectoryHandle} />);
    
    // Click download button
    const downloadButton = screen.getByText('Download PDF');
    fireEvent.click(downloadButton);
    
    // Modal should appear
    expect(screen.getByText('Download Options')).toBeInTheDocument();
    expect(screen.getByText('To Selected Directory')).toBeInTheDocument();
    
    // Click directory download
    const directoryDownloadButton = screen.getByText('To Selected Directory');
    fireEvent.click(directoryDownloadButton);

    // PROOF: Verify complete download chain
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('https://arxiv.org/pdf/1234.5678.pdf');
    });

    await waitFor(() => {
      expect(mockDirectoryHandle.getFileHandle).toHaveBeenCalledWith(
        'test-paper-machine-learning.pdf',
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

  test('PROOF: Blob download fallback works', async () => {
    // Mock successful PDF fetch
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

    render(<PaperCard paper={mockPaper} />);
    
    // Click download button
    const downloadButton = screen.getByText('Download PDF');
    fireEvent.click(downloadButton);
    
    // Click browser download
    const browserDownloadButton = screen.getByText('Browser Download');
    fireEvent.click(browserDownloadButton);

    // PROOF: Verify blob download chain
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

  test('PROOF: Multiple download methods available', () => {
    render(<PaperCard paper={mockPaper} directoryHandle={mockDirectoryHandle} />);
    
    // Click download button
    const downloadButton = screen.getByText('Download PDF');
    fireEvent.click(downloadButton);
    
    // All download methods should be available
    expect(screen.getByText('To Selected Directory')).toBeInTheDocument();
    expect(screen.getByText('Browser Download')).toBeInTheDocument();
    expect(screen.getByText('Direct Link')).toBeInTheDocument();
    expect(screen.getByText('Open in New Window')).toBeInTheDocument();
  });

  test('PROOF: Error handling works', async () => {
    // Mock fetch failure
    global.fetch.mockRejectedValueOnce(new Error('Network error'));

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(<PaperCard paper={mockPaper} />);
    
    const downloadButton = screen.getByText('Download PDF');
    fireEvent.click(downloadButton);
    
    const browserDownloadButton = screen.getByText('Browser Download');
    fireEvent.click(browserDownloadButton);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Download failed:', expect.any(Error));
    });

    consoleSpy.mockRestore();
  });
}); 