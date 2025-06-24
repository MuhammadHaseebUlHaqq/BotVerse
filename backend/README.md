# Technoware Universal AI Bot Backend

## Setup Instructions

### 1. Clone the repository

```
git clone <your-repo-url>
cd technoware/backend
```

### 2. Set up environment variables

Create a `.env` file in the `backend` directory with the following:

```
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_service_role_key
GEMINI_API_KEY=your_gemini_api_key
```

### 3. Install dependencies

```
pip install -r requirements.txt
```

### 4. Run the FastAPI server

```
uvicorn app.main:app --reload
```

The API will be available at `http://localhost:8000`.

### 5. Health Check

Visit `http://localhost:8000/health` to verify the server is running. 