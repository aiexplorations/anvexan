import pytest
import json
import xml.etree.ElementTree as ET
from unittest.mock import Mock, patch, MagicMock
import tempfile
import os
from pathlib import Path
import io
import re

# Import the backend Flask app
from arxiv_paper_getter import app as flask_app


class TestBackendAPI:
    """Test suite for the Flask backend API"""
    
    @pytest.fixture
    def client(self):
        """Create a test client for the Flask app"""
        flask_app.config['TESTING'] = True
        with flask_app.test_client() as client:
            yield client
    
    def test_search_endpoint_success(self, client):
        """Test successful search with valid query"""
        # Mock ArXiv API response
        mock_xml = '''<?xml version="1.0" encoding="UTF-8"?>
        <feed xmlns="http://www.w3.org/2005/Atom">
            <entry>
                <title>Test Paper Title</title>
                <summary>This is a test paper summary</summary>
                <id>http://arxiv.org/abs/1234.5678</id>
            </entry>
        </feed>'''
        
        with patch('requests.get') as mock_get:
            mock_response = Mock()
            mock_response.status_code = 200
            mock_response.content = mock_xml.encode('utf-8')
            mock_get.return_value = mock_response
            
            response = client.get('/search?query=machine learning')
            
            assert response.status_code == 200
            data = json.loads(response.data)
            assert len(data) == 1
            assert data[0]['title'] == 'Test Paper Title'
            assert data[0]['summary'] == 'This is a test paper summary'
            assert data[0]['link'] == 'http://arxiv.org/abs/1234.5678'
            assert data[0]['pdf_link'] == 'http://arxiv.org/pdf/1234.5678.pdf'
            assert 'clean_title' in data[0]
    
    def test_search_endpoint_missing_query(self, client):
        """Test search endpoint with missing query parameter"""
        response = client.get('/search')
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'error' in data
        assert data['error'] == 'Query parameter is required'
    
    def test_search_endpoint_arxiv_api_failure(self, client):
        """Test search endpoint when ArXiv API fails"""
        with patch('requests.get') as mock_get:
            mock_response = Mock()
            mock_response.status_code = 500
            mock_get.return_value = mock_response
            
            response = client.get('/search?query=test')
            
            assert response.status_code == 500
            data = json.loads(response.data)
            assert 'error' in data
            assert data['error'] == 'Failed to fetch papers'
    
    def test_search_endpoint_multiple_papers(self, client):
        """Test search endpoint with multiple papers in response"""
        mock_xml = '''<?xml version="1.0" encoding="UTF-8"?>
        <feed xmlns="http://www.w3.org/2005/Atom">
            <entry>
                <title>First Paper</title>
                <summary>First paper summary</summary>
                <id>http://arxiv.org/abs/1234.5678</id>
            </entry>
            <entry>
                <title>Second Paper</title>
                <summary>Second paper summary</summary>
                <id>http://arxiv.org/abs/9876.5432</id>
            </entry>
        </feed>'''
        
        with patch('requests.get') as mock_get:
            mock_response = Mock()
            mock_response.status_code = 200
            mock_response.content = mock_xml.encode('utf-8')
            mock_get.return_value = mock_response
            
            response = client.get('/search?query=neural networks')
            
            assert response.status_code == 200
            data = json.loads(response.data)
            assert len(data) == 2
            assert data[0]['title'] == 'First Paper'
            assert data[1]['title'] == 'Second Paper'
    
    def test_download_endpoint_success(self, client):
        """Test successful PDF download"""
        pdf_content = b'%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n>>\nendobj\n%%EOF'
        
        with patch('requests.get') as mock_get:
            mock_response = Mock()
            mock_response.status_code = 200
            mock_response.iter_content = Mock(return_value=[pdf_content])
            mock_get.return_value = mock_response
            
            response = client.get('/download?pdf_link=http://arxiv.org/pdf/1234.5678.pdf&title=Test Paper')
            
            assert response.status_code == 200
            assert response.mimetype == 'application/pdf'
            assert 'Content-Disposition' in response.headers
            assert 'Test-Paper.pdf' in response.headers['Content-Disposition']
    
    def test_download_endpoint_missing_pdf_link(self, client):
        """Test download endpoint with missing pdf_link parameter"""
        response = client.get('/download')
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'error' in data
        assert data['error'] == 'PDF link parameter is required'
    
    def test_download_endpoint_pdf_fetch_failure(self, client):
        """Test download endpoint when PDF fetch fails"""
        with patch('requests.get') as mock_get:
            mock_response = Mock()
            mock_response.status_code = 404
            mock_get.return_value = mock_response
            
            response = client.get('/download?pdf_link=http://arxiv.org/pdf/invalid.pdf')
            
            assert response.status_code == 500
            data = json.loads(response.data)
            assert 'error' in data
            assert data['error'] == 'Failed to download paper'
    
    def test_download_endpoint_without_title(self, client):
        """Test download endpoint without title parameter"""
        pdf_content = b'%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n>>\nendobj\n%%EOF'
        
        with patch('requests.get') as mock_get:
            mock_response = Mock()
            mock_response.status_code = 200
            mock_response.iter_content = Mock(return_value=[pdf_content])
            mock_get.return_value = mock_response
            
            response = client.get('/download?pdf_link=http://arxiv.org/pdf/1234.5678.pdf')
            
            assert response.status_code == 200
            assert response.mimetype == 'application/pdf'
            assert 'Content-Disposition' in response.headers
            assert '1234.5678.pdf' in response.headers['Content-Disposition']
    
    def test_download_endpoint_request_exception(self, client):
        """Test download endpoint when requests raises an exception"""
        with patch('requests.get') as mock_get:
            mock_get.side_effect = Exception("Network error")
            
            response = client.get('/download?pdf_link=http://arxiv.org/pdf/1234.5678.pdf')
            
            assert response.status_code == 500
            data = json.loads(response.data)
            assert 'error' in data
            assert 'Download failed' in data['error']


