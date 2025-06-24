import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchBots, sendChatMessage, fetchChatHistory, deleteBot, clearBotContent, uploadDocument, scrapeWebsite } from '../api';
import EmbedManager from '../components/EmbedManager';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [bots, setBots] = useState([]);
  const [selectedBot, setSelectedBot] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const [userMessage, setUserMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('chat');
  const [stats, setStats] = useState({
    totalBots: 0,
    totalChats: 0,
    activeToday: 0
  });
  
  // Update content states
  const [updateMode, setUpdateMode] = useState('');
  const [updateFile, setUpdateFile] = useState(null);
  const [updateUrl, setUpdateUrl] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchBots().then(data => {
      setBots(data);
      setStats(prev => ({
        ...prev,
        totalBots: data.length,
        totalChats: data.reduce((acc, bot) => acc + (bot.chat_count || 0), 0),
        activeToday: data.filter(bot => bot.last_used && isToday(bot.last_used)).length
      }));
    });
  }, []);

  const isToday = (dateString) => {
    const today = new Date();
    const date = new Date(dateString);
    return date.toDateString() === today.toDateString();
  };

  useEffect(() => {
    if (selectedBot) {
      fetchChatHistory(selectedBot)
        .then(data => {
          const transformedHistory = data.map(item => ({
            role: item.role,
            text: item.message,
            timestamp: new Date(item.created_at)
          }));
          setChatHistory(transformedHistory);
        })
        .catch(error => {
          console.log('No chat history found or error:', error);
          setChatHistory([]);
        });
    }
  }, [selectedBot]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!userMessage || !selectedBot) return;
    setLoading(true);
    setError('');
    try {
      const res = await sendChatMessage({ bot_id: selectedBot, user_query: userMessage });
      setChatHistory([...chatHistory, { role: 'user', text: userMessage }, { role: 'bot', text: res.answer }]);
      setUserMessage('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBot = async (botId, botName) => {
    if (!confirm(`Are you sure you want to delete "${botName}"? This action cannot be undone.`)) {
      return;
    }
    
    try {
      await deleteBot(botId);
      setBots(bots.filter(bot => bot.id !== botId));
      if (selectedBot === botId) {
        setSelectedBot(null);
        setChatHistory([]);
      }
      setError('');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleClearBotContent = async (botId, botName) => {
    if (!confirm(`Are you sure you want to clear all content from "${botName}"? The bot will remain but all documents and training data will be removed.`)) {
      return;
    }
    
    try {
      await clearBotContent(botId);
      const updatedBots = await fetchBots();
      setBots(updatedBots);
      setChatHistory([]);
      setError('');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUpdateContent = async (type) => {
    if (!selectedBot) {
      setError('Please select a bot first');
      return;
    }

    if (type === 'upload' && !updateFile) {
      setError('Please select a file to upload');
      return;
    }

    if (type === 'scrape' && !updateUrl) {
      setError('Please enter a URL to scrape');
      return;
    }

    setUpdating(true);
    setError('');

    try {
      if (type === 'upload') {
        const formData = new FormData();
        formData.append('file', updateFile);
        formData.append('bot_id', selectedBot);
        formData.append('replace_content', 'true');
        await uploadDocument(formData);
      } else if (type === 'scrape') {
        await scrapeWebsite({
          url: updateUrl,
          bot_id: selectedBot,
          replace_content: true
        });
      }

      const updatedBots = await fetchBots();
      setBots(updatedBots);
      setChatHistory([]);
      setUpdateMode('');
      setUpdateFile(null);
      setUpdateUrl('');
      
      setStats(prev => ({
        ...prev,
        totalBots: updatedBots.length,
        totalChats: updatedBots.reduce((acc, bot) => acc + (bot.chat_count || 0), 0),
        activeToday: updatedBots.filter(bot => bot.last_used && isToday(bot.last_used)).length
      }));

    } catch (err) {
      setError(err.message);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="py-8 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">Admin Dashboard</h1>
              <p className="text-gray-600">Welcome back, {user}! Manage your AI bots and monitor performance.</p>
            </div>
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-4 py-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-green-700 text-sm font-medium">System Online</span>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-8">
          <div className="bg-white border border-gray-200 rounded-xl p-6 hover:border-red-300 transition-all duration-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium mb-2">Total Bots</p>
                <p className="text-3xl font-bold text-gray-800">{stats.totalBots}</p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <div className="text-xl text-red-600 font-bold">B</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-xl p-6 hover:border-red-300 transition-all duration-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium mb-2">Total Chats</p>
                <p className="text-3xl font-bold text-gray-800">{stats.totalChats}</p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <div className="text-xl text-red-600 font-bold">C</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-xl p-6 hover:border-red-300 transition-all duration-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium mb-2">Active Today</p>
                <p className="text-3xl font-bold text-gray-800">{stats.activeToday}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <div className="text-xl text-green-600 font-bold">A</div>
              </div>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-center gap-3">
            <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
              <div className="w-2 h-2 bg-white rounded-full"></div>
            </div>
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pb-8">
          {/* Bots Management */}
          <div className="bg-white border border-gray-200 rounded-xl">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800">
                Bot Management
              </h2>
            </div>
            <div className="p-6">
              {bots.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                    <span className="text-2xl font-bold text-gray-400">B</span>
                  </div>
                  <p className="text-gray-600 mb-2">No bots created yet</p>
                  <p className="text-gray-500 text-sm">Create your first bot by uploading a document or scraping a website</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {bots.map(bot => (
                    <div key={bot.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-red-300 transition-all duration-200">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                          <span className="text-red-600 font-bold">B</span>
                        </div>
                        <div>
                          <p className="text-gray-800 font-medium">
                            {bot.name || `Bot #${bot.id.slice(0, 8)}`}
                          </p>
                          <p className="text-gray-600 text-sm">
                            {bot.document_count || 0} documents • {bot.chat_count || 0} chats
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => setSelectedBot(bot.id)} 
                          className={`px-3 py-2 rounded-lg font-medium transition-all text-sm ${
                            selectedBot === bot.id 
                              ? 'bg-red-600 text-white' 
                              : 'bg-gray-200 text-gray-700 hover:bg-red-600 hover:text-white'
                          }`}
                        >
                          {selectedBot === bot.id ? 'Selected' : 'Select'}
                        </button>
                        
                        <div className="relative group">
                          <button className="p-2 text-gray-600 hover:text-gray-800 transition-colors">
                            <span className="text-lg">⋮</span>
                          </button>
                          <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10 min-w-[180px]">
                            <div className="py-1">
                              <button
                                onClick={() => handleClearBotContent(bot.id, bot.name || `Bot #${bot.id.slice(0, 8)}`)}
                                className="w-full text-left px-4 py-2 text-sm text-yellow-600 hover:bg-gray-50 transition-colors"
                              >
                                Clear Content
                              </button>
                              <button
                                onClick={() => handleDeleteBot(bot.id, bot.name || `Bot #${bot.id.slice(0, 8)}`)}
                                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-50 transition-colors"
                              >
                                Delete Bot
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Interface Tabs */}
          <div className="bg-white border border-gray-200 rounded-xl">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-800">
                  {activeTab === 'chat' ? 'Bot Testing' : activeTab === 'embed' ? 'Embed Manager' : 'Content Updater'}
                  {selectedBot && (
                    <span className="text-sm text-gray-600 block mt-1">
                      {bots.find(b => b.id === selectedBot)?.name || `Bot #${selectedBot.slice(0, 8)}`}
                    </span>
                  )}
                </h2>
                
                {selectedBot && (
                  <div className="flex bg-gray-100 rounded-lg p-1 border border-gray-200">
                    <button
                      onClick={() => setActiveTab('chat')}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                        activeTab === 'chat'
                          ? 'bg-red-600 text-white'
                          : 'text-gray-600 hover:text-gray-800'
                      }`}
                    >
                      Chat
                    </button>
                    <button
                      onClick={() => setActiveTab('embed')}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                        activeTab === 'embed'
                          ? 'bg-red-600 text-white'
                          : 'text-gray-600 hover:text-gray-800'
                      }`}
                    >
                      Embed
                    </button>
                    <button
                      onClick={() => setActiveTab('update')}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                        activeTab === 'update'
                          ? 'bg-red-600 text-white'
                          : 'text-gray-600 hover:text-gray-800'
                      }`}
                    >
                      Update
                    </button>
                  </div>
                )}
              </div>
            </div>
            
            {!selectedBot ? (
              <div className="p-6 text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                  <div className="text-2xl text-gray-400">
                    {activeTab === 'chat' ? 'C' : activeTab === 'embed' ? 'E' : 'U'}
                  </div>
                </div>
                <p className="text-gray-600 mb-2">Select a bot to {activeTab === 'chat' ? 'start testing' : activeTab === 'embed' ? 'generate embed codes' : 'update content'}</p>
                <p className="text-gray-500 text-sm">Choose a bot from the left panel to {activeTab === 'chat' ? 'test its responses' : activeTab === 'embed' ? 'create embeddable widgets' : 'update its content'}</p>
              </div>
            ) : activeTab === 'chat' ? (
              <div className="flex flex-col h-96">
                {/* Chat Messages */}
                <div className="flex-1 p-4 overflow-y-auto space-y-3">
                  {chatHistory.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-600">No conversation history</p>
                      <p className="text-gray-500 text-sm">Start a conversation below</p>
                    </div>
                  ) : (
                    chatHistory.map((msg, idx) => (
                      <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] rounded-lg px-4 py-2 ${
                          msg.role === 'user' 
                            ? 'bg-red-600 text-white' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          <div className="text-sm font-medium mb-1">
                            {msg.role === 'user' ? 'Admin' : 'Bot'}
                          </div>
                          <div className="whitespace-pre-wrap">{msg.text}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Chat Input */}
                <div className="p-4 border-t border-gray-200">
                  <form onSubmit={handleSendMessage} className="flex gap-3">
                    <input
                      type="text"
                      value={userMessage}
                      onChange={e => setUserMessage(e.target.value)}
                      placeholder="Type your message..."
                      className="flex-1 px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all"
                      disabled={loading}
                    />
                    <button 
                      type="submit" 
                      className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl"
                      disabled={loading || !userMessage.trim()}
                    >
                      {loading ? (
                        <div className="loading-spinner h-4 w-4"></div>
                      ) : (
                        'Send'
                      )}
                    </button>
                  </form>
                </div>
              </div>
            ) : activeTab === 'embed' ? (
              <div className="p-6">
                <EmbedManager 
                  selectedBot={selectedBot} 
                  botName={bots.find(b => b.id === selectedBot)?.name || `Bot #${selectedBot.slice(0, 8)}`}
                />
              </div>
            ) : (
              // Update Content Tab
              <div className="p-6 space-y-6">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center mt-0.5">
                      <span className="text-white text-xs font-bold">!</span>
                    </div>
                    <div>
                      <h4 className="text-yellow-800 font-medium mb-1">Warning: Content Replacement</h4>
                      <p className="text-yellow-700 text-sm">This will replace ALL existing content for the selected bot. This action cannot be undone.</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="text-gray-800 font-medium mb-4">Update Method</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <button
                        onClick={() => setUpdateMode('upload')}
                        className={`p-4 border-2 rounded-lg text-left transition-all ${
                          updateMode === 'upload' 
                            ? 'border-red-500 bg-red-50' 
                            : 'border-gray-200 hover:border-red-300'
                        }`}
                      >
                        <div className="font-medium text-gray-800">Upload Document</div>
                        <div className="text-sm text-gray-600 mt-1">Replace with new document file</div>
                      </button>
                      
                      <button
                        onClick={() => setUpdateMode('scrape')}
                        className={`p-4 border-2 rounded-lg text-left transition-all ${
                          updateMode === 'scrape' 
                            ? 'border-red-500 bg-red-50' 
                            : 'border-gray-200 hover:border-red-300'
                        }`}
                      >
                        <div className="font-medium text-gray-800">Scrape Website</div>
                        <div className="text-sm text-gray-600 mt-1">Replace with website content</div>
                      </button>
                    </div>
                  </div>

                  {updateMode === 'upload' && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Select File
                        </label>
                        <input
                          type="file"
                          onChange={e => setUpdateFile(e.target.files[0])}
                          className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-800 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-red-600 file:text-white file:cursor-pointer hover:file:bg-red-700 transition-all"
                          accept=".pdf,.docx,.txt"
                        />
                      </div>
                      <button
                        onClick={() => handleUpdateContent('upload')}
                        disabled={updating || !updateFile}
                        className="w-full bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-3 shadow-lg hover:shadow-xl disabled:opacity-50"
                      >
                        {updating ? (
                          <>
                            <div className="loading-spinner h-4 w-4"></div>
                            Updating...
                          </>
                        ) : (
                          'Update Bot Content'
                        )}
                      </button>
                    </div>
                  )}

                  {updateMode === 'scrape' && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Website URL
                        </label>
                        <input
                          type="url"
                          value={updateUrl}
                          onChange={e => setUpdateUrl(e.target.value)}
                          placeholder="https://example.com"
                          className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all"
                        />
                      </div>
                      <button
                        onClick={() => handleUpdateContent('scrape')}
                        disabled={updating || !updateUrl}
                        className="w-full bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-3 shadow-lg hover:shadow-xl disabled:opacity-50"
                      >
                        {updating ? (
                          <>
                            <div className="loading-spinner h-4 w-4"></div>
                            Updating...
                          </>
                        ) : (
                          'Update Bot Content'
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 