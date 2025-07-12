import streamlit as st
import requests
import os
from pathlib import Path
import tempfile
import shutil
import re
try:
    from tkinter import filedialog
    import tkinter as tk
    TKINTER_AVAILABLE = True
except ImportError:
    TKINTER_AVAILABLE = False

# Get backend URL from environment variable or default to localhost
BACKEND_URL = os.getenv('BACKEND_URL', 'http://localhost:5001')

# Initialize session state
if 'search_results' not in st.session_state:
    st.session_state.search_results = []
if 'last_query' not in st.session_state:
    st.session_state.last_query = ""
if 'download_folder' not in st.session_state:
    st.session_state.download_folder = str(Path.home() / 'Downloads')

st.title('Anvexan - Arxiv Paper Search')

def select_folder():
    """Open a native folder picker dialog"""
    if not TKINTER_AVAILABLE:
        st.sidebar.error("❌ Folder picker not available. Please enter path manually.")
        return None
    
    try:
        # Create a root window and hide it
        root = tk.Tk()
        root.withdraw()
        root.wm_attributes('-topmost', 1)
        
        # Open folder dialog
        folder_path = filedialog.askdirectory(
            title="Select Download Folder",
            initialdir=st.session_state.download_folder
        )
        
        # Clean up
        root.destroy()
        
        return folder_path if folder_path else None
    except Exception as e:
        st.sidebar.error(f"❌ Error opening folder picker: {str(e)}")
        return None

# Download folder selection
st.sidebar.header('Download Settings')

# Folder picker section
col1, col2 = st.sidebar.columns([3, 1])

with col1:
    download_folder = st.text_input(
        'Download Folder (optional)', 
        value=st.session_state.download_folder,
        help='Enter the path where you want to download PDFs',
        key='folder_input'
    )

with col2:
    if st.button('📂', help='Browse for folder', key='browse_button'):
        selected_folder = select_folder()
        if selected_folder:
            st.session_state.download_folder = selected_folder
            st.rerun()

# Update session state if folder input changed
if download_folder != st.session_state.download_folder:
    st.session_state.download_folder = download_folder

# Create folder button
if st.sidebar.button('📁 Create Folder'):
    if download_folder:
        try:
            download_path = Path(download_folder)
            download_path.mkdir(parents=True, exist_ok=True)
            st.sidebar.success(f"✅ Folder created: {download_folder}")
        except Exception as e:
            st.sidebar.error(f"❌ Failed to create folder: {str(e)}")

# Validate and show download folder status
if download_folder:
    download_path = Path(download_folder)
    if not download_path.exists():
        st.sidebar.warning(f"⚠️ Folder '{download_folder}' does not exist")
        st.sidebar.info("Click 'Create Folder' to create it")
    elif not download_path.is_dir():
        st.sidebar.warning(f"❌ '{download_folder}' is not a valid directory")
    else:
        st.sidebar.success(f"✅ Downloads will be saved to: {download_folder}")

query = st.text_input('Enter search query', value=st.session_state.last_query)

def create_clean_title(title):
    """Create a clean filename from title"""
    if not title:
        return "paper"
    clean_title = re.sub(r'[^\w\s-]', '', title).strip()
    clean_title = re.sub(r'[-\s]+', '-', clean_title)
    return clean_title

def download_and_save_pdf(pdf_link, title, clean_title, save_to_folder=None):
    """Download PDF and optionally save to specified folder"""
    try:
        # Make request to backend download endpoint
        response = requests.get(
            f'{BACKEND_URL}/download',
            params={'pdf_link': pdf_link, 'title': title},
            stream=True
        )
        
        if response.status_code == 200:
            # Create filename with fallback
            if not clean_title:
                clean_title = create_clean_title(title)
            filename = f"{clean_title[:50]}.pdf" if clean_title else "paper.pdf"
            
            # Read the content once and store it
            pdf_content = b''
            for chunk in response.iter_content(chunk_size=8192):
                if chunk:
                    pdf_content += chunk
            
            # If save_to_folder is specified and exists, save there
            if save_to_folder and Path(save_to_folder).exists():
                try:
                    file_path = Path(save_to_folder) / filename
                    with open(file_path, 'wb') as f:
                        f.write(pdf_content)
                    return "saved", str(file_path), pdf_content, filename
                except Exception as e:
                    st.error(f"Failed to save to folder: {str(e)}")
                    return "download", None, pdf_content, filename
            else:
                # Return content for browser download
                return "download", None, pdf_content, filename
        else:
            st.error(f"Failed to download PDF: {response.status_code}")
            return None, None, None, None
    except Exception as e:
        st.error(f"Download error: {str(e)}")
        return None, None, None, None

# Search functionality
if st.button('Search') or (query and query != st.session_state.last_query):
    if query:
        st.session_state.last_query = query
        with st.spinner('Searching ArXiv...'):
            response = requests.get(f'{BACKEND_URL}/search', params={'query': query})
            
        if response.status_code == 200:
            st.session_state.search_results = response.json()
            st.rerun()
        else:
            st.error('Failed to fetch papers')
            st.session_state.search_results = []
    else:
        st.warning('Please enter a query')
        st.session_state.search_results = []

# Display search results
if st.session_state.search_results:
    papers = st.session_state.search_results
    st.header(f'Search Results ({len(papers)} papers found)')
    
    for i, paper in enumerate(papers):
        with st.expander(f"📄 {paper['title']}", expanded=False):
            st.write("**Abstract:**")
            st.write(paper['summary'])
            
            col1, col2, col3 = st.columns([1, 1, 1])
            
            with col1:
                st.markdown(f"[📖 Read on ArXiv]({paper['link']})")
            
            with col2:
                st.markdown(f"[🔗 Direct PDF]({paper['pdf_link']})")
            
            with col3:
                # Use unique key for each download button
                download_key = f"download_{i}_{hash(paper['title'])}"
                
                if st.button(f"📥 Download PDF", key=download_key):
                    with st.spinner("Downloading..."):
                        # Get clean_title with fallback
                        clean_title = paper.get('clean_title', '') or create_clean_title(paper['title'])
                        
                        download_type, saved_path, pdf_content, filename = download_and_save_pdf(
                            paper['pdf_link'], 
                            paper['title'], 
                            clean_title,
                            download_folder if download_folder and Path(download_folder).exists() else None
                        )
                        
                        if download_type == "saved":
                            st.success(f"✅ PDF saved to: {saved_path}")
                        elif download_type == "download" and pdf_content:
                            # Use a different approach for browser download
                            st.download_button(
                                label="💾 Click to Download",
                                data=pdf_content,
                                file_name=filename,
                                mime="application/pdf",
                                key=f"dl_btn_{i}_{hash(paper['title'])}"
                            )
            
            st.divider()

# Clear results button
if st.session_state.search_results:
    if st.button('🔄 Clear Results'):
        st.session_state.search_results = []
        st.session_state.last_query = ""
        st.rerun()

# Add instructions
with st.expander("ℹ️ How to use"):
    st.write("""
    1. **Set Download Folder**: Enter a custom folder path in the sidebar or click 📂 to browse
    2. **Create Folder**: Click 'Create Folder' if the folder doesn't exist
    3. **Search**: Enter keywords related to the papers you're looking for
    4. **Browse**: Click on paper titles to expand and read abstracts
    5. **Download**: Click "Download PDF" to save papers
    
    **Download Behavior**:
    - If a valid download folder is set: PDFs are saved directly to that folder
    - If no folder is set: PDFs are downloaded to your browser's default folder
    
    **Note**: Search results persist until you clear them or search again.
    """)