'use client';

import { useEffect, useState } from 'react';

type RequestData = {
  id: string;
  timestamp: number;
  method: string;
  url: string;
  headers: Record<string, string>;
  body: any;
};

export default function Home() {
  const [requests, setRequests] = useState<RequestData[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<RequestData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [echoUrl, setEchoUrl] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const { protocol, host } = window.location;
      setEchoUrl(`${protocol}//${host}/api/echo`);
    }
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/requests');
      if (!res.ok) {
        throw new Error('Failed to fetch requests');
      }
      const data = await res.json();
      setRequests(data);
      if (data.length > 0 && !selectedRequest) {
        setSelectedRequest(data[0]);
      } else if (data.length === 0) {
        setSelectedRequest(null);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const getPath = (url: string) => {
    try {
      return new URL(url).pathname;
    } catch {
      return url;
    }
  };

  const getBadgeColor = (method: string) => {
    switch (method.toUpperCase()) {
      case 'GET': return 'bg-green-100 text-green-800';
      case 'POST': return 'bg-blue-100 text-blue-800';
      case 'PUT': return 'bg-yellow-100 text-yellow-800';
      case 'DELETE': return 'bg-red-100 text-red-800';
      case 'PATCH': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  return (
    <main className="flex h-screen bg-gray-50 font-sans">
      <div className="w-1/3 border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h1 className="text-xl font-bold">Request Echo</h1>
          <div className="mt-2">
            <p className="text-sm text-gray-600">Your personal request bin.</p>
            <div className="mt-2 p-2 bg-gray-100 rounded">
              <p className="text-xs text-gray-700 break-all">Send requests to: <strong>{echoUrl}</strong></p>
            </div>
          </div>
          <button
            onClick={fetchRequests}
            disabled={isLoading}
            className="mt-4 w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded disabled:bg-blue-300"
          >
            {isLoading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
        <div className="flex-grow overflow-y-auto">
          {error && <p className="p-4 text-red-500">{error}</p>}
          {requests.map((req) => (
            <div
              key={req.id}
              onClick={() => setSelectedRequest(req)}
              className={`p-4 cursor-pointer border-b border-gray-200 ${selectedRequest?.id === req.id ? 'bg-blue-50' : 'hover:bg-gray-100'}`}
            >
              <div className="flex items-center justify-between">
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getBadgeColor(req.method)}`}>
                  {req.method}
                </span>
                <span className="text-xs text-gray-500">{new Date(req.timestamp).toLocaleTimeString()}</span>
              </div>
              <p className="text-sm text-gray-800 mt-1 truncate">{getPath(req.url)}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="w-2/3 flex flex-col">
        {selectedRequest ? (
          <div className="flex-grow overflow-y-auto p-6">
            <h2 className="text-2xl font-bold mb-4">Request Details</h2>
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">General</h3>
                <div className="bg-white p-4 rounded-lg shadow">
                  <p><strong>ID:</strong> {selectedRequest.id}</p>
                  <p><strong>Timestamp:</strong> {new Date(selectedRequest.timestamp).toLocaleString()}</p>
                  <p><strong>Method:</strong> {selectedRequest.method}</p>
                  <p><strong>URL:</strong> <span className="break-all">{selectedRequest.url}</span></p>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Headers</h3>
                <div className="bg-white p-4 rounded-lg shadow">
                  <pre className="text-sm overflow-x-auto"><code>{JSON.stringify(selectedRequest.headers, null, 2)}</code></pre>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Body</h3>
                <div className="bg-white p-4 rounded-lg shadow">
                  <pre className="text-sm overflow-x-auto">
                    <code>
                      {typeof selectedRequest.body === 'object' && selectedRequest.body !== null
                        ? JSON.stringify(selectedRequest.body, null, 2)
                        : selectedRequest.body}
                    </code>
                  </pre>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            <p>Select a request to see details</p>
          </div>
        )}
      </div>
    </main>
  );
}
