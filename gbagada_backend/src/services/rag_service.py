import os
import re
import time
from typing import List, Dict, Any, Optional
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv
import warnings
warnings.filterwarnings('ignore')

load_dotenv()

CHROMA_DIR = os.getenv("CHROMA_PERSIST_DIR", "./chroma_data")
COLLECTION_NAME = "church_knowledge"
EMBED_MODEL_NAME = os.getenv("EMBED_MODEL", "nomic-ai/nomic-embed-text-v1.5")

# Crawl limits — bounded so a church site (dozens of pages, not
# thousands) finishes scraping in a reasonable time and never runs away
# crawling an unrelated part of the internet.
MAX_PAGES = int(os.getenv("HQ_CRAWL_MAX_PAGES", "40"))
REQUEST_DELAY_SECONDS = 0.5

# Paths that are never real content — assets, feeds, admin, etc.
SKIP_PATH_PATTERNS = (
    "/wp-content/", "/wp-admin/", "/wp-json/", "/feed/", "/xmlrpc.php",
    "/category/", "/tag/", "/author/", "/page/",
)
SKIP_EXTENSIONS = (
    ".jpg", ".jpeg", ".png", ".gif", ".svg", ".webp", ".pdf",
    ".css", ".js", ".ico", ".xml", ".zip",
)


class RAGService:
    def __init__(self):
        print("🤖 Initializing RAG Service (Groq + Nomic + ChromaDB)...")

        # --- Groq (generation) ---
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

        # --- Nomic embedding model (local, free, no API) ---
        self.embedder = None
        try:
            from sentence_transformers import SentenceTransformer
            self.embedder = SentenceTransformer(EMBED_MODEL_NAME, trust_remote_code=True)
            print(f"✅ Embedding model loaded: {EMBED_MODEL_NAME}")
        except Exception as e:
            print(f"❌ Error loading embedding model: {e}")
            self.embedder = None

        # --- ChromaDB (vector store) ---
        self.collection = None
        try:
            import chromadb
            chroma_client = chromadb.PersistentClient(path=CHROMA_DIR)
            self.collection = chroma_client.get_or_create_collection(name=COLLECTION_NAME)
            print(f"✅ ChromaDB collection ready ({self.collection.count()} chunks stored)")
        except Exception as e:
            print(f"❌ Error initializing ChromaDB: {e}")
            self.collection = None

        print("✅ RAG Service initialized!")

    # ---------------- Embedding helpers ----------------

    def _embed(self, texts: List[str], is_query: bool) -> List[List[float]]:
        """Nomic expects a task-specific prefix on every input — this
        materially affects retrieval quality, it's not just cosmetic."""
        prefix = "search_query: " if is_query else "search_document: "
        prefixed = [f"{prefix}{t}" for t in texts]
        embeddings = self.embedder.encode(prefixed, convert_to_numpy=True)
        return embeddings.tolist()

    # ---------------- Retrieval-augmented query ----------------

    def query(self, question: str, user_context: Dict = None, live_context: str = "") -> str:
        """Real RAG: embed the question, retrieve the most relevant
        scraped chunks from ChromaDB, and hand them to Groq as context
        before it answers. live_context carries live, permission-checked
        facts from Gbagada's own database (services, departments, and —
        only when the caller is actually authorized — internal reports)
        and always takes priority over the HQ-derived background
        knowledge, since it's specific to this branch and always current."""
        hq_context_block = ""
        if self.embedder and self.collection and self.collection.count() > 0:
            try:
                query_embedding = self._embed([question], is_query=True)[0]
                results = self.collection.query(
                    query_embeddings=[query_embedding],
                    n_results=4
                )
                docs = results.get("documents", [[]])[0]
                metas = results.get("metadatas", [[]])[0]
                if docs:
                    pieces = []
                    for doc, meta in zip(docs, metas):
                        source = meta.get("source", "") if meta else ""
                        pieces.append(f"[From {source}]\n{doc}")
                    hq_context_block = "\n\n---\n\n".join(pieces)
            except Exception as e:
                print(f"❌ Retrieval error: {e}")

        if self.client:
            try:
                answer = self._query_groq(question, user_context, live_context, hq_context_block)
                if answer:
                    return answer
            except Exception as e:
                print(f"❌ Groq error: {e}")

        # Last-resort fallback if Groq or retrieval genuinely can't run
        return self.get_church_info(question.lower())

    def _query_groq(self, question: str, user_context: Dict = None, live_context: str = "", hq_context_block: str = "") -> Optional[str]:
        if not self.client:
            return None

        system_prompt = (
            "You are a helpful assistant for Dominion City Gbagada, a branch church. "
            "Give helpful, friendly, and accurate responses. "
            "Gbagada-specific information (services, departments, reports) always takes "
            "priority over general Dominion City background information, since Gbagada's "
            "own schedule and details may differ from the wider ministry.\n\n"
            "Important boundaries:\n"
            "- Only state specific facts, steps, or procedures that actually appear in "
            "the information provided below. Never invent specific details (like exact "
            "sign-up steps, forms, or processes) that aren't explicitly given to you — "
            "if asked how to do something and the specifics aren't in your information, "
            "say so honestly and suggest contacting the church office, rather than "
            "guessing at a plausible-sounding process.\n"
            "- You are not a pastor, counselor, or substitute for real pastoral care. "
            "Never offer to personally receive, hold, or pray over someone's prayer "
            "request yourself, and never imply that sharing a request with you is a "
            "real channel for it to reach the church. Always point people to the "
            "actual prayer meeting time and encourage them to reach out to church "
            "staff directly for anything personal or sensitive."
        )

        if user_context:
            name = user_context.get("name", "")
            role = user_context.get("role", "")
            system_prompt += (
                f"\n\nYou are currently speaking with {name}, whose role is {role}. "
                f"When they refer to 'my department', 'my cell', or similar first-person "
                f"phrasing, this refers to whatever is specifically identified as theirs "
                f"in the information below — connect it confidently rather than asking "
                f"them to repeat something already established by who they are."
            )
        if live_context:
            system_prompt += (
                "\n\nCurrent information specific to Dominion City Gbagada:\n\n" + live_context
            )
        if hq_context_block:
            system_prompt += (
                "\n\nGeneral background information about Dominion City as a ministry "
                "(from the headquarters website — use only for general context, not for "
                "Gbagada-specific facts like local service times):\n\n" + hq_context_block
            )
        system_prompt += (
            "\n\nIf none of the above actually answers the question, say so honestly "
            "rather than guessing or making something up."
        )

        try:
            response = self.client.chat.completions.create(
                model=os.getenv("GROQ_MODEL", "openai/gpt-oss-20b"),
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": question}
                ],
                temperature=float(os.getenv("GROQ_TEMPERATURE", "0.2")),
                max_tokens=int(os.getenv("GROQ_MAX_TOKENS", "500"))
            )
            return response.choices[0].message.content
        except Exception as e:
            print(f"❌ Groq query error: {e}")
            return None

    # ---------------- FAQ fallback (unchanged, still useful as a
    # last-resort layer when Groq/retrieval genuinely can't run) ----------------

    def get_church_info(self, query: str) -> str:
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

    # ---------------- HQ website scraping (real, stores into ChromaDB) ----------------

    def _is_content_url(self, url: str, base_domain: str) -> bool:
        parsed = urlparse(url)
        if parsed.netloc and parsed.netloc != base_domain:
            return False
        path = parsed.path.lower()
        if any(p in path for p in SKIP_PATH_PATTERNS):
            return False
        if any(path.endswith(ext) for ext in SKIP_EXTENSIONS):
            return False
        return True

    def _extract_page(self, url: str) -> Optional[Dict[str, str]]:
        try:
            resp = requests.get(url, timeout=10, headers={"User-Agent": "Mozilla/5.0"})
            if resp.status_code != 200 or "text/html" not in resp.headers.get("Content-Type", ""):
                return None
            soup = BeautifulSoup(resp.text, "html.parser")

            # Strip elements that are never real page content
            for tag in soup(["script", "style", "nav", "footer", "header", "noscript", "form"]):
                tag.decompose()

            title = soup.title.get_text(strip=True) if soup.title else url
            text = soup.get_text(separator=" ", strip=True)
            text = re.sub(r"\s+", " ", text).strip()

            links = []
            for a in soup.find_all("a", href=True):
                links.append(urljoin(url, a["href"]))

            return {"url": url, "title": title, "text": text, "links": links}
        except Exception as e:
            print(f"⚠️ Failed to fetch {url}: {e}")
            return None

    def _chunk_text(self, text: str, chunk_size: int = 700, overlap: int = 100) -> List[str]:
        if len(text) <= chunk_size:
            return [text] if text else []
        chunks = []
        start = 0
        while start < len(text):
            end = start + chunk_size
            chunks.append(text[start:end])
            start += chunk_size - overlap
        return chunks

    def scrape_church_hq(self) -> bool:
        """Crawls the HQ website starting from its homepage, following
        internal links up to MAX_PAGES, and stores every page's content
        as embedded chunks in ChromaDB — replacing whatever was stored
        before, so re-running this always reflects the site's current
        content rather than accumulating stale duplicates."""
        if not self.embedder or not self.collection:
            print("❌ Cannot scrape: embedder or ChromaDB not available")
            return False

        base_url = os.getenv("HQ_WEBSITE", "https://dclagoshq.com/")
        base_domain = urlparse(base_url).netloc

        print(f"🌐 Crawling: {base_url} (up to {MAX_PAGES} pages)")

        visited = set()
        to_visit = [base_url]
        pages = []

        while to_visit and len(visited) < MAX_PAGES:
            url = to_visit.pop(0)
            if url in visited:
                continue
            visited.add(url)

            page = self._extract_page(url)
            time.sleep(REQUEST_DELAY_SECONDS)
            if not page or len(page["text"]) < 50:
                continue

            pages.append(page)

            for link in page["links"]:
                clean_link = link.split("#")[0].rstrip("/")
                if clean_link and clean_link not in visited and self._is_content_url(clean_link, base_domain):
                    to_visit.append(clean_link)

        print(f"✅ Fetched {len(pages)} pages")

        if not pages:
            return False

        # Replace the whole collection so re-scraping never leaves stale
        # chunks from pages that changed or were removed.
        try:
            import chromadb
            chroma_client = chromadb.PersistentClient(path=CHROMA_DIR)
            chroma_client.delete_collection(COLLECTION_NAME)
            self.collection = chroma_client.get_or_create_collection(name=COLLECTION_NAME)
        except Exception as e:
            print(f"⚠️ Could not reset collection cleanly: {e}")

        all_chunks, all_metas, all_ids = [], [], []
        for page in pages:
            chunks = self._chunk_text(page["text"])
            for i, chunk in enumerate(chunks):
                all_chunks.append(chunk)
                all_metas.append({"source": page["url"], "title": page["title"]})
                all_ids.append(f"{page['url']}::{i}")

        if not all_chunks:
            return False

        print(f"📝 Embedding {len(all_chunks)} chunks...")
        embeddings = self._embed(all_chunks, is_query=False)

        # Chroma has a per-call batch limit on some backends — add in
        # batches to stay safe regardless of collection size.
        batch_size = 100
        for i in range(0, len(all_chunks), batch_size):
            self.collection.add(
                documents=all_chunks[i:i + batch_size],
                embeddings=embeddings[i:i + batch_size],
                metadatas=all_metas[i:i + batch_size],
                ids=all_ids[i:i + batch_size],
            )

        print(f"✅ Stored {len(all_chunks)} chunks from {len(pages)} pages in ChromaDB")
        return True

    def add_documents(self, documents: List[Dict[str, Any]]):
        """Add arbitrary documents (e.g. manually written FAQ content)
        into the same knowledge base, alongside scraped HQ content."""
        if not self.embedder or not self.collection:
            print("❌ Cannot add documents: embedder or ChromaDB not available")
            return False

        texts = [d.get("text", "") for d in documents]
        embeddings = self._embed(texts, is_query=False)
        ids = [d.get("id", f"manual::{i}") for i, d in enumerate(documents)]
        metas = [{"source": d.get("source", "manual"), "title": d.get("title", "")} for d in documents]

        self.collection.add(documents=texts, embeddings=embeddings, metadatas=metas, ids=ids)
        print(f"📝 Added {len(documents)} manual documents")
        return True