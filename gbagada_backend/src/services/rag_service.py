import os
from typing import List, Dict, Any, Optional
import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv
import warnings
warnings.filterwarnings('ignore')

load_dotenv()

class RAGService:
    def __init__(self):
        print("🤖 Initializing RAG Service with Groq...")
        
        # Initialize Groq client
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            print("⚠️ GROQ_API_KEY not found! RAG will use fallback mode.")
            self.client = None
        else:
            try:
                from groq import Groq
                self.client = Groq(api_key=api_key)
                print("✅ Groq client initialized")
            except Exception as e:
                print(f"❌ Error initializing Groq: {e}")
                self.client = None
        
        print("✅ RAG Service initialized successfully!")
    
    def _query_groq(self, question: str) -> Optional[str]:
        """Query Groq directly"""
        if not self.client:
            return None
        
        try:
            response = self.client.chat.completions.create(
                model=os.getenv("GROQ_MODEL", "mixtral-8x7b-32768"),
                messages=[
                    {"role": "system", "content": "You are a helpful assistant for a church called Dominion City Gbagada. Give helpful, friendly, and accurate responses about the church."},
                    {"role": "user", "content": question}
                ],
                temperature=float(os.getenv("GROQ_TEMPERATURE", "0.2")),
                max_tokens=int(os.getenv("GROQ_MAX_TOKENS", "500"))
            )
            
            return response.choices[0].message.content
        except Exception as e:
            print(f"❌ Groq query error: {e}")
            return None
    
    def query(self, question: str, user_context: Dict = None) -> str:
        """Query the RAG system with a question"""
        # Try Groq first
        if self.client:
            try:
                answer = self._query_groq(question)
                if answer:
                    return answer
            except Exception as e:
                print(f"❌ Groq error: {e}")
        
        # Fallback: FAQ
        return self.get_church_info(question.lower())
    
    def get_church_info(self, query: str) -> str:
        """Get specific church information (fallback for common queries)"""
        info_map = {
            "service time": "Sunday services at 9 AM and 11 AM. Tuesday prayer meeting at 6 PM.",
            "service times": "Sunday services at 9 AM and 11 AM. Tuesday prayer meeting at 6 PM.",
            "location": "Dominion City Gbagada, Lagos, Nigeria.",
            "address": "Dominion City Gbagada, Lagos, Nigeria.",
            "pastor": "Our Branch Pastor is available for guidance and support. Please contact the church office.",
            "contact": f"Phone: {os.getenv('CHURCH_PHONE', '+234-XXX-XXX-XXXX')}, Email: {os.getenv('CHURCH_EMAIL', 'info@dominioncitygbagada.com')}",
            "social media": "Follow us on YouTube, Instagram, and Facebook @DominionCityGbagada",
            "phone": f"Phone: {os.getenv('CHURCH_PHONE', '+234-XXX-XXX-XXXX')}",
            "email": f"Email: {os.getenv('CHURCH_EMAIL', 'info@dominioncitygbagada.com')}",
            "welcome": "Welcome to Dominion City Gbagada! We are a family of believers dedicated to spreading God's love.",
            "prayer": "We have prayer meetings every Tuesday at 6 PM.",
            "join": "To join our church, click the 'Join Our Family' button on our website or visit us in person!",
            "name": "I'm the Dominion City Gbagada AI Assistant! You can call me DC Assistant.",
            "programs": "We have Sunday services at 9 AM and 11 AM, Tuesday prayer meetings at 6 PM, cell groups, and various departments including Children's Church, Media, Ushering, and Prayer."
        }
        
        query_lower = query.lower()
        for key, value in info_map.items():
            if key in query_lower:
                return value
        
        return "I'm not sure about that. Please contact our church office for more information."
    
    def scrape_church_hq(self):
        """Scrape the church HQ website for information"""
        try:
            url = os.getenv("HQ_WEBSITE", "https://dclagoshq.com/")
            print(f"🌐 Scraping: {url}")
            response = requests.get(url, timeout=10)
            soup = BeautifulSoup(response.text, 'html.parser')
            
            paragraphs = soup.find_all('p')
            content = " ".join([p.get_text() for p in paragraphs])
            
            print("✅ HQ website scraped successfully")
            return True
        except Exception as e:
            print(f"❌ Error scraping HQ: {e}")
            return False
    
    def add_documents(self, documents: List[Dict[str, Any]]):
        """Placeholder for adding documents"""
        print(f"📝 Would add {len(documents)} documents")
        return True
