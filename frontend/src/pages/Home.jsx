import { useState, useRef, useEffect } from 'react';
import { uploadDocument, scrapeWebsite, sendChatMessage } from '../api';

export default function Home() {
  const [mode, setMode] = useState('upload');
  const [file, setFile] = useState(null);
  const [url, setUrl] = useState('');
  const [botName, setBotName] = useState('');
  const [chatBotId, setChatBotId] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const [userMessage, setUserMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const [scraping, setScraping] = useState(false);
  const [chatting, setChatting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [streamingMessage, setStreamingMessage] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const chatContainerRef = useRef(null);
  const textareaRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory, streamingMessage]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  }, [userMessage]);

  // Simulate streaming effect for the response
  const simulateStreaming = (text) => {
    setIsStreaming(true);
    setStreamingMessage('');
    
    const words = text.split(' ');
    let currentIndex = 0;
    
    const interval = setInterval(() => {
      if (currentIndex < words.length) {
        setStreamingMessage(prev => prev + (prev ? ' ' : '') + words[currentIndex]);
        currentIndex++;
      } else {
        clearInterval(interval);
        setIsStreaming(false);
        setStreamingMessage('');
        setChatHistory(prev => [
          ...prev.slice(0, -1),
          { role: 'user', text: userMessage, timestamp: new Date() },
          { role: 'bot', text: text, timestamp: new Date() }
        ]);
      }
    }, 50);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;
    
    await clearCurrentChat();
    
    setUploading(true);
    setError('');
    setResult(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (botName.trim()) {
        formData.append('bot_name', botName.trim());
      }
      const res = await uploadDocument(formData);
      setChatBotId(res.bot_id || res.id);
      setChatHistory([]);
      setResult(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleScrape = async (e) => {
    e.preventDefault();
    if (!url) return;
    
    await clearCurrentChat();
    
    setScraping(true);
    setError('');
    setResult(null);
    try {
      const requestData = { url };
      if (botName.trim()) {
        requestData.bot_name = botName.trim();
      }
      const res = await scrapeWebsite(requestData);
      setChatBotId(res.bot_id || res.id);
      setChatHistory([]);
      setResult(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setScraping(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!userMessage.trim() || !chatBotId || chatting) return;
    
    const currentMessage = userMessage.trim();
    setUserMessage('');
    setChatting(true);
    setError('');
    
    setChatHistory(prev => [...prev, { role: 'user', text: currentMessage, timestamp: new Date() }]);
    
    try {
      const res = await sendChatMessage({ bot_id: chatBotId, user_query: currentMessage });
      simulateStreaming(res.answer);
    } catch (err) {
      setError(err.message);
      setChatHistory(prev => prev.slice(0, -1));
    } finally {
      setChatting(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const clearCurrentChat = async () => {
    setChatBotId(null);
    setChatHistory([]);
    setUserMessage('');
    setResult(null);
    setError('');
    setFile(null);
    setUrl('');
    setBotName('');
  };

  const handleModeSwitch = async (newMode) => {
    if (newMode !== mode) {
      if (chatBotId && chatHistory.length > 0) {
        await clearCurrentChat();
        setResult({ message: "Previous conversation saved. Starting fresh!" });
        setTimeout(() => {
          setResult(null);
        }, 3000);
      }
      setMode(newMode);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-20 text-center">
            <div className="mb-12">
              <h1 className="text-6xl font-bold mb-6 text-gray-800">
                Botverse
              </h1>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
                Transform your documents and websites into intelligent AI assistants. 
                Upload files or scrape web content to create powerful chatbots instantly.
              </p>
            </div>
            
            {/* Mode Selector */}
            <div className="inline-flex bg-gray-100 rounded-xl p-1 border border-gray-200 mb-10">
              <button 
                onClick={() => handleModeSwitch('upload')} 
                className={`px-8 py-3 rounded-lg text-base font-medium transition-all duration-200 relative ${
                  mode === 'upload' 
                    ? 'bg-white text-gray-800 shadow-sm border border-gray-200' 
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Upload Document
                {mode !== 'upload' && chatBotId && chatHistory.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-500 rounded-full animate-pulse"></span>
                )}
              </button>
              <button 
                onClick={() => handleModeSwitch('scrape')} 
                className={`px-8 py-3 rounded-lg text-base font-medium transition-all duration-200 relative ${
                  mode === 'scrape' 
                    ? 'bg-white text-gray-800 shadow-sm border border-gray-200' 
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Scrape Website
                {mode !== 'scrape' && chatBotId && chatHistory.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-500 rounded-full animate-pulse"></span>
                )}
              </button>
            </div>

            {/* Upload/Scrape Forms */}
            <div className="max-w-lg mx-auto">
              {mode === 'upload' ? (
                <form onSubmit={handleUpload} className="space-y-6">
                  <div>
                    <input 
                      type="text" 
                      value={botName}
                      onChange={e => setBotName(e.target.value)} 
                      placeholder="Bot name (optional)"
                      className="w-full px-4 py-4 bg-white border border-gray-300 rounded-xl text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all text-lg"
                    />
                  </div>
                  <div>
                    <input 
                      type="file" 
                      onChange={e => setFile(e.target.files[0])} 
                      className="w-full px-4 py-4 bg-white border border-gray-300 rounded-xl text-gray-800 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-red-600 file:text-white file:cursor-pointer hover:file:bg-red-700 transition-all text-lg"
                      accept=".pdf,.docx,.txt"
                    />
                  </div>
                  <button 
                    type="submit" 
                    className="w-full bg-red-600 hover:bg-red-700 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-200 flex items-center justify-center gap-3 shadow-lg hover:shadow-xl"
                    disabled={uploading || !file}
                  >
                    {uploading ? (
                      <>
                        <div className="loading-spinner h-5 w-5"></div>
                        Processing...
                      </>
                    ) : (
                      'Upload Document'
                    )}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleScrape} className="space-y-6">
                  <div>
                    <input 
                      type="text" 
                      value={botName}
                      onChange={e => setBotName(e.target.value)} 
                      placeholder="Bot name (optional)"
                      className="w-full px-4 py-4 bg-white border border-gray-300 rounded-xl text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all text-lg"
                    />
                  </div>
                  <div>
                    <input 
                      type="url" 
                      value={url} 
                      onChange={e => setUrl(e.target.value)} 
                      placeholder="https://example.com" 
                      className="w-full px-4 py-4 bg-white border border-gray-300 rounded-xl text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all text-lg"
                      required 
                    />
                  </div>
                  <button 
                    type="submit" 
                    className="w-full bg-red-600 hover:bg-red-700 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-200 flex items-center justify-center gap-3 shadow-lg hover:shadow-xl"
                    disabled={scraping || !url}
                  >
                    {scraping ? (
                      <>
                        <div className="loading-spinner h-5 w-5"></div>
                        Scraping...
                      </>
                    ) : (
                      'Scrape Website'
                    )}
                  </button>
                </form>
              )}
            </div>

            {/* Success/Error Messages */}
            {result && (
              <div className="mt-8 max-w-lg mx-auto p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 flex items-center gap-3">
                <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
                <span className="text-sm font-medium">
                  {result.message || "Content processed successfully! You can now chat below."}
                </span>
              </div>
            )}
            {error && (
              <div className="mt-8 max-w-lg mx-auto p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-center gap-3">
                <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
                <span className="text-sm font-medium">{error}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Chat Section */}
      {chatBotId && (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
            {/* Chat Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
                <h3 className="text-lg font-semibold text-gray-800">AI Assistant</h3>
              </div>
              <span className="text-xs text-gray-500 font-medium">
                {chatHistory.length} message{chatHistory.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Chat Messages */}
            <div 
              ref={chatContainerRef}
              className="h-96 overflow-y-auto p-6 space-y-4"
            >
              {chatHistory.length === 0 && !isStreaming && (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
                    <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-bold">AI</span>
                    </div>
                  </div>
                  <p className="text-gray-600 text-lg mb-2">Ready to help!</p>
                  <p className="text-gray-500 text-sm">Ask me anything about your uploaded content</p>
                </div>
              )}
              
              {chatHistory.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] ${msg.role === 'user' ? 'order-2' : 'order-1'}`}>
                    <div className={`rounded-2xl px-4 py-3 ${
                      msg.role === 'user' 
                        ? 'bg-red-600 text-white' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      <div className="whitespace-pre-wrap break-words">{msg.text}</div>
                    </div>
                    <div className={`text-xs text-gray-500 mt-1 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                      {formatTime(msg.timestamp)}
                    </div>
                  </div>
                </div>
              ))}

              {/* Streaming Message */}
              {isStreaming && (
                <div className="flex justify-start">
                  <div className="max-w-[80%]">
                    <div className="rounded-2xl px-4 py-3 bg-gray-100 text-gray-800">
                      <div className="whitespace-pre-wrap break-words">{streamingMessage}</div>
                      <div className="inline-block w-2 h-4 bg-current animate-pulse ml-1"></div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Chat Input */}
            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <form onSubmit={handleSendMessage} className="flex gap-3">
                <textarea
                  ref={textareaRef}
                  value={userMessage}
                  onChange={e => setUserMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your message here..."
                  className="flex-1 px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all resize-none"
                  rows="1"
                  disabled={chatting || isStreaming}
                />
                <button 
                  type="submit" 
                  className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl"
                  disabled={chatting || isStreaming || !userMessage.trim()}
                >
                  {chatting ? (
                    <div className="loading-spinner h-4 w-4"></div>
                  ) : (
                    'Send'
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 