import { useState, useEffect } from 'react';
import { generateEmbedCode, getEmbedTokens, revokeEmbedToken } from '../api';

export default function EmbedManager({ selectedBot, botName }) {
  const [embedData, setEmbedData] = useState(null);
  const [embedTokens, setEmbedTokens] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('iframe');
  const [copySuccess, setCopySuccess] = useState('');
  const [expandedToken, setExpandedToken] = useState(null);
  const [expandedTab, setExpandedTab] = useState('iframe');

  // Load existing embed tokens when bot is selected
  useEffect(() => {
    if (selectedBot) {
      loadEmbedTokens();
    }
  }, [selectedBot]);

  const loadEmbedTokens = async () => {
    try {
      const tokens = await getEmbedTokens(selectedBot);
      setEmbedTokens(tokens);
    } catch (err) {
      console.error('Failed to load embed tokens:', err);
    }
  };

  const handleGenerateEmbed = async () => {
    if (!selectedBot) return;
    
    setLoading(true);
    setError('');
    try {
      const result = await generateEmbedCode(selectedBot);
      setEmbedData(result);
      await loadEmbedTokens(); // Refresh the tokens list
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeToken = async (embedToken) => {
    try {
      await revokeEmbedToken(embedToken);
      await loadEmbedTokens(); // Refresh the tokens list
      if (embedData && embedData.embed_token === embedToken) {
        setEmbedData(null); // Clear the current embed data if it was revoked
      }
      if (expandedToken === embedToken) {
        setExpandedToken(null); // Collapse if expanded token was revoked
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const copyToClipboard = async (text, type) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(`${type} copied!`);
      setTimeout(() => setCopySuccess(''), 2000);
    } catch (err) {
      setError('Failed to copy to clipboard');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const generateEmbedCodesForToken = (embedToken) => {
    const baseUrl = window.location.origin;
    const widgetUrl = `${baseUrl}/embed/widget/${embedToken}`;
    
    const iframeCode = `<iframe src="${widgetUrl}" width="400" height="600" frameborder="0" style="border-radius: 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);"></iframe>`;
    
    const jsCode = `<div id="botverse-chat-widget"></div>
<script>
  (function() {
    var widget = document.createElement('iframe');
    widget.src = '${widgetUrl}';
    widget.width = '400';
    widget.height = '600';
    widget.frameBorder = '0';
    widget.style.borderRadius = '10px';
    widget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
    widget.style.position = 'fixed';
    widget.style.bottom = '20px';
    widget.style.right = '20px';
    widget.style.zIndex = '9999';
    document.getElementById('botverse-chat-widget').appendChild(widget);
  })();
</script>`;

    return {
      iframe_code: iframeCode,
      js_code: jsCode,
      widget_url: widgetUrl
    };
  };

  const toggleTokenExpansion = (embedToken) => {
    if (expandedToken === embedToken) {
      setExpandedToken(null);
    } else {
      setExpandedToken(embedToken);
      setExpandedTab('iframe'); // Reset to iframe tab when expanding
    }
  };

  if (!selectedBot) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
          <div className="text-2xl text-gray-400 font-bold">E</div>
        </div>
        <p className="text-gray-600 mb-2">Select a bot to generate embed codes</p>
        <p className="text-gray-500 text-sm">Choose a bot from the left panel to create embeddable widgets</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">Embed Widget Generator</h3>
          <p className="text-gray-600 text-sm">Generate embed codes for {botName}</p>
        </div>
        <button
          onClick={handleGenerateEmbed}
          disabled={loading}
          className="bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
        >
          {loading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
          ) : (
            <span>+</span>
          )}
          Generate New Embed
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      )}

      {copySuccess && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-700">
          {copySuccess}
        </div>
      )}

      {/* Embed Code Display for New Token */}
      {embedData && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-4 h-4 bg-green-500 rounded-full"></div>
            <h4 className="text-gray-800 font-medium">New Embed Code Generated</h4>
          </div>
          
          {/* Tab Navigation */}
          <div className="flex bg-gray-100 rounded-lg p-1 mb-4">
            <button
              onClick={() => setActiveTab('iframe')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                activeTab === 'iframe'
                  ? 'bg-red-600 text-white'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              iFrame Embed
            </button>
            <button
              onClick={() => setActiveTab('javascript')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                activeTab === 'javascript'
                  ? 'bg-red-600 text-white'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              JavaScript Widget
            </button>
          </div>

          {/* Code Display */}
          <div className="space-y-4">
            {activeTab === 'iframe' && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-gray-600 text-sm">iFrame Embed Code</label>
                  <button
                    onClick={() => copyToClipboard(embedData.iframe_code, 'iFrame code')}
                    className="text-red-600 hover:text-red-700 text-sm flex items-center gap-1"
                  >
                    Copy
                  </button>
                </div>
                <textarea
                  readOnly
                  value={embedData.iframe_code}
                  className="w-full h-32 bg-white border border-gray-300 rounded-lg p-3 text-gray-800 text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
            )}

            {activeTab === 'javascript' && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-gray-600 text-sm">JavaScript Widget Code</label>
                  <button
                    onClick={() => copyToClipboard(embedData.js_code, 'JavaScript code')}
                    className="text-red-600 hover:text-red-700 text-sm flex items-center gap-1"
                  >
                    Copy
                  </button>
                </div>
                <textarea
                  readOnly
                  value={embedData.js_code}
                  className="w-full h-40 bg-white border border-gray-300 rounded-lg p-3 text-gray-800 text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
            )}

            {/* Widget URL */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-gray-600 text-sm">Direct Widget URL</label>
                <button
                  onClick={() => copyToClipboard(embedData.widget_url, 'Widget URL')}
                  className="text-red-600 hover:text-red-700 text-sm flex items-center gap-1"
                >
                  Copy
                </button>
              </div>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={embedData.widget_url}
                  className="flex-1 bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                <a
                  href={embedData.widget_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-gray-200 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-300 transition-colors flex items-center gap-1"
                >
                  Preview
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Existing Embed Tokens */}
      {embedTokens.length > 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
          <h4 className="text-gray-800 font-medium mb-4 flex items-center gap-2">
            Existing Embed Tokens
            <span className="text-gray-600 text-sm">({embedTokens.length})</span>
          </h4>
          
          <div className="space-y-3">
            {embedTokens.map((token) => {
              const tokenEmbedData = generateEmbedCodesForToken(token.embed_token);
              const isExpanded = expandedToken === token.embed_token;
              
              return (
                <div
                  key={token.embed_token}
                  className="bg-white rounded-lg border border-gray-200"
                >
                  {/* Token Header */}
                  <div className="flex items-center justify-between p-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <code className="text-red-600 text-sm font-mono">
                          {token.embed_token.slice(0, 16)}...
                        </code>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          token.is_active 
                            ? 'bg-green-100 text-green-700 border border-green-200'
                            : 'bg-red-100 text-red-700 border border-red-200'
                        }`}>
                          {token.is_active ? 'Active' : 'Revoked'}
                        </span>
                      </div>
                      <p className="text-gray-600 text-sm">
                        Created: {formatDate(token.created_at)}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {token.is_active && (
                        <>
                          <button
                            onClick={() => toggleTokenExpansion(token.embed_token)}
                            className="text-gray-600 hover:text-gray-800 text-sm px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            {isExpanded ? 'Hide Code' : 'View Code'}
                          </button>
                          <button
                            onClick={() => handleRevokeToken(token.embed_token)}
                            className="text-red-600 hover:text-red-700 text-sm px-3 py-1 border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
                          >
                            Revoke
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Expanded Code Section */}
                  {isExpanded && token.is_active && (
                    <div className="border-t border-gray-200 p-4">
                      {/* Tab Navigation for Existing Token */}
                      <div className="flex bg-gray-100 rounded-lg p-1 mb-4">
                        <button
                          onClick={() => setExpandedTab('iframe')}
                          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                            expandedTab === 'iframe'
                              ? 'bg-red-600 text-white'
                              : 'text-gray-600 hover:text-gray-800'
                          }`}
                        >
                          iFrame Embed
                        </button>
                        <button
                          onClick={() => setExpandedTab('javascript')}
                          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                            expandedTab === 'javascript'
                              ? 'bg-red-600 text-white'
                              : 'text-gray-600 hover:text-gray-800'
                          }`}
                        >
                          JavaScript Widget
                        </button>
                      </div>

                      {/* Code Display for Existing Token */}
                      <div className="space-y-4">
                        {expandedTab === 'iframe' && (
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <label className="text-gray-600 text-sm">iFrame Embed Code</label>
                              <button
                                onClick={() => copyToClipboard(tokenEmbedData.iframe_code, 'iFrame code')}
                                className="text-red-600 hover:text-red-700 text-sm flex items-center gap-1"
                              >
                                Copy
                              </button>
                            </div>
                            <textarea
                              readOnly
                              value={tokenEmbedData.iframe_code}
                              className="w-full h-32 bg-gray-50 border border-gray-300 rounded-lg p-3 text-gray-800 text-sm font-mono resize-none focus:outline-none"
                            />
                          </div>
                        )}

                        {expandedTab === 'javascript' && (
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <label className="text-gray-600 text-sm">JavaScript Widget Code</label>
                              <button
                                onClick={() => copyToClipboard(tokenEmbedData.js_code, 'JavaScript code')}
                                className="text-red-600 hover:text-red-700 text-sm flex items-center gap-1"
                              >
                                Copy
                              </button>
                            </div>
                            <textarea
                              readOnly
                              value={tokenEmbedData.js_code}
                              className="w-full h-40 bg-gray-50 border border-gray-300 rounded-lg p-3 text-gray-800 text-sm font-mono resize-none focus:outline-none"
                            />
                          </div>
                        )}

                        {/* Widget URL for Existing Token */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-gray-600 text-sm">Direct Widget URL</label>
                            <button
                              onClick={() => copyToClipboard(tokenEmbedData.widget_url, 'Widget URL')}
                              className="text-red-600 hover:text-red-700 text-sm flex items-center gap-1"
                            >
                              Copy
                            </button>
                          </div>
                          <div className="flex gap-2">
                            <input
                              readOnly
                              value={tokenEmbedData.widget_url}
                              className="flex-1 bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-gray-800 text-sm focus:outline-none"
                            />
                            <a
                              href={tokenEmbedData.widget_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="bg-gray-200 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-300 transition-colors flex items-center gap-1"
                            >
                              Preview
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
} 