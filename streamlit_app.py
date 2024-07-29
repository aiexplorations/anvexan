import streamlit as st
import requests

st.title('ArXiv Paper Search')

query = st.text_input('Enter search query')

if st.button('Search'):
    if query:
        response = requests.get(f'http://backend:5000/search', params={'query': query})
        if response.status_code == 200:
            papers = response.json()
            st.header('Search Results')
            for paper in papers:
                st.subheader(paper['title'])
                st.write(paper['summary'])
                st.markdown(f"[Read more]({paper['link']})")
                st.markdown(f"[Download PDF]({paper['pdf_link']})", unsafe_allow_html=True)
        else:
            st.error('Failed to fetch papers')
    else:
        st.warning('Please enter a query')