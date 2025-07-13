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

const mockPaper = {
  title: 'Test Paper: Machine Learning in Practice',
  summary: 'This is a test paper about machine learning.',
  link: 'https://arxiv.org/abs/1234.5678',
  pdf_link: 'https://arxiv.org/pdf/1234.5678.pdf',
  clean_title: 'test-paper-machine-learning-in-practice'
};

describe('PaperCard Download Functionality', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch.mockClear();
    global.URL.createObjectURL.mockClear();
    global.URL.revokeObjectURL.mockClear();
  });

  test('renders paper information correctly', () => {
    render(<PaperCard paper={mockPaper} />);
    
    expect(screen.getByText('Test Paper: Machine Learning in Practice')).toBeInTheDocument();
    expect(screen.getByText(/This is a test paper about machine learning/)).toBeInTheDocument();
    expect(screen.getByText('Download PDF')).toBeInTheDocument();
  });

  test('handles directory-based download when directory is selected', async () => {
    const mockBlob = new Blob(['test pdf content'], { type: 'application/pdf' });
    global.fetch.mockResolvedValueOnce({
      ok: true,
      blob: () => Promise.resolve(mockBlob)
    });

    render(<PaperCard paper={mockPaper} directoryHandle={mockDirectoryHandle} />);
    
    fireEvent.click(screen.getByText('Download PDF'));
    fireEvent.click(screen.getByText('To Selected Directory'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('https://arxiv.org/pdf/1234.5678.pdf');
    });

    await waitFor(() => {
      expect(mockDirectoryHandle.getFileHandle).toHaveBeenCalledWith(
        'test-paper-machine-learning-in-practice.pdf',
        { create: true }
      );
    });

    await waitFor(() => {
      expect(mockFileHandle.createWritable).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(mockWritableStream.write).toHaveBeenCalledWith(mockBlob);
    });

    await waitFor(() => {
      expect(mockWritableStream.close).toHaveBeenCalled();
    });
  });

  test('handles blob download fallback when no directory selected', async () => {
    const mockBlob = new Blob(['test pdf content'], { type: 'application/pdf' });
    global.fetch.mockResolvedValueOnce({
      ok: true,
      blob: () => Promise.resolve(mockBlob)
    });

    // Mock document.createElement and click
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
    
    fireEvent.click(screen.getByText('Download PDF'));
    fireEvent.click(screen.getByText('Browser Download'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('https://arxiv.org/pdf/1234.5678.pdf');
    });

    await waitFor(() => {
      expect(global.URL.createObjectURL).toHaveBeenCalledWith(mockBlob);
    });

    await waitFor(() => {
      expect(mockAnchor.click).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('blob:test-url');
    });
  });

  test('handles download errors gracefully', async () => {
    global.fetch.mockRejectedValueOnce(new Error('Network error'));

    // Mock console.error to avoid test output noise
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(<PaperCard paper={mockPaper} />);
    
    fireEvent.click(screen.getByText('Download PDF'));
    fireEvent.click(screen.getByText('Browser Download'));

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Download failed:', expect.any(Error));
    });

    consoleSpy.mockRestore();
  });

  test('opens paper in new tab when "View on ArXiv" is clicked', () => {
    const mockOpen = jest.fn();
    global.open = mockOpen;

    render(<PaperCard paper={mockPaper} />);
    
    fireEvent.click(screen.getByText('View on ArXiv'));

    expect(mockOpen).toHaveBeenCalledWith('https://arxiv.org/abs/1234.5678', '_blank');
  });

  test('opens PDF in new tab when "View PDF" is clicked', () => {
    const mockOpen = jest.fn();
    global.open = mockOpen;

    render(<PaperCard paper={mockPaper} />);
    
    fireEvent.click(screen.getByText('View PDF'));

    expect(mockOpen).toHaveBeenCalledWith('https://arxiv.org/pdf/1234.5678.pdf', '_blank');
  });

  test('shows download modal when Download PDF is clicked', () => {
    render(<PaperCard paper={mockPaper} />);
    
    fireEvent.click(screen.getByText('Download PDF'));

    expect(screen.getByText('Download Options')).toBeInTheDocument();
    expect(screen.getByText('Browser Download')).toBeInTheDocument();
    expect(screen.getByText('Direct Link')).toBeInTheDocument();
    expect(screen.getByText('Open in New Window')).toBeInTheDocument();
  });

  test('shows directory option when directory is selected', () => {
    render(<PaperCard paper={mockPaper} directoryHandle={mockDirectoryHandle} />);
    
    fireEvent.click(screen.getByText('Download PDF'));

    expect(screen.getByText('To Selected Directory')).toBeInTheDocument();
  });

  test('closes download modal when Cancel is clicked', () => {
    render(<PaperCard paper={mockPaper} />);
    
    fireEvent.click(screen.getByText('Download PDF'));
    expect(screen.getByText('Download Options')).toBeInTheDocument();
    
    fireEvent.click(screen.getByText('Cancel'));
    expect(screen.queryByText('Download Options')).not.toBeInTheDocument();
  });

  test('handles direct link download method', () => {
    const mockOpen = jest.fn();
    global.open = mockOpen;

    render(<PaperCard paper={mockPaper} />);
    
    fireEvent.click(screen.getByText('Download PDF'));
    fireEvent.click(screen.getByText('Direct Link'));

    expect(mockOpen).toHaveBeenCalledWith('https://arxiv.org/pdf/1234.5678.pdf', '_blank');
  });

  test('handles new window download method', () => {
    const mockOpen = jest.fn();
    global.open = mockOpen;

    render(<PaperCard paper={mockPaper} />);
    
    fireEvent.click(screen.getByText('Download PDF'));
    fireEvent.click(screen.getByText('Open in New Window'));

    expect(mockOpen).toHaveBeenCalledWith('https://arxiv.org/pdf/1234.5678.pdf', '_blank');
  });

  test('handles File System Access API permission errors', async () => {
    const mockError = new Error('Permission denied');
    mockDirectoryHandle.getFileHandle.mockRejectedValueOnce(mockError);

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(<PaperCard paper={mockPaper} directoryHandle={mockDirectoryHandle} />);
    
    fireEvent.click(screen.getByText('Download PDF'));
    fireEvent.click(screen.getByText('To Selected Directory'));

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Directory download failed:', mockError);
    });

    consoleSpy.mockRestore();
  });

  test('creates correct filename from paper title', () => {
    const paperWithSpecialChars = {
      ...mockPaper,
      title: 'Special Characters: Title/With\\Slashes & Symbols!',
      clean_title: 'special-characters-title-with-slashes-symbols'
    };

    render(<PaperCard paper={paperWithSpecialChars} directoryHandle={mockDirectoryHandle} />);
    
    fireEvent.click(screen.getByText('Download PDF'));
    fireEvent.click(screen.getByText('To Selected Directory'));

    expect(mockDirectoryHandle.getFileHandle).toHaveBeenCalledWith(
      'special-characters-title-with-slashes-symbols.pdf',
      { create: true }
    );
  });
}); 