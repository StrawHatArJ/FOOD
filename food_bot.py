import streamlit as st
import requests

st.set_page_config(page_title="AI Food Analyzer", page_icon="🍎")

st.title("AI Food Analyzer 🍎")
st.write("Welcome to your intelligent food analyzer! Enter a packaged food name below to fetch its ingredients.")

food_query = st.text_input("Packaged Food Name", placeholder="e.g., Nutella, Oreo")

if st.button("Analyze Food"):
    if food_query:
        with st.spinner(f"Searching for **{food_query}** using Open Food Facts API..."):
            # TODO: Implement the Open Food Facts API call
            # Example endpoint: https://world.openfoodfacts.org/cgi/search.pl?search_terms={query}&search_simple=1&action=process&json=1
            
            st.warning("Backend API integration coming up in the next step!")
    else:
        st.error("Please enter a food name to analyze.")
