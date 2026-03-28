import streamlit as st
import requests
import google.generativeai as genai
import os
import json
# Try to load local .env variables if python-dotenv is installed (it gracefully ignores this in Streamlit Cloud)
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

st.set_page_config(page_title="Food Pharma", page_icon="🍎", layout="wide")

# Custom UI Styling (Dark Mode & Glassmorphism)
st.markdown("""
<style>
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;500;800&display=swap');
    
    /* Apply styling to the main app container */
    [data-testid="stAppViewContainer"] {
        background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%);
        color: #f8fafc;
        font-family: 'Outfit', sans-serif;
    }
    
    /* Transparent header to blend with background */
    [data-testid="stHeader"] {
        background-color: transparent !important;
    }

    h1, h2, h3, h4, p {
        font-family: 'Outfit', sans-serif !important;
    }

    .glass-card {
        background: rgba(255, 255, 255, 0.05);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 16px;
        padding: 24px;
        margin-bottom: 24px;
        box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
    }
    
    .health-score {
        font-size: 6rem;
        font-weight: 800;
        text-align: center;
        background: -webkit-linear-gradient(45deg, #4ade80, #3b82f6);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        margin: 0;
        line-height: 1;
        padding-top: 10px;
    }
    
    .score-label {
        text-align: center;
        text-transform: uppercase;
        letter-spacing: 2px;
        font-size: 0.9rem;
        color: #94a3b8;
        font-weight: 500;
        margin-top: 12px;
    }
    
    .stButton > button {
        background: linear-gradient(to right, #3b82f6, #8b5cf6);
        color: white;
        border: none;
        border-radius: 8px;
        padding: 0.5rem 2rem;
        font-weight: 600;
        transition: all 0.3s ease;
        width: 100%;
    }
    
    .stButton > button:hover {
        opacity: 0.9;
        box-shadow: 0 0 15px rgba(59, 130, 246, 0.5);
    }
</style>
""", unsafe_allow_html=True)

# Hardcoded API Key (Explicitly placed per developer requirements for seamless public deployment)
api_key = "AIzaSyCcUHBuLV0eQDsIVROH6X5_Khb8m88dWfE"

if api_key:
    genai.configure(api_key=api_key)

@st.cache_data(ttl=3600, show_spinner=False)
def fetch_food_data(query):
    headers = {"User-Agent": "AIFoodAnalyzer/1.0"}
    
    # Create a robust session with exponential backoff for proxy server errors
    session = requests.Session()
    from requests.adapters import HTTPAdapter
    from urllib3.util.retry import Retry
    # Retry up to 4 times for 503 and 429 overloads with increasing delay
    retry = Retry(total=4, backoff_factor=1, status_forcelist=[429, 500, 502, 503, 504])
    adapter = HTTPAdapter(max_retries=retry)
    session.mount('https://', adapter)
    
    try:
        # If the user typed a barcode, hit the exact product API
        if query.isdigit() and len(query) >= 8:
            url = f"https://world.openfoodfacts.org/api/v2/product/{query}.json"
            response = session.get(url, headers=headers, timeout=20)
            if response.status_code == 200:
                data = response.json()
                if "product" in data:
                    return 200, {"products": [data["product"]]}
            return response.status_code, {}
        
        # Otherwise, hit the text search API
        url = f"https://world.openfoodfacts.org/cgi/search.pl?search_terms={query}&search_simple=1&action=process&json=1"
        response = session.get(url, headers=headers, timeout=25)
        return response.status_code, response.json() if response.status_code == 200 else {}
    except requests.exceptions.RequestException:
        return 503, {}

@st.cache_data(ttl=3600, show_spinner=False)
def analyze_ingredients_with_ai(ingredients_text, _api_key):
    model_name = "gemini-2.5-pro"
    try:
        available = [m.name for m in genai.list_models() if 'generateContent' in m.supported_generation_methods]
        if available:
            flash_models = [m for m in available if "pro" in m]
            model_name = flash_models[0] if flash_models else available[0]
            model_name = model_name.replace("models/", "")
    except Exception:
        pass
        
    model = genai.GenerativeModel(model_name)
    prompt = f"""
    You are an elite nutritionist AI evaluating a packaged food. 
    Ingredients: {ingredients_text}
    
    Evaluate strictly against WHO (World Health Organization) and FSSAI (Food Safety and Standards Authority of India) guidelines.
    
    You MUST return ONLY a raw JSON object with the following exact keys (DO NOT wrap in ```json, just the raw braces):
    {{
        "health_score": <int between 0 and 100 representing the overall FSSAI/WHO safety score>,
        "analysis_table": "<markdown table with columns: Ingredient | WHO/FSSAI Limit | Concern. MAX 4 most dangerous ingredients.>",
        "daily_limit": "<1 short sentence stating strict daily gram limit recommendation>",
        "alternatives": "<2 short bullet points naming specific healthier commercial brands/options>"
    }}
    
    Keep text extremely concise. Max 1 short sentence per point. Avoid conversational text.
    """
    response = model.generate_content(prompt)
    return response.text