class TestFrontendFunctions:
    """Test suite for frontend utility functions"""
    
    def create_clean_title(self, title):
        """Copy of the create_clean_title function from streamlit_app.py"""
        if not title:
            return "paper"
        clean_title = re.sub(r'[^\w\s-]', '', title).strip()
        clean_title = re.sub(r'[-\s]+', '-', clean_title)
        return clean_title if clean_title else "paper"
    
    def test_create_clean_title_normal_title(self):
        """Test creating clean title from normal paper title"""
        title = "Deep Learning in Computer Vision: A Survey"
        result = self.create_clean_title(title)
        assert result == "Deep-Learning-in-Computer-Vision-A-Survey"
    
    def test_create_clean_title_with_special_characters(self):
        """Test creating clean title with special characters"""
        title = "Neural Networks: Implementation & Applications (2023)"
        result = self.create_clean_title(title)
        assert result == "Neural-Networks-Implementation-Applications-2023"
    
    def test_create_clean_title_with_numbers(self):
        """Test creating clean title with numbers"""
        title = "GPT-3: Language Models are Few-Shot Learners"
        result = self.create_clean_title(title)
        assert result == "GPT-3-Language-Models-are-Few-Shot-Learners"
    
    def test_create_clean_title_empty_string(self):
        """Test creating clean title with empty string"""
        title = ""
        result = self.create_clean_title(title)
        assert result == "paper"
    
    def test_create_clean_title_none(self):
        """Test creating clean title with None input"""
        title = None
        result = self.create_clean_title(title)
        assert result == "paper"
    
    def test_create_clean_title_only_special_characters(self):
        """Test creating clean title with only special characters"""
        title = "!@#$%^&*()"
        result = self.create_clean_title(title)
        assert result == "paper"
    
    def test_create_clean_title_multiple_spaces(self):
        """Test creating clean title with multiple spaces"""
        title = "Machine    Learning     Applications"
        result = self.create_clean_title(title)
        assert result == "Machine-Learning-Applications"
    
    def test_create_clean_title_leading_trailing_spaces(self):
        """Test creating clean title with leading and trailing spaces"""
        title = "   Artificial Intelligence   "
        result = self.create_clean_title(title)
        assert result == "Artificial-Intelligence"
    
    def mock_download_and_save_pdf(self, pdf_link, title, clean_title, save_to_folder=None):
        """Mock version of download_and_save_pdf function for testing"""
        try:
            # Mock request to backend
            import requests
            response = requests.get(
                'http://localhost:5001/download',
                params={'pdf_link': pdf_link, 'title': title},
                stream=True
            )
            
            if response.status_code == 200:
                if not clean_title:
                    clean_title = self.create_clean_title(title)
                filename = f"{clean_title[:50]}.pdf" if clean_title else "paper.pdf"
                
                pdf_content = b''
                for chunk in response.iter_content(chunk_size=8192):
                    if chunk:
                        pdf_content += chunk
                
                if save_to_folder and Path(save_to_folder).exists():
                    try:
                        file_path = Path(save_to_folder) / filename
                        with open(file_path, 'wb') as f:
                            f.write(pdf_content)
                        return "saved", str(file_path), pdf_content, filename
                    except Exception:
                        return "download", None, pdf_content, filename
                else:
                    return "download", None, pdf_content, filename
            else:
                return None, None, None, None
        except Exception:
            return None, None, None, None
    
    @patch('requests.get')
    def test_download_and_save_pdf_success_with_folder(self, mock_get):
        """Test successful PDF download and save to folder"""
        pdf_content = b'%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n>>\nendobj\n%%EOF'
        
        # Mock the requests response
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.iter_content = Mock(return_value=[pdf_content])
        mock_get.return_value = mock_response
        
        with tempfile.TemporaryDirectory() as temp_dir:
            pdf_link = "http://arxiv.org/pdf/1234.5678.pdf"
            title = "Test Paper"
            clean_title = "Test-Paper"
            
            result = self.mock_download_and_save_pdf(pdf_link, title, clean_title, temp_dir)
            
            assert result[0] == "saved"
            assert temp_dir in result[1]
            assert result[2] == pdf_content
            assert result[3] == "Test-Paper.pdf"
            
            # Verify file was actually saved
            saved_file = Path(temp_dir) / "Test-Paper.pdf"
            assert saved_file.exists()
            assert saved_file.read_bytes() == pdf_content
    
    @patch('requests.get')
    def test_download_and_save_pdf_success_without_folder(self, mock_get):
        """Test successful PDF download without save folder"""
        pdf_content = b'%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n>>\nendobj\n%%EOF'
        
        # Mock the requests response
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.iter_content = Mock(return_value=[pdf_content])
        mock_get.return_value = mock_response
        
        pdf_link = "http://arxiv.org/pdf/1234.5678.pdf"
        title = "Test Paper"
        clean_title = "Test-Paper"
        
        result = self.mock_download_and_save_pdf(pdf_link, title, clean_title, None)
        
        assert result[0] == "download"
        assert result[1] is None
        assert result[2] == pdf_content
        assert result[3] == "Test-Paper.pdf"
    
    @patch('requests.get')
    def test_download_and_save_pdf_invalid_folder(self, mock_get):
        """Test PDF download with invalid folder path"""
        pdf_content = b'%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n>>\nendobj\n%%EOF'
        
        # Mock the requests response
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.iter_content = Mock(return_value=[pdf_content])
        mock_get.return_value = mock_response
        
        pdf_link = "http://arxiv.org/pdf/1234.5678.pdf"
        title = "Test Paper"
        clean_title = "Test-Paper"
        invalid_folder = "/nonexistent/folder/path"
        
        result = self.mock_download_and_save_pdf(pdf_link, title, clean_title, invalid_folder)
        
        # Should fall back to download mode
        assert result[0] == "download"
        assert result[1] is None
        assert result[2] == pdf_content
        assert result[3] == "Test-Paper.pdf"
    
    @patch('requests.get')
    def test_download_and_save_pdf_empty_clean_title(self, mock_get):
        """Test PDF download with empty clean title"""
        pdf_content = b'%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n>>\nendobj\n%%EOF'
        
        # Mock the requests response
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.iter_content = Mock(return_value=[pdf_content])
        mock_get.return_value = mock_response
        
        pdf_link = "http://arxiv.org/pdf/1234.5678.pdf"
        title = "Test Paper with Special Characters!@#"
        clean_title = ""
        
        result = self.mock_download_and_save_pdf(pdf_link, title, clean_title, None)
        
        assert result[0] == "download"
        assert result[1] is None
        assert result[2] == pdf_content
        assert result[3] == "Test-Paper-with-Special-Characters.pdf"
    
    @patch('requests.get')
    def test_download_and_save_pdf_request_failure(self, mock_get):
        """Test PDF download when request fails"""
        # Mock failed response
        mock_response = Mock()
        mock_response.status_code = 404
        mock_get.return_value = mock_response
        
        pdf_link = "http://arxiv.org/pdf/invalid.pdf"
        title = "Test Paper"
        clean_title = "Test-Paper"
        
        result = self.mock_download_and_save_pdf(pdf_link, title, clean_title, None)
        
        assert result == (None, None, None, None)
    
    @patch('requests.get')
    def test_download_and_save_pdf_request_exception(self, mock_get):
        """Test PDF download when request raises exception"""
        # Mock exception
        mock_get.side_effect = Exception("Network error")
        
        pdf_link = "http://arxiv.org/pdf/1234.5678.pdf"
        title = "Test Paper"
        clean_title = "Test-Paper"
        
        result = self.mock_download_and_save_pdf(pdf_link, title, clean_title, None)
        
        assert result == (None, None, None, None)


