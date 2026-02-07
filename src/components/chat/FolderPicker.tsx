import { useEffect, useState, useCallback } from 'react';
import { useApi } from '../../hooks/useApi';
import type { DirectoryEntry } from '../../lib/api';

interface FolderPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (path: string) => void;
}

export function FolderPicker({ isOpen, onClose, onSelect }: FolderPickerProps) {
  const api = useApi();
  const [currentPath, setCurrentPath] = useState('');
  const [parentPath, setParentPath] = useState<string | null>(null);
  const [entries, setEntries] = useState<DirectoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDirectory = useCallback(async (path?: string) => {
    if (!api) return;

    setLoading(true);
    setError(null);

    try {
      const result = await api.listDirectory(path);
      setCurrentPath(result.currentPath);
      setParentPath(result.parentPath);
      setEntries(result.entries);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load directory');
    } finally {
      setLoading(false);
    }
  }, [api]);

  // Load home directory on open
  useEffect(() => {
    if (isOpen && api) {
      loadDirectory();
    }
  }, [isOpen, api, loadDirectory]);

  const handleNavigate = (path: string) => {
    loadDirectory(path);
  };

  const handleSelectCurrent = () => {
    onSelect(currentPath);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-2xl mx-4 bg-gray-800 rounded-xl shadow-2xl border border-gray-700 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-gray-900 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white">Select Project Folder</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Current path */}
        <div className="px-4 py-2 bg-gray-850 border-b border-gray-700">
          <div className="flex items-center gap-2 text-sm">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            <span className="text-gray-300 font-mono text-xs truncate">{currentPath || 'Loading...'}</span>
          </div>
        </div>

        {/* Directory list */}
        <div className="h-80 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin w-6 h-6 border-2 border-gray-600 border-t-blue-500 rounded-full" />
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full p-4">
              <div className="text-center">
                <p className="text-red-400 mb-2">{error}</p>
                <button
                  onClick={() => loadDirectory()}
                  className="text-sm text-blue-400 hover:text-blue-300"
                >
                  Try again
                </button>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-gray-700/50">
              {/* Parent directory */}
              {parentPath && (
                <button
                  onClick={() => handleNavigate(parentPath)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-700/50 transition-colors text-left"
                >
                  <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
                  </svg>
                  <span className="text-gray-300">..</span>
                  <span className="text-gray-500 text-sm ml-auto">Parent folder</span>
                </button>
              )}

              {/* Directory entries */}
              {entries.length === 0 && !parentPath ? (
                <div className="flex items-center justify-center h-40 text-gray-500">
                  No folders found
                </div>
              ) : (
                entries.map((entry) => (
                  <button
                    key={entry.path}
                    onClick={() => handleNavigate(entry.path)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-700/50 transition-colors text-left group"
                  >
                    <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                    </svg>
                    <span className="text-gray-200 group-hover:text-white">{entry.name}</span>
                    <svg className="w-4 h-4 text-gray-600 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 bg-gray-900 border-t border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg text-gray-300 hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSelectCurrent}
            disabled={!currentPath || loading}
            className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Select This Folder
          </button>
        </div>
      </div>
    </div>
  );
}