st.markdown("<h1 style='text-align: center;'>AI Food Analyzer 🍎</h1>", unsafe_allow_html=True)
st.markdown("<p style='text-align: center; color: #cbd5e1; margin-bottom: 2rem;'>Discover the real impact of your snacks against FSSAI & WHO standards.</p>", unsafe_allow_html=True)

# Main UI layout
col_main, col_spacer, col_sidebar = st.columns([2, 0.2, 1])

with col_sidebar:
    st.markdown('<div class="glass-card">', unsafe_allow_html=True)
    st.markdown("### 🔍 Search")
    food_query = st.text_input("Packaged Food Name", placeholder="e.g., Nutella, Oreo", label_visibility="collapsed")
    analyze_btn = st.button("Analyze Food")
    st.markdown('</div>', unsafe_allow_html=True)
    
    if not api_key:
        st.markdown("<p style='color: #f87171; font-size: 0.85rem;'>⚠️ System Offline: AI Engine disconnected.</p>", unsafe_allow_html=True)

with col_main:
    if analyze_btn:
        if food_query:
            with st.spinner(f"Analyzing {food_query}..."):
                try:
                    status_code, data = fetch_food_data(food_query)
                    
                    if status_code == 200:
                        products = data.get("products", [])
                        if products and len(products) > 0:
                            # We grab the first search result, or the exact mapped barcode product
                            top_product = products[0]
                            # Open Food Facts uses 'product_name' and 'ingredients_text'
                            product_name = top_product.get("product_name", "Unknown Product")
                            ingredients = top_product.get("ingredients_text", "")
                            
                            st.success(f"**Found Product:** {product_name}")
                            st.markdown(f"**Ingredients Snapshot:**  \n<span style='color: #94a3b8; font-size: 0.9em;'>{ingredients[:150]}...</span>", unsafe_allow_html=True)
                            
                            if ingredients and ingredients.strip() != "":
                                clean_ingredients = ingredients.replace(", ", " • ")
                                
                                if not api_key:
                                    st.warning("Critical Error: GEMINI_API_KEY is not assigned internally.")
                                else:
                                    try:
                                        raw_json_output = analyze_ingredients_with_ai(clean_ingredients, api_key)
                                        # Parse JSON safely
                                        clean_json = raw_json_output.strip().replace("```json", "").replace("```", "")
                                        ai_data = json.loads(clean_json)
                                        
                                        # Dashboard Layout
                                        st.markdown("---")
                                        metric_col, info_col = st.columns([1, 1.5])
                                        
                                        with metric_col:
                                            st.markdown(f'<div class="glass-card"><p class="health-score">{ai_data.get("health_score", "?")}</p><p class="score-label">FSSAI / WHO Index</p></div>', unsafe_allow_html=True)
                                            
                                        with info_col:
                                            st.markdown('<div class="glass-card"><h4>⚖️ Daily Limit</h4><p>' + str(ai_data.get("daily_limit", "")) + '</p><h4>🔄 Healthier Alternatives</h4>' + str(ai_data.get("alternatives", "")) + '</div>', unsafe_allow_html=True)
                                            
                                        st.markdown('<div class="glass-card"><h4>🔬 Flagged Ingredients Breakdown</h4>' + str(ai_data.get("analysis_table", "")) + '</div>', unsafe_allow_html=True)
                                        
                                    except json.JSONDecodeError:
                                        st.error("AI returned malformed data. Try again.")
                                        with st.expander("View Raw JSON Output"):
                                            st.write(raw_json_output)
                                    except Exception as e:
                                        st.error(f"AI Error: {str(e)}")
                            else:
                                st.warning("No ingredients list available for this product in the Open Food Facts database.")
                        else:
                            st.error(f"Could not find any products matching '{food_query}'.")
                    elif status_code == 503 or status_code == 429:
                        st.error("🚨 Open Food Facts API is currently overloaded or rate-limiting. Try again later.")
                    else:
                        st.error(f"Open Food Facts API Error (Status Code: {status_code}).")
                except Exception as e:
                    st.error(f"Network error: {str(e)}")
        else:
            st.warning("Please enter a food name first.")
