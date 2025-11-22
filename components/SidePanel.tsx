'use client';

import { useState } from 'react';
import { FileText, Presentation, BarChart3, Plus, X, BookOpen } from 'lucide-react';

type DocumentType = 'docs' | 'slides' | 'sheets';

interface Document {
  id: string;
  type: DocumentType;
  name: string;
  url: string;
}

export function SidePanel() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newDocUrl, setNewDocUrl] = useState('');
  const [newDocName, setNewDocName] = useState('');
  const [newDocType, setNewDocType] = useState<DocumentType>('docs');

  const addDocument = () => {
    if (!newDocUrl || !newDocName) return;

    const newDoc: Document = {
      id: Date.now().toString(),
      type: newDocType,
      name: newDocName,
      url: newDocUrl,
    };

    setDocuments([...documents, newDoc]);
    setNewDocUrl('');
    setNewDocName('');
    setShowAddDialog(false);
  };

  const removeDocument = (id: string) => {
    setDocuments(documents.filter((doc) => doc.id !== id));
  };

  const getIcon = (type: DocumentType) => {
    switch (type) {
      case 'docs':
        return <FileText size={20} className="text-blue-500" />;
      case 'slides':
        return <Presentation size={20} className="text-yellow-500" />;
      case 'sheets':
        return <BarChart3 size={20} className="text-green-500" />;
    }
  };

  const getIconBg = (type: DocumentType) => {
    switch (type) {
      case 'docs':
        return 'from-blue-400 to-blue-600';
      case 'slides':
        return 'from-amber-400 to-amber-600';
      case 'sheets':
        return 'from-emerald-400 to-emerald-600';
    }
  };

  const convertToEmbedUrl = (url: string, type: DocumentType) => {
    // Convert Google Docs/Slides/Sheets URLs to embeddable format
    try {
      const urlObj = new URL(url);
      
      if (urlObj.hostname.includes('docs.google.com')) {
        // Extract document ID from URL
        const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
        if (match) {
          const docId = match[1];
          
          if (type === 'docs') {
            return `https://docs.google.com/document/d/${docId}/preview`;
          } else if (type === 'slides') {
            return `https://docs.google.com/presentation/d/${docId}/preview`;
          } else if (type === 'sheets') {
            return `https://docs.google.com/spreadsheets/d/${docId}/preview`;
          }
        }
      }
      
      return url;
    } catch {
      return url;
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-slate-200/50 dark:border-slate-700/50 bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl p-5">
        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-xl bg-gradient-to-br from-teal-400 to-teal-600 p-2.5 shadow-md">
            <BookOpen size={20} className="text-white" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Shared Documents</h2>
        </div>
        <button
          onClick={() => setShowAddDialog(true)}
          className="group w-full rounded-xl bg-gradient-to-r from-teal-500 to-blue-500 p-3 font-semibold text-white shadow-md hover:shadow-lg hover:scale-105 active:scale-95 transition-all duration-200"
        >
          <span className="flex items-center justify-center gap-2">
            <Plus size={18} className="transition-transform group-hover:rotate-90" />
            Add Document
          </span>
        </button>
      </div>

      {/* Documents list */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {documents.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center animate-fadeIn">
            <div className="mb-6 relative">
              <div className="absolute inset-0 bg-gradient-to-br from-teal-400 to-blue-400 rounded-full blur-xl opacity-30"></div>
              <div className="relative rounded-full bg-gradient-to-br from-teal-100 to-blue-100 dark:from-teal-900/30 dark:to-blue-900/30 p-6">
                <FileText size={48} className="text-teal-600 dark:text-teal-400 opacity-50" />
              </div>
            </div>
            <p className="text-slate-600 dark:text-slate-400 font-medium mb-1">No documents added yet</p>
            <p className="text-xs text-slate-500 dark:text-slate-500">Click "Add Document" to share Google Docs, Slides, or Sheets</p>
          </div>
        ) : (
          <div className="space-y-4">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="group relative rounded-2xl border border-slate-200/50 dark:border-slate-700/50 bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl p-4 shadow-md hover:shadow-lg transition-all duration-300"
              >
                <div className="mb-3 flex items-start gap-3">
                  <div className={`rounded-xl bg-gradient-to-br ${getIconBg(doc.type)} p-2.5 shadow-md`}>
                    {getIcon(doc.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{doc.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 capitalize mt-0.5">{doc.type}</p>
                  </div>
                  <button
                    onClick={() => removeDocument(doc.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity rounded-lg p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700"
                  >
                    <X size={16} className="text-slate-500 dark:text-slate-400" />
                  </button>
                </div>
                
                {/* Embedded document iframe */}
                <div className="aspect-video w-full overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 shadow-inner">
                  <iframe
                    src={convertToEmbedUrl(doc.url, doc.type)}
                    className="h-full w-full"
                    title={doc.name}
                    allow="clipboard-read; clipboard-write"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Document Dialog */}
      {showAddDialog && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-md rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 shadow-2xl p-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-xl bg-gradient-to-br from-teal-400 to-blue-500 p-2.5 shadow-md">
                <Plus size={20} className="text-white" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Add Document</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">Document Name</label>
                <input
                  type="text"
                  value={newDocName}
                  onChange={(e) => setNewDocName(e.target.value)}
                  placeholder="My Study Notes"
                  className="w-full rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 p-3 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 dark:focus:ring-teal-400/50 shadow-sm transition-all"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">Document Type</label>
                <select
                  value={newDocType}
                  onChange={(e) => setNewDocType(e.target.value as DocumentType)}
                  className="w-full rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 p-3 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 dark:focus:ring-teal-400/50 shadow-sm transition-all"
                >
                  <option value="docs">Google Docs</option>
                  <option value="slides">Google Slides</option>
                  <option value="sheets">Google Sheets</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">Document URL</label>
                <input
                  type="url"
                  value={newDocUrl}
                  onChange={(e) => setNewDocUrl(e.target.value)}
                  placeholder="https://docs.google.com/document/d/..."
                  className="w-full rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 p-3 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 dark:focus:ring-teal-400/50 shadow-sm transition-all"
                />
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  Paste the full Google Docs/Slides/Sheets URL
                </p>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowAddDialog(false)}
                className="flex-1 rounded-xl bg-slate-100 dark:bg-slate-800 p-3 font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all shadow-sm hover:shadow-md active:scale-95"
              >
                Cancel
              </button>
              <button
                onClick={addDocument}
                disabled={!newDocUrl || !newDocName}
                className="flex-1 rounded-xl bg-gradient-to-r from-teal-500 to-blue-500 p-3 font-semibold text-white shadow-md hover:shadow-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
