from flask import Flask, request, jsonify, Response
import requests
import xml.etree.ElementTree as ET
import re

app = Flask(__name__)

@app.route('/search', methods=['GET'])
def search_papers():
    query = request.args.get('query')
    if not query:
        return jsonify({"error": "Query parameter is required"}), 400

    url = f'http://export.arxiv.org/api/query?search_query=all:{query}&start=0&max_results=20'
    response = requests.get(url)
    
    if response.status_code != 200:
        return jsonify({"error": "Failed to fetch papers"}), 500
    
    root = ET.fromstring(response.content)
    papers = []
    
    for entry in root.findall('{http://www.w3.org/2005/Atom}entry'):
        title = entry.find('{http://www.w3.org/2005/Atom}title').text
        summary = entry.find('{http://www.w3.org/2005/Atom}summary').text
        link = entry.find('{http://www.w3.org/2005/Atom}id').text
        pdf_link = link.replace('abs', 'pdf') + '.pdf'
        
        # Clean title for filename
        clean_title = re.sub(r'[^\w\s-]', '', title).strip()
        clean_title = re.sub(r'[-\s]+', '-', clean_title)
        
        paper = {
            "title": title,
            "summary": summary,
            "link": link,
            "pdf_link": pdf_link,
            "clean_title": clean_title
        }
        papers.append(paper)
    
    return jsonify(papers)

@app.route('/download', methods=['GET'])
def download_paper():
    pdf_link = request.args.get('pdf_link')
    title = request.args.get('title', '')
    
    if not pdf_link:
        return jsonify({"error": "PDF link parameter is required"}), 400

    try:
        response = requests.get(pdf_link, stream=True)
        if response.status_code != 200:
            return jsonify({"error": "Failed to download paper"}), 500
        
        # Create a clean filename
        if title:
            clean_title = re.sub(r'[^\w\s-]', '', title).strip()
            clean_title = re.sub(r'[-\s]+', '-', clean_title)
            filename = f"{clean_title[:50]}.pdf"
        else:
            # Extract ArXiv ID from URL as fallback
            arxiv_id = pdf_link.split("/")[-1].replace(".pdf", "")
            filename = f"{arxiv_id}.pdf"
        
        def generate():
            for chunk in response.iter_content(chunk_size=8192):
                if chunk:
                    yield chunk
        
        return Response(
            generate(),
            mimetype='application/pdf',
            headers={
                'Content-Disposition': f'attachment; filename="{filename}"',
                'Content-Type': 'application/pdf'
            }
        )
    except Exception as e:
        return jsonify({"error": f"Download failed: {str(e)}"}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001)