import json
import os
from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

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
                "version": "1.0.6"
            }
        elif path == '/api/test':
            response = {
                "message": "Test endpoint working",
                "supabase_url": "set" if os.getenv("SUPABASE_URL") else "missing",
                "gemini_api": "set" if os.getenv("GEMINI_API_KEY") else "missing"
            }
        elif path == '/api/bots':
            response = {
                "message": "Bots endpoint working",
                "bots": []
            }
        else:
            response = {
                "message": "Botverse API is running",
                "version": "1.0.6",
                "path": path
            }
        
        # Send response
        self.wfile.write(json.dumps(response).encode())
    
    def do_POST(self):
        # Handle POST requests
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', '*')
        self.end_headers()
        
        parsed_path = urlparse(self.path)
        path = parsed_path.path
        
        if path == '/api/upload':
            response = {
                "message": "Upload endpoint reachable",
                "status": "test"
            }
        else:
            response = {
                "message": "POST endpoint working",
                "path": path
            }
        
        self.wfile.write(json.dumps(response).encode())
    
    def do_OPTIONS(self):
        # Handle preflight requests
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', '*')
        self.end_headers() 