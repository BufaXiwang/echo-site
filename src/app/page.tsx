'use client';

import { useEffect, useState, useCallback } from 'react';

type RequestData = {
  id: string;
  timestamp: number;
  method: string;
  url: string;
  headers: Record<string, string>;
  body: unknown;
};

export default function Home() {
  const [requests, setRequests] = useState<RequestData[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<RequestData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [echoUrl, setEchoUrl] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [newRequestsCount, setNewRequestsCount] = useState(0);
  const [lastRequestCount, setLastRequestCount] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');

  // 初始化效果
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const { protocol, host } = window.location;
      setEchoUrl(`${protocol}//${host}/api/echo`);
    }
    
    // 初始加载数据
    const loadInitialData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/requests');
        if (!res.ok) {
          throw new Error('Failed to fetch requests');
        }
        const data = await res.json();
        setRequests(data);
        setLastRequestCount(data.length);
        setNewRequestsCount(0);
        if (data.length > 0 && !selectedRequest) {
          setSelectedRequest(data[0]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadInitialData();
  }, [selectedRequest]);

  // SSE 连接效果
  useEffect(() => {
    if (!autoRefresh) return;
    
    setConnectionStatus('connecting');
    const eventSource = new EventSource('/api/events');
    
    eventSource.onopen = () => {
      setConnectionStatus('connected');
    };
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'new-request') {
          // 有新请求时，重新获取所有请求
          fetchRequestsSilently();
          setNewRequestsCount(prev => prev + 1);
        }
      } catch (error) {
        console.error('Error parsing SSE message:', error);
      }
    };
    
    eventSource.onerror = () => {
      setConnectionStatus('disconnected');
    };
    
    return () => {
      eventSource.close();
      setConnectionStatus('disconnected');
    };
  }, [autoRefresh]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchRequests = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/requests');
      if (!res.ok) {
        throw new Error('Failed to fetch requests');
      }
      const data = await res.json();
      setRequests(data);
      setLastRequestCount(data.length);
      setNewRequestsCount(0); // 重置新请求计数
      if (data.length > 0 && !selectedRequest) {
        setSelectedRequest(data[0]);
      } else if (data.length === 0) {
        setSelectedRequest(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [selectedRequest]);

  // 静默获取请求（用于自动轮询，不显示加载状态）
  const fetchRequestsSilently = useCallback(async () => {
    try {
      const res = await fetch('/api/requests');
      if (!res.ok) return;
      
      const data = await res.json();
      
      // 检查是否有新请求
      if (data.length > lastRequestCount) {
        const newCount = data.length - lastRequestCount;
        setNewRequestsCount(prev => prev + newCount);
        setRequests(data);
        setLastRequestCount(data.length);
        
        // 如果当前没有选中的请求，自动选中最新的
        if (!selectedRequest && data.length > 0) {
          setSelectedRequest(data[0]);
        }
      }
    } catch (err) {
      // 静默失败，不显示错误
      console.error('Silent fetch failed:', err);
    }
  }, [lastRequestCount, selectedRequest]);

  const getPath = (url: string) => {
    try {
      return new URL(url).pathname;
    } catch {
      return url;
    }
  };

  const getBadgeColor = (method: string) => {
    switch (method.toUpperCase()) {
      case 'GET': return 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25';
      case 'POST': return 'bg-blue-500 text-white shadow-lg shadow-blue-500/25';
      case 'PUT': return 'bg-amber-500 text-white shadow-lg shadow-amber-500/25';
      case 'DELETE': return 'bg-red-500 text-white shadow-lg shadow-red-500/25';
      case 'PATCH': return 'bg-purple-500 text-white shadow-lg shadow-purple-500/25';
      case 'HEAD': return 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/25';
      case 'OPTIONS': return 'bg-pink-500 text-white shadow-lg shadow-pink-500/25';
      default: return 'bg-slate-500 text-white shadow-lg shadow-slate-500/25';
    }
  }

    return (
    <main className="flex h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* 左侧面板 */}
      <div className="w-1/3 bg-white/80 backdrop-blur-sm border-r border-slate-200/60 flex flex-col shadow-lg">
        {/* 头部区域 */}
        <div className="p-6 border-b border-slate-200/60 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold">Request Echo</h1>
              <p className="text-blue-100 text-sm">实时请求监控工具</p>
            </div>
          </div>
          
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 mb-4">
            <p className="text-xs text-blue-100 mb-1">发送请求到:</p>
            <p className="text-sm font-mono bg-black/20 px-2 py-1 rounded text-white break-all">{echoUrl}</p>
          </div>

          <div className="space-y-3">
            <button
              onClick={fetchRequests}
              disabled={isLoading}
              className="w-full bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white font-medium py-2.5 px-4 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>刷新中...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>手动刷新</span>
                </>
              )}
            </button>
            
            <div className="flex items-center justify-between">
              <label className="flex items-center text-sm text-blue-100 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="mr-2 w-4 h-4 text-blue-600 bg-white/20 border-white/30 rounded focus:ring-blue-500 focus:ring-2"
                />
                <span>实时更新</span>
                <div className={`ml-2 w-2 h-2 rounded-full transition-all duration-300 ${
                  connectionStatus === 'connected' ? 'bg-green-400 shadow-lg shadow-green-400/50' : 
                  connectionStatus === 'connecting' ? 'bg-yellow-400 shadow-lg shadow-yellow-400/50 animate-pulse' : 
                  'bg-red-400 shadow-lg shadow-red-400/50'
                }`}></div>
              </label>
              {newRequestsCount > 0 && (
                <div className="bg-green-500 text-white text-xs px-3 py-1 rounded-full font-medium animate-bounce shadow-lg">
                  +{newRequestsCount} 新请求
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 请求列表 */}
        <div className="flex-grow overflow-y-auto">
          {error && (
            <div className="p-4 bg-red-50 border-l-4 border-red-400 text-red-700">
              <div className="flex">
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            </div>
          )}
          {requests.length === 0 && !isLoading && (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 p-8">
              <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <p className="text-center">暂无请求记录<br/>发送请求到上面的地址开始监控</p>
            </div>
          )}
          {requests.map((req, index) => (
            <div
              key={req.id}
              onClick={() => setSelectedRequest(req)}
              className={`p-4 cursor-pointer border-b border-slate-100 transition-all duration-200 hover:bg-slate-50 ${
                selectedRequest?.id === req.id 
                  ? 'bg-gradient-to-r from-blue-50 to-purple-50 border-l-4 border-l-blue-500 shadow-sm' 
                  : 'hover:shadow-sm'
              }`}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`px-3 py-1 text-xs font-bold rounded-full shadow-sm ${getBadgeColor(req.method)}`}>
                  {req.method}
                </span>
                <span className="text-xs text-slate-500 font-mono">
                  {new Date(req.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <p className="text-sm text-slate-700 font-medium truncate">{getPath(req.url)}</p>
              <p className="text-xs text-slate-500 mt-1">ID: {req.id.slice(0, 8)}...</p>
            </div>
          ))}
        </div>
      </div>

      {/* 右侧面板 */}
      <div className="w-2/3 flex flex-col bg-white/50 backdrop-blur-sm">
        {selectedRequest ? (
          <div className="flex-grow overflow-y-auto">
            {/* 详情头部 */}
            <div className="sticky top-0 bg-white/90 backdrop-blur-sm border-b border-slate-200/60 p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-slate-800 mb-1">请求详情</h2>
                  <p className="text-slate-500">查看完整的请求信息</p>
                </div>
                <div className="flex items-center space-x-3">
                  <span className={`px-3 py-1 text-sm font-bold rounded-full ${getBadgeColor(selectedRequest.method)}`}>
                    {selectedRequest.method}
                  </span>
                  <span className="text-sm text-slate-500 font-mono">
                    {new Date(selectedRequest.timestamp).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* 详情内容 */}
            <div className="p-6 space-y-6">
              {/* 基本信息 */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 overflow-hidden">
                <div className="bg-gradient-to-r from-slate-50 to-blue-50 px-6 py-4 border-b border-slate-200/60">
                  <h3 className="text-lg font-semibold text-slate-800 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    基本信息
                  </h3>
                </div>
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-slate-600">请求ID</label>
                      <p className="mt-1 font-mono text-sm bg-slate-50 px-3 py-2 rounded-lg">{selectedRequest.id}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-600">时间戳</label>
                      <p className="mt-1 font-mono text-sm bg-slate-50 px-3 py-2 rounded-lg">
                        {new Date(selectedRequest.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-600">完整URL</label>
                    <p className="mt-1 font-mono text-sm bg-slate-50 px-3 py-2 rounded-lg break-all">
                      {selectedRequest.url}
                    </p>
                  </div>
                </div>
              </div>

              {/* 请求头 */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 overflow-hidden">
                <div className="bg-gradient-to-r from-slate-50 to-green-50 px-6 py-4 border-b border-slate-200/60">
                  <h3 className="text-lg font-semibold text-slate-800 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    请求头
                  </h3>
                </div>
                <div className="p-6">
                  <div className="bg-slate-50 rounded-lg p-4 font-mono text-sm overflow-x-auto">
                    <pre className="text-slate-700">
                      {JSON.stringify(selectedRequest.headers, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>

              {/* 请求体 */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 overflow-hidden">
                <div className="bg-gradient-to-r from-slate-50 to-purple-50 px-6 py-4 border-b border-slate-200/60">
                  <h3 className="text-lg font-semibold text-slate-800 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                    </svg>
                    请求体
                  </h3>
                </div>
                <div className="p-6">
                  <div className="bg-slate-50 rounded-lg p-4 font-mono text-sm overflow-x-auto">
                    <pre className="text-slate-700">
                      {typeof selectedRequest.body === 'object' && selectedRequest.body !== null
                        ? JSON.stringify(selectedRequest.body, null, 2)
                        : String(selectedRequest.body || '(空)')}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <svg className="w-24 h-24 mx-auto text-slate-300 mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
              </svg>
              <h3 className="text-xl font-semibold text-slate-600 mb-2">选择一个请求</h3>
              <p className="text-slate-400">点击左侧列表中的任意请求查看详细信息</p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
