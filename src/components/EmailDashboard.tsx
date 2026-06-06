'use client';

import { useState, useEffect } from 'react';
import { Mail, Inbox, Send, RefreshCw, CheckCircle, XCircle, Clock, AlertTriangle, ChevronDown, ChevronUp, Filter, ArrowRight } from 'lucide-react';

export interface Email {
  id: string;
  direction: 'inbound' | 'outbound';
  channel: string;
  fromAddress: string | null;
  toAddress: string | null;
  subject: string | null;
  status: string;
  body: string | null;
  projectId: string | null;
  provider: string | null;
  errorMessage: string | null;
  createdAt: string;
  sentAt: string | null;
}

interface EmailStats {
  total: number;
  inbound: number;
  outbound: number;
  sent: number;
  failed: number;
  delivered: number;
}

interface EmailDashboardProps {
  initialEmails: Email[];
}

export function EmailDashboard({ initialEmails }: EmailDashboardProps) {
  const [emails, setEmails] = useState<Email[]>(initialEmails);
  const [stats, setStats] = useState<EmailStats>({
    total: 0,
    inbound: 0,
    outbound: 0,
    sent: 0,
    failed: 0,
    delivered: 0,
  });
  const [filter, setFilter] = useState<'all' | 'inbound' | 'outbound'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchEmails = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/emails?limit=50');
      const data = await res.json();
      if (data.success) {
        setEmails(data.emails);
        setStats(data.stats);
      }
    } catch (err) {
      console.error('Failed to fetch emails:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialEmails.length === 0) {
      fetchEmails();
    }
  }, []);

  const filteredEmails = filter === 'all' 
    ? emails 
    : emails.filter(e => e.direction === filter);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'delivered': return <CheckCircle className="w-4 h-4 text-blue-500" />;
      case 'failed': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'queued': return <Clock className="w-4 h-4 text-yellow-500" />;
      default: return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      received: 'bg-gray-100 text-gray-700',
      sent: 'bg-green-100 text-green-700',
      delivered: 'bg-blue-100 text-blue-700',
      failed: 'bg-red-100 text-red-700',
      queued: 'bg-yellow-100 text-yellow-700',
    };
    return styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Mail className="w-4 h-4 text-blue-500" />
            <span className="text-sm text-gray-500">Total</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.total || 0}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Inbox className="w-4 h-4 text-green-500" />
            <span className="text-sm text-gray-500">Inbound</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.inbound || 0}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Send className="w-4 h-4 text-blue-500" />
            <span className="text-sm text-gray-500">Outbound</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.outbound || 0}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span className="text-sm text-gray-500">Sent</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.sent || 0}</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <div className="flex gap-1">
            {(['all', 'inbound', 'outbound'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  filter === f
                    ? 'bg-blue-100 text-blue-700 border border-blue-200'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={fetchEmails}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Email List */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="divide-y divide-gray-100">
          {filteredEmails.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Mail className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p>No emails yet</p>
            </div>
          ) : (
            filteredEmails.map((email) => (
              <div key={email.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="mt-1">
                    {email.direction === 'inbound' ? (
                      <Inbox className="w-5 h-5 text-green-500" />
                    ) : (
                      <Send className="w-5 h-5 text-blue-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${getStatusBadge(email.status)}`}>
                        {email.status}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(email.createdAt).toLocaleString()}
                      </span>
                      {email.channel !== 'email' && (
                        <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                          {email.channel}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-sm text-gray-600 mb-1">
                      {email.direction === 'inbound' ? (
                        <>
                          <span className="font-medium text-gray-900">{email.fromAddress}</span>
                          <ArrowRight className="w-3 h-3 text-gray-400" />
                          <span>{email.toAddress}</span>
                        </>
                      ) : (
                        <>
                          <span>{email.fromAddress || 'BuildAny'}</span>
                          <ArrowRight className="w-3 h-3 text-gray-400" />
                          <span className="font-medium text-gray-900">{email.toAddress}</span>
                        </>
                      )}
                    </div>
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {email.subject || '(No subject)'}
                    </p>
                    {email.errorMessage && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-red-600">
                        <AlertTriangle className="w-3 h-3" />
                        {email.errorMessage}
                      </div>
                    )}
                    {email.body && (
                      <button
                        onClick={() => setExpandedId(expandedId === email.id ? null : email.id)}
                        className="flex items-center gap-1 mt-2 text-xs text-blue-600 hover:text-blue-700"
                      >
                        {expandedId === email.id ? (
                          <>
                            <ChevronUp className="w-3 h-3" />
                            Hide body
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-3 h-3" />
                            Show body
                          </>
                        )}
                      </button>
                    )}
                    {expandedId === email.id && email.body && (
                      <div className="mt-2 p-3 bg-gray-50 rounded-lg text-xs text-gray-700 whitespace-pre-wrap">
                        {email.body}
                      </div>
                    )}
                  </div>
                  <div className="shrink-0">
                    {getStatusIcon(email.status)}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
