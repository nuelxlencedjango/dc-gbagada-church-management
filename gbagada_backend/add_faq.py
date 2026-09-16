"""One-off script to add manual FAQ content to the AI's knowledge base.
Run this once from gbagada_backend with the venv activated:
    python3 add_faq.py
Safe to re-run — it just adds more entries each time, so if you run it
twice you'll get duplicate content. Delete old entries first if you
ever need to update rather than add.
"""
from src.services.rag_service import RAGService

rag = RAGService()

rag.add_documents([
    {
        "id": "faq_join_department",
        "title": "How to join a department",
        "source": "manual_faq",
        "text": (
            "To join a department at Dominion City Gbagada: register online through "
            "the church's website, selecting the department or cell you're interested "
            "in during registration. Alternatively, come to church in person and meet "
            "with the Head of Department (HOD), Cell Leader, or an admin, who can help "
            "you join directly."
        ),
    },
])
