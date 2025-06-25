import json
import os
import tempfile
import base64
from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import cgi
from io import BytesIO

# Import file processing libraries
try:
    import PyPDF2
    from docx import Document
    import requests
    from supabase import create_client, Client
    import google.generativeai as genai
    from dotenv import load_dotenv
    from bs4 import BeautifulSoup
    import time
    load_dotenv()
except ImportError as e:
    print(f"Import warning: {e}")

# Initialize services
def get_supabase_client():
    try:
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_ANON_KEY")
        if url and key:
            return create_client(url, key)
    except Exception as e:
        print(f"Supabase client error: {e}")
    return None

def get_gemini_embeddings(text):
    try:
        genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
        model = "models/text-embedding-004"
        result = genai.embed_content(
            model=model,
            content=text,
            task_type="retrieval_document"
        )
        return result['embedding']
    except Exception as e:
        print(f"Gemini embeddings error: {e}")
        return None

def scrape_website(url):
    """Scrape text content from a website"""
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Remove script and style elements
        for script in soup(["script", "style"]):
            script.decompose()
        
        # Get text content
        text = soup.get_text()
        
        # Clean up text
        lines = (line.strip() for line in text.splitlines())
        chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
        text = ' '.join(chunk for chunk in chunks if chunk)
        
        # Get page title
        title = soup.find('title')
        page_title = title.string.strip() if title else url
        
        return {
            "title": page_title,
            "content": text,
            "url": url,
            "length": len(text)
        }
        
    except Exception as e:
        return {
            "error": f"Scraping failed: {str(e)}",
            "url": url
        }

def extract_text_from_pdf(file_content):
    try:
        pdf_file = BytesIO(file_content)
        pdf_reader = PyPDF2.PdfReader(pdf_file)
        text = ""
        for page in pdf_reader.pages:
            text += page.extract_text() + "\n"
        return text.strip()
    except Exception as e:
        print(f"PDF extraction error: {e}")
        return None

def extract_text_from_docx(file_content):
    try:
        docx_file = BytesIO(file_content)
        doc = Document(docx_file)
        text = ""
        for paragraph in doc.paragraphs:
            text += paragraph.text + "\n"
        return text.strip()
    except Exception as e:
        print(f"DOCX extraction error: {e}")
        return None

