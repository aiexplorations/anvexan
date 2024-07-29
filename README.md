# Arxiv Paper Getter
A search engine which can be used to hunt for papers on ArXiv based on a search string. 

This app has a simple Streamlit frontend and a backend written in Python and Flask. The end user can search all of Arxiv using search terms they enter into a search box.

The user gets to see summaries / abstracts of papers in the search results, and can download the papers they choose.

Requirements to run locally:
1. Ensure you have Docker / Docker Desktop installed
2. Download the source contents in the repo, and extract them to a directory/folder
3. Run the `run_app.sh` shell script

The shell script should build the front-end and backend docker containers. You should be able to access the front end on `http://localhost:8501/`

