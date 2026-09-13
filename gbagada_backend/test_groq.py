#!/usr/bin/env python
"""
Test script for Groq API integration
"""

import os
from dotenv import load_dotenv
from groq import Groq

load_dotenv()

def test_groq_connection():
    """Test the Groq API connection"""
    print("🧪 Testing Groq API Connection...")
    print("=" * 50)
    
    # Get API key
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        print("❌ ERROR: GROQ_API_KEY not found in .env file!")
        print("Please add: GROQ_API_KEY=your_key_here")
        return False
    
    print(f"✅ API Key found: {api_key[:10]}...")
    
    try:
        # Initialize Groq client
        client = Groq(api_key=api_key)
        
        # Test chat completion
        print("\n💬 Sending test message...")
        response = client.chat.completions.create(
            model=os.getenv("GROQ_MODEL", "mixtral-8x7b-32768"),
            messages=[
                {"role": "system", "content": "You are a helpful assistant for a church."},
                {"role": "user", "content": "What is the mission of a church?"}
            ],
            temperature=0.2,
            max_tokens=100
        )
        
        print("\n✅ Groq is working perfectly!")
        print(f"📝 Response: {response.choices[0].message.content}")
        print(f"⚡ Tokens used: {response.usage.total_tokens}")
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_rag_service():
    """Test the RAG service with Groq"""
    print("\n" + "=" * 50)
    print("🧪 Testing RAG Service with Groq...")
    print("=" * 50)
    
    try:
        from src.services.rag_service import RAGService
        
        rag = RAGService()
        
        # Test queries
        test_queries = [
            "What are the service times?",
            "How can I contact the church?",
            "What is the church's location?"
        ]
        
        for query in test_queries:
            print(f"\n❓ Question: {query}")
            response = rag.query(query)
            print(f"💬 Response: {response}")
        
        print("\n✅ RAG Service test completed!")
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    # Test Groq connection first
    groq_ok = test_groq_connection()
    
    if groq_ok:
        # Test RAG service
        test_rag_service()
    else:
        print("\n⚠️ Please fix the Groq connection issue before continuing.")