def chunk_text(text, chunk_size=1000, overlap=200):
    """Split text into overlapping chunks"""
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunk = text[start:end]
        chunks.append(chunk)
        start = end - overlap
        if start >= len(text):
            break
    return chunks

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        # Parse the URL
        parsed_path = urlparse(self.path)
        path = parsed_path.path
        
        # Set CORS headers
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', '*')
        self.end_headers()
        
        # Route handling
        if path == '/api/health':
            response = {
                "status": "ok",
                "environment": os.getenv("ENVIRONMENT", "development"),
                "version": "1.2.0"
            }
        elif path == '/api/test':
            response = {
                "message": "Test endpoint working",
                "supabase_url": "set" if os.getenv("SUPABASE_URL") else "missing",
                "gemini_api": "set" if os.getenv("GEMINI_API_KEY") else "missing",
                "supabase_key": "set" if os.getenv("SUPABASE_ANON_KEY") else "missing"
            }
        elif path == '/api/bots':
            # Get bots from database
            supabase = get_supabase_client()
            if supabase:
                try:
                    result = supabase.table("bots").select("*").execute()
                    response = {
                        "message": "Bots retrieved successfully",
                        "bots": result.data
                    }
                except Exception as e:
                    response = {
                        "error": f"Database error: {str(e)}",
                        "bots": []
                    }
            else:
                response = {
                    "error": "Database connection failed",
                    "bots": []
                }
        else:
            response = {
                "message": "Botverse API is running",
                "version": "1.2.0",
                "path": path
            }
        
        # Send response
        self.wfile.write(json.dumps(response).encode())
    
    def do_POST(self):
        # Parse the URL
        parsed_path = urlparse(self.path)
        path = parsed_path.path
        
        # Set CORS headers
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', '*')
        self.end_headers()
        
        if path == '/api/upload':
            try:
                # Get content length
                content_length = int(self.headers['Content-Length'])
                post_data = self.rfile.read(content_length)
                
                # Parse multipart form data
                content_type = self.headers['Content-Type']
                if 'multipart/form-data' in content_type:
                    # Extract boundary
                    boundary = content_type.split('boundary=')[1].encode()
                    
                    # Parse the multipart data
                    parts = post_data.split(b'--' + boundary)
                    
                    file_content = None
                    filename = None
                    bot_name = None
                    
                    for part in parts:
                        if b'Content-Disposition' in part:
                            if b'name="file"' in part:
                                # Extract filename
                                lines = part.split(b'\r\n')
                                for line in lines:
                                    if b'filename=' in line:
                                        filename = line.decode().split('filename="')[1].split('"')[0]
                                        break
                                
                                # Extract file content
                                file_start = part.find(b'\r\n\r\n') + 4
                                file_content = part[file_start:].rstrip(b'\r\n')
                            
                            elif b'name="botName"' in part:
                                # Extract bot name
                                name_start = part.find(b'\r\n\r\n') + 4
                                bot_name = part[name_start:].rstrip(b'\r\n').decode()
                    
                    if not file_content or not filename:
                        response = {"error": "No file uploaded"}
                    else:
                        # Process the file
                        response = self.process_uploaded_file(file_content, filename, bot_name)
                else:
                    response = {"error": "Invalid content type. Expected multipart/form-data"}
                    
            except Exception as e:
                response = {
                    "error": f"Upload processing error: {str(e)}",
                    "details": str(type(e).__name__)
                }
        
        elif path == '/api/scrape':
            try:
                # Get content length
                content_length = int(self.headers['Content-Length'])
                post_data = self.rfile.read(content_length)
                
                # Parse JSON data
                data = json.loads(post_data.decode('utf-8'))
                url = data.get('url')
                bot_name = data.get('botName')
                
                if not url:
                    response = {"error": "URL is required"}
                else:
                    response = self.process_website_scrape(url, bot_name)
                    
            except json.JSONDecodeError:
                response = {"error": "Invalid JSON data"}
            except Exception as e:
                response = {
                    "error": f"Scrape processing error: {str(e)}",
                    "details": str(type(e).__name__)
                }
        
        else:
            response = {
                "message": "POST endpoint working",
                "path": path
            }
        
        self.wfile.write(json.dumps(response).encode())
    
    def process_website_scrape(self, url, bot_name):
        """Process website scraping and store in database"""
        try:
            # Scrape the website
            scrape_result = scrape_website(url)
            
            if 'error' in scrape_result:
                return scrape_result
            
            text_content = scrape_result['content']
            page_title = scrape_result['title']
            
            if not text_content:
                return {"error": "Could not extract text from website"}
            
            # Generate bot name if not provided
            if not bot_name:
                bot_name = f"Bot from {page_title}"
            
            # Get Supabase client
            supabase = get_supabase_client()
            if not supabase:
                return {"error": "Database connection failed"}
            
            # Store bot in database
            bot_data = {
                "name": bot_name,
                "type": "website",
                "source": url,
                "status": "processing"
            }
            
            bot_result = supabase.table("bots").insert(bot_data).execute()
            if not bot_result.data:
                return {"error": "Failed to create bot"}
            
            bot_id = bot_result.data[0]["id"]
            
            # Store document
            doc_data = {
                "bot_id": bot_id,
                "content": text_content,
                "filename": page_title,
                "file_type": "html"
            }
            
            doc_result = supabase.table("documents").insert(doc_data).execute()
            if not doc_result.data:
                return {"error": "Failed to store document"}
            
            doc_id = doc_result.data[0]["id"]
            
            # Chunk text and create embeddings
            chunks = chunk_text(text_content)
            embeddings_created = 0
            
            for i, chunk in enumerate(chunks):
                # Get embeddings
                embedding = get_gemini_embeddings(chunk)
                if embedding:
                    embedding_data = {
                        "document_id": doc_id,
                        "chunk_text": chunk,
                        "chunk_index": i,
                        "embedding": embedding
                    }
                    
                    embed_result = supabase.table("embeddings").insert(embedding_data).execute()
                    if embed_result.data:
                        embeddings_created += 1
                
                # Small delay to avoid rate limits
                time.sleep(0.1)
            
            # Update bot status
            supabase.table("bots").update({"status": "ready"}).eq("id", bot_id).execute()
            
            return {
                "message": "Website scraped and processed successfully",
                "bot_id": bot_id,
                "bot_name": bot_name,
                "url": url,
                "page_title": page_title,
                "text_length": len(text_content),
                "chunks_created": len(chunks),
                "embeddings_created": embeddings_created
            }
            
        except Exception as e:
            return {
                "error": f"Website processing error: {str(e)}",
                "details": str(type(e).__name__)
            }
    
    def process_uploaded_file(self, file_content, filename, bot_name):
        """Process uploaded file and store in database"""
        try:
            # Extract text based on file type
            text_content = None
            file_extension = filename.lower().split('.')[-1]
            
            if file_extension == 'pdf':
                text_content = extract_text_from_pdf(file_content)
            elif file_extension in ['docx', 'doc']:
                text_content = extract_text_from_docx(file_content)
            elif file_extension == 'txt':
                text_content = file_content.decode('utf-8')
            else:
                return {"error": f"Unsupported file type: {file_extension}"}
            
            if not text_content:
                return {"error": "Could not extract text from file"}
            
            # Generate bot name if not provided
            if not bot_name:
                bot_name = f"Bot from {filename}"
            
            # Get Supabase client
            supabase = get_supabase_client()
            if not supabase:
                return {"error": "Database connection failed"}
            
            # Store bot in database
            bot_data = {
                "name": bot_name,
                "type": "document",
                "source": filename,
                "status": "processing"
            }
            
            bot_result = supabase.table("bots").insert(bot_data).execute()
            if not bot_result.data:
                return {"error": "Failed to create bot"}
            
            bot_id = bot_result.data[0]["id"]
            
            # Store document
            doc_data = {
                "bot_id": bot_id,
                "content": text_content,
                "filename": filename,
                "file_type": file_extension
            }
            
            doc_result = supabase.table("documents").insert(doc_data).execute()
            if not doc_result.data:
                return {"error": "Failed to store document"}
            
            doc_id = doc_result.data[0]["id"]
            
            # Chunk text and create embeddings
            chunks = chunk_text(text_content)
            embeddings_created = 0
            
            for i, chunk in enumerate(chunks):
                # Get embeddings
                embedding = get_gemini_embeddings(chunk)
                if embedding:
                    embedding_data = {
                        "document_id": doc_id,
                        "chunk_text": chunk,
                        "chunk_index": i,
                        "embedding": embedding
                    }
                    
                    embed_result = supabase.table("embeddings").insert(embedding_data).execute()
                    if embed_result.data:
                        embeddings_created += 1
            
            # Update bot status
            supabase.table("bots").update({"status": "ready"}).eq("id", bot_id).execute()
            
            return {
                "message": "File uploaded and processed successfully",
                "bot_id": bot_id,
                "bot_name": bot_name,
                "filename": filename,
                "text_length": len(text_content),
                "chunks_created": len(chunks),
                "embeddings_created": embeddings_created
            }
            
        except Exception as e:
            return {
                "error": f"File processing error: {str(e)}",
                "details": str(type(e).__name__)
            }
    
    def do_OPTIONS(self):
        # Handle preflight requests
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', '*')
        self.end_headers() 