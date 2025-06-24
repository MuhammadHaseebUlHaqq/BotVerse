import { useState } from 'react';
import { sendChatMessage } from '../api';

export default function Chat() {
  const [message, setMessage] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSend = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResponse('');
    try {
      const res = await sendChatMessage(message);
      setResponse(res.answer || JSON.stringify(res));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-800 mb-4">Chat with Botverse</h2>
          <p className="text-xl text-gray-600">Ask questions and get intelligent responses from your AI assistant</p>
        </div>
        
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
          <div className="p-8">
            <form onSubmit={handleSend} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Question
                </label>
                <input
                  type="text"
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Ask a question..."
                  className="w-full px-4 py-4 bg-white border border-gray-300 rounded-xl text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all text-lg"
                  required
                />
              </div>
              
              <button 
                type="submit" 
                className="w-full bg-red-600 hover:bg-red-700 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-200 flex items-center justify-center gap-3 shadow-lg hover:shadow-xl"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="loading-spinner h-5 w-5"></div>
                    Processing...
                  </>
                ) : (
                  'Send Message'
                )}
              </button>
            </form>

            {/* Response Section */}
            {response && (
              <div className="mt-8 p-6 bg-green-50 border border-green-200 rounded-xl">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-white text-sm font-bold">AI</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-green-800 font-medium mb-2">Response:</h4>
                    <p className="text-green-700 whitespace-pre-wrap break-words">{response}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Error Section */}
            {error && (
              <div className="mt-8 p-6 bg-red-50 border border-red-200 rounded-xl">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-white text-sm font-bold">!</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-red-800 font-medium mb-2">Error:</h4>
                    <p className="text-red-700">{error}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 