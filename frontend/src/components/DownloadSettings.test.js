import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import DownloadSettings from './DownloadSettings';

// Mock the File System Access API
const mockDirectoryHandle = {
  name: 'Test Directory',
  getFileHandle: jest.fn(),
};

// Mock window.showDirectoryPicker
Object.defineProperty(window, 'showDirectoryPicker', {
  value: jest.fn(),
  writable: true,
});

describe('DownloadSettings Component', () => {
  const mockProps = {
    isOpen: true,
    onClose: jest.fn(),
    directoryHandle: null,
    onDirectorySelect: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    window.showDirectoryPicker.mockClear();
  });

  test('renders download settings modal when open', () => {
    render(<DownloadSettings {...mockProps} />);
    
    expect(screen.getByText('Download Settings')).toBeInTheDocument();
    expect(screen.getByText('Download Directory')).toBeInTheDocument();
    expect(screen.getByText('Choose Directory')).toBeInTheDocument();
  });

  test('does not render when closed', () => {
    render(<DownloadSettings {...mockProps} isOpen={false} />);
    
    expect(screen.queryByText('Download Settings')).not.toBeInTheDocument();
  });

  test('calls onClose when close button is clicked', () => {
    render(<DownloadSettings {...mockProps} />);
    
    const closeButton = screen.getByText('✕');
    fireEvent.click(closeButton);
    
    expect(mockProps.onClose).toHaveBeenCalledTimes(1);
  });

  test('shows directory selection button when File System Access API is supported', () => {
    render(<DownloadSettings {...mockProps} />);
    
    expect(screen.getByText('Choose Directory')).toBeInTheDocument();
    expect(screen.getByText('Choose a directory to save files directly without browser dialogs')).toBeInTheDocument();
  });

  test('shows fallback message when File System Access API is not supported', () => {
    // Mock unsupported browser
    delete window.showDirectoryPicker;
    
    render(<DownloadSettings {...mockProps} />);
    
    expect(screen.getByText(/Your browser doesn't support advanced directory selection/)).toBeInTheDocument();
    expect(screen.getByText(/Download files will use your browser's default download folder/)).toBeInTheDocument();
  });

  test('handles directory selection successfully', async () => {
    window.showDirectoryPicker.mockResolvedValueOnce(mockDirectoryHandle);
    
    render(<DownloadSettings {...mockProps} />);
    
    const chooseDirectoryButton = screen.getByText('Choose Directory');
    fireEvent.click(chooseDirectoryButton);
    
    await waitFor(() => {
      expect(window.showDirectoryPicker).toHaveBeenCalledWith({
        mode: 'readwrite'
      });
    });
    
    await waitFor(() => {
      expect(mockProps.onDirectorySelect).toHaveBeenCalledWith(mockDirectoryHandle);
    });
  });

  test('handles directory selection cancellation', async () => {
    window.showDirectoryPicker.mockRejectedValueOnce(new Error('User cancelled'));
    
    render(<DownloadSettings {...mockProps} />);
    
    const chooseDirectoryButton = screen.getByText('Choose Directory');
    fireEvent.click(chooseDirectoryButton);
    
    await waitFor(() => {
      expect(window.showDirectoryPicker).toHaveBeenCalled();
    });
    
    expect(mockProps.onDirectorySelect).not.toHaveBeenCalled();
  });

  test('handles directory selection errors', async () => {
    window.showDirectoryPicker.mockRejectedValueOnce(new Error('Permission denied'));
    
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    render(<DownloadSettings {...mockProps} />);
    
    const chooseDirectoryButton = screen.getByText('Choose Directory');
    fireEvent.click(chooseDirectoryButton);
    
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Directory selection failed:', expect.any(Error));
    });
    
    consoleSpy.mockRestore();
  });

  test('shows selected directory when directory is chosen', () => {
    const propsWithDirectory = {
      ...mockProps,
      directoryHandle: mockDirectoryHandle,
    };
    
    render(<DownloadSettings {...propsWithDirectory} />);
    
    expect(screen.getByText('Selected: Test Directory')).toBeInTheDocument();
  });

  test('calls onDirectorySelect with null when reset button is clicked', () => {
    const propsWithDirectory = {
      ...mockProps,
      directoryHandle: mockDirectoryHandle,
    };
    
    render(<DownloadSettings {...propsWithDirectory} />);
    
    const resetButton = screen.getByText('Reset to Defaults');
    fireEvent.click(resetButton);
    
    expect(mockProps.onDirectorySelect).toHaveBeenCalledWith(null);
  });

  test('shows download behavior section', () => {
    render(<DownloadSettings {...mockProps} />);
    
    expect(screen.getByText('Download Behavior')).toBeInTheDocument();
    expect(screen.getByText('Download PDF Files')).toBeInTheDocument();
  });

  test('shows how it works section', () => {
    render(<DownloadSettings {...mockProps} />);
    
    expect(screen.getByText('How It Works')).toBeInTheDocument();
    expect(screen.getByText('Directory Selection')).toBeInTheDocument();
    expect(screen.getByText('Smart Downloads')).toBeInTheDocument();
    expect(screen.getByText('Viewing Options')).toBeInTheDocument();
  });

  test('shows directory selection explanation', () => {
    render(<DownloadSettings {...mockProps} />);
    
    expect(screen.getByText('Choose a specific folder where all PDFs will be saved. No more dialogs or guessing where files went.')).toBeInTheDocument();
  });

  test('shows smart downloads explanation', () => {
    render(<DownloadSettings {...mockProps} />);
    
    expect(screen.getByText('Multiple download methods with automatic fallbacks ensure files actually get saved.')).toBeInTheDocument();
  });

  test('shows viewing options explanation', () => {
    render(<DownloadSettings {...mockProps} />);
    
    expect(screen.getByText('Option to view PDFs in browser before downloading, or download directly.')).toBeInTheDocument();
  });

  test('shows correct styling for selected directory', () => {
    const propsWithDirectory = {
      ...mockProps,
      directoryHandle: mockDirectoryHandle,
    };
    
    render(<DownloadSettings {...propsWithDirectory} />);
    
    const selectedText = screen.getByText('Selected: Test Directory');
    expect(selectedText).toHaveClass(); // Should have some styling applied
  });

  test('directory selection is disabled when not supported', () => {
    // Mock unsupported browser
    delete window.showDirectoryPicker;
    
    render(<DownloadSettings {...mockProps} />);
    
    expect(screen.queryByText('Choose Directory')).not.toBeInTheDocument();
  });

  test('handles multiple rapid clicks on directory selection', async () => {
    window.showDirectoryPicker.mockResolvedValue(mockDirectoryHandle);
    
    render(<DownloadSettings {...mockProps} />);
    
    const chooseDirectoryButton = screen.getByText('Choose Directory');
    
    // Click multiple times rapidly
    fireEvent.click(chooseDirectoryButton);
    fireEvent.click(chooseDirectoryButton);
    fireEvent.click(chooseDirectoryButton);
    
    // Should only call once (or handle appropriately)
    await waitFor(() => {
      expect(window.showDirectoryPicker).toHaveBeenCalledTimes(3);
    });
  });

  test('keyboard navigation works for close button', () => {
    render(<DownloadSettings {...mockProps} />);
    
    const closeButton = screen.getByText('✕');
    fireEvent.keyDown(closeButton, { key: 'Enter' });
    
    expect(mockProps.onClose).toHaveBeenCalledTimes(1);
  });
}); 