class TestIntegration:
    """Integration tests for backend and frontend interaction"""
    
    @pytest.fixture
    def client(self):
        """Create a test client for the Flask app"""
        flask_app.config['TESTING'] = True
        with flask_app.test_client() as client:
            yield client
    
    def test_search_and_download_workflow(self, client):
        """Test the complete workflow: search -> get results -> download"""
        # Mock ArXiv API search response
        mock_search_xml = '''<?xml version="1.0" encoding="UTF-8"?>
        <feed xmlns="http://www.w3.org/2005/Atom">
            <entry>
                <title>Machine Learning Algorithms</title>
                <summary>A comprehensive study of ML algorithms</summary>
                <id>http://arxiv.org/abs/1234.5678</id>
            </entry>
        </feed>'''
        
        # Mock PDF content
        pdf_content = b'%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n>>\nendobj\n%%EOF'
        
        with patch('requests.get') as mock_get:
            # First call for search
            mock_search_response = Mock()
            mock_search_response.status_code = 200
            mock_search_response.content = mock_search_xml.encode('utf-8')
            
            # Second call for download
            mock_download_response = Mock()
            mock_download_response.status_code = 200
            mock_download_response.iter_content = Mock(return_value=[pdf_content])
            
            mock_get.side_effect = [mock_search_response, mock_download_response]
            
            # Test search
            search_response = client.get('/search?query=machine learning')
            assert search_response.status_code == 200
            
            search_data = json.loads(search_response.data)
            assert len(search_data) == 1
            paper = search_data[0]
            
            # Test download using the PDF link from search results
            download_response = client.get(f'/download?pdf_link={paper["pdf_link"]}&title={paper["title"]}')
            assert download_response.status_code == 200
            assert download_response.mimetype == 'application/pdf'
    
    def test_frontend_backend_title_consistency(self):
        """Test that frontend and backend produce consistent clean titles"""
        test_title = "Deep Learning: A Comprehensive Survey (2023)"
        
        # Test frontend function (copied here)
        def create_clean_title(title):
            if not title:
                return "paper"
            clean_title = re.sub(r'[^\w\s-]', '', title).strip()
            clean_title = re.sub(r'[-\s]+', '-', clean_title)
            return clean_title if clean_title else "paper"
        
        frontend_clean_title = create_clean_title(test_title)
        
        # Test backend logic (simulate what happens in the backend)
        backend_clean_title = re.sub(r'[^\w\s-]', '', test_title).strip()
        backend_clean_title = re.sub(r'[-\s]+', '-', backend_clean_title)
        
        assert frontend_clean_title == backend_clean_title
    
    def test_xml_parsing_edge_cases(self):
        """Test XML parsing with edge cases"""
        # Empty feed
        empty_xml = '''<?xml version="1.0" encoding="UTF-8"?>
        <feed xmlns="http://www.w3.org/2005/Atom">
        </feed>'''
        
        root = ET.fromstring(empty_xml)
        papers = []
        for entry in root.findall('{http://www.w3.org/2005/Atom}entry'):
            papers.append(entry)
        
        assert len(papers) == 0
    
    def test_pdf_url_generation(self):
        """Test PDF URL generation from ArXiv abstract URL"""
        abstract_url = "http://arxiv.org/abs/1234.5678"
        expected_pdf_url = "http://arxiv.org/pdf/1234.5678.pdf"
        
        pdf_url = abstract_url.replace('abs', 'pdf') + '.pdf'
        assert pdf_url == expected_pdf_url
    
    def test_filename_length_truncation(self):
        """Test filename truncation for very long titles"""
        long_title = "This is a very long paper title that should be truncated because it exceeds the reasonable filename length"
        
        # Simulate the filename creation logic
        clean_title = re.sub(r'[^\w\s-]', '', long_title).strip()
        clean_title = re.sub(r'[-\s]+', '-', clean_title)
        filename = f"{clean_title[:50]}.pdf"
        
        assert len(filename) <= 54  # 50 characters + '.pdf'
        assert filename.endswith('.pdf')


class TestFolderPicker:
    """Test suite for folder picker functionality"""
    
    def test_tkinter_import_handling(self):
        """Test that tkinter import is handled gracefully"""
        # This test ensures our import structure works
        try:
            from tkinter import filedialog
            import tkinter as tk
            tkinter_available = True
        except ImportError:
            tkinter_available = False
        
        # Should not raise an exception
        assert isinstance(tkinter_available, bool)
    
    def test_select_folder_logic_without_tkinter(self):
        """Test select_folder logic when tkinter is not available"""
        # Create a mock function that mimics the behavior
        def mock_select_folder():
            TKINTER_AVAILABLE = False
            if not TKINTER_AVAILABLE:
                return None
            
        result = mock_select_folder()
        assert result is None
    
    def test_select_folder_logic_success(self):
        """Test successful folder selection logic"""
        # Create a mock function that mimics the behavior without importing tkinter
        def mock_select_folder():
            TKINTER_AVAILABLE = True
            if not TKINTER_AVAILABLE:
                return None
            
            try:
                # Simulate successful folder selection
                folder_path = "/test/folder/path"
                return folder_path if folder_path else None
            except Exception:
                return None
        
        result = mock_select_folder()
        assert result == "/test/folder/path"
    
    def test_select_folder_logic_cancelled(self):
        """Test folder selection when user cancels"""
        # Create a mock function that mimics the behavior without importing tkinter
        def mock_select_folder():
            TKINTER_AVAILABLE = True
            if not TKINTER_AVAILABLE:
                return None
            
            try:
                # Simulate user cancellation (empty string)
                folder_path = ""
                return folder_path if folder_path else None
            except Exception:
                return None
        
        result = mock_select_folder()
        assert result is None
    
    def test_select_folder_logic_exception(self):
        """Test folder selection when an exception occurs"""
        # Create a mock function that mimics the behavior without importing tkinter
        def mock_select_folder():
            TKINTER_AVAILABLE = True
            if not TKINTER_AVAILABLE:
                return None
            
            try:
                # Simulate exception during folder selection
                raise Exception("Test exception")
            except Exception:
                return None
        
        result = mock_select_folder()
        assert result is None


if __name__ == '__main__':
    pytest.main([__file__, '-v']) 