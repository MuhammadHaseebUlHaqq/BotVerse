# Botverse - Vercel Deployment Guide

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **GitHub Repository**: Push your code to GitHub
3. **Supabase Project**: Make sure your Supabase database is set up
4. **Google AI API Key**: Ensure you have your Gemini API key

## Deployment Steps

### 1. Environment Variables Setup

In your Vercel dashboard, add these environment variables:

**Backend Environment Variables:**
```
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_anon_key
GEMINI_API_KEY=your_gemini_api_key
ENVIRONMENT=production
```

**Frontend Environment Variables:**
```
VITE_API_URL=https://your-project-name.vercel.app/api
```

### 2. Update CORS Settings

After deployment, update the CORS origins in `backend/app/main.py`:

```python
allow_origins=["https://your-actual-domain.vercel.app"]
```

### 3. Deploy to Vercel

#### Option A: Connect GitHub Repository
1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Import your GitHub repository
4. Vercel will automatically detect the configuration

#### Option B: Vercel CLI
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy from your project root
vercel --prod
```

### 4. Database Verification

Ensure your Supabase tables are created:

```sql
-- Bots table
CREATE TABLE bots (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Documents table
CREATE TABLE documents (
    id TEXT PRIMARY KEY,
    bot_id TEXT REFERENCES bots(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Embeddings table
CREATE TABLE embeddings (
    id TEXT PRIMARY KEY,
    document_id TEXT REFERENCES documents(id) ON DELETE CASCADE,
    bot_id TEXT REFERENCES bots(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    chunk_text TEXT NOT NULL,
    embedding VECTOR(768),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Chat history table
CREATE TABLE chat_history (
    id TEXT PRIMARY KEY,
    bot_id TEXT REFERENCES bots(id) ON DELETE CASCADE,
    user_query TEXT NOT NULL,
    bot_response TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Embed tokens table
CREATE TABLE embed_tokens (
    id TEXT PRIMARY KEY,
    bot_id TEXT REFERENCES bots(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);
```

## Project Structure

```
your-project/
├── vercel.json                 # Main Vercel config
├── backend/
│   ├── vercel.json            # Backend-specific config
│   ├── requirements.txt       # Python dependencies
│   └── app/
│       └── main.py           # FastAPI app
└── frontend/
    ├── package.json          # Node.js dependencies
    ├── vite.config.js        # Vite configuration
    └── src/
        └── api/
            └── index.js      # API calls with environment-based URLs
```

## Testing Your Deployment

1. **Health Check**: Visit `https://your-domain.vercel.app/api/health`
2. **Frontend**: Visit `https://your-domain.vercel.app`
3. **API Endpoints**: Test all CRUD operations

## Troubleshooting

### Common Issues:

1. **CORS Errors**: Update the `allow_origins` in main.py with your actual domain
2. **Environment Variables**: Ensure all env vars are set in Vercel dashboard
3. **Build Errors**: Check the build logs in Vercel dashboard
4. **Cold Starts**: First API call may be slow due to serverless cold starts

### Performance Optimization:

1. **Function Regions**: Deploy to regions close to your users
2. **Caching**: Implement caching for frequently accessed data
3. **Database Connection**: Use connection pooling for better performance

## Security Considerations

1. **Environment Variables**: Never commit sensitive keys to git
2. **CORS**: Use specific origins in production, not "*"
3. **Rate Limiting**: Consider implementing rate limiting for API endpoints
4. **Authentication**: Ensure proper authentication for admin endpoints

## Monitoring

- **Vercel Analytics**: Monitor performance and usage
- **Logs**: Check function logs in Vercel dashboard
- **Error Tracking**: Consider integrating error tracking services

---

🎉 **Your Botverse application is now live on Vercel!**

Visit your deployment URL to test all functionality. 