from flask import Flask, request, jsonify
import requests
import xml.etree.ElementTree as ET

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
        paper = {
            "title": title,
            "summary": summary,
            "link": link,
            "pdf_link": pdf_link
        }
        papers.append(paper)
    
    return jsonify(papers)

@app.route('/download', methods=['GET'])
def download_paper():
    pdf_link = request.args.get('pdf_link')
    if not pdf_link:
        return jsonify({"error": "PDF link parameter is required"}), 400

    response = requests.get(pdf_link, stream=True)
    if response.status_code != 200:
        return jsonify({"error": "Failed to download paper"}), 500
    
    headers = {
        'Content-Disposition': f'attachment; filename="{pdf_link.split("/")[-1]}"'
    }
    return response.raw, response.status_code, headers

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)