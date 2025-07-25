'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/auth';

interface CMSConnection {
  id: number;
  connection_name: string;
  cms_type: string;
  base_url: string;
  content_type: string;
  status: string;
  website_id: number;
  website_domain?: string;
  last_sync_at?: string;
  error_message?: string;
  api_token?: string;
}

interface CMSConnectionsListProps {
  connections: CMSConnection[];
  onConnectionDeleted: (connectionId: number) => void;
  onConnectionUpdated: () => void;
}

export default function CMSConnectionsList({ connections, onConnectionDeleted, onConnectionUpdated }: CMSConnectionsListProps) {
  const { user } = useAuth();
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [testingId, setTestingId] = useState<number | null>(null);
  const [editingConnection, setEditingConnection] = useState<CMSConnection | null>(null);
  const [editForm, setEditForm] = useState({
    connection_name: '',
    base_url: '',
    api_token: '',
    content_type: ''
  });
  const [updating, setUpdating] = useState(false);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
            <div className="w-1.5 h-1.5 bg-green-400 rounded-full mr-1.5"></div>
            Active
          </span>
        );
      case 'error':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
            <div className="w-1.5 h-1.5 bg-red-400 rounded-full mr-1.5"></div>
            Error
          </span>
        );
      case 'inactive':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400">
            <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-1.5"></div>
            Inactive
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
            <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full mr-1.5"></div>
            {status}
          </span>
        );
    }
  };

  const getCMSIcon = (cmsType: string) => {
    switch (cmsType) {
      case 'strapi':
        return (
          <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
            </svg>
          </div>
        );
    }
  };

  const testConnection = async (connection: CMSConnection) => {
    try {
      setTestingId(connection.id);
      
      const response = await fetch('/api/cms/test-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cms_type: connection.cms_type,
          base_url: connection.base_url,
          // We need to fetch the actual token for testing
          connection_id: connection.id,
          content_type: connection.content_type,
          userToken: user?.token,
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        // Show success message or update UI
        console.log('Connection test successful:', data);
      } else {
        console.error('Connection test failed:', data);
      }
      
      // Refresh the connections list to get updated status
      onConnectionUpdated();
    } catch (err) {
      console.error('Error testing connection:', err);
    } finally {
      setTestingId(null);
    }
  };

  const deleteConnection = async (connectionId: number) => {
    if (!confirm('Are you sure you want to delete this connection? This action cannot be undone.')) {
      return;
    }

    try {
      setDeletingId(connectionId);
      
      const response = await fetch(`/api/cms/connections/${connectionId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userToken: user?.token,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to delete connection');
      }

      onConnectionDeleted(connectionId);
    } catch (err) {
      console.error('Error deleting connection:', err);
      alert('Failed to delete connection. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  const openEditModal = (connection: CMSConnection) => {
    setEditingConnection(connection);
    setEditForm({
      connection_name: connection.connection_name,
      base_url: connection.base_url,
      api_token: '', // Don't pre-fill the API token for security
      content_type: connection.content_type
    });
  };

  const closeEditModal = () => {
    setEditingConnection(null);
    setEditForm({
      connection_name: '',
      base_url: '',
      api_token: '',
      content_type: ''
    });
  };

  const updateConnection = async () => {
    if (!editingConnection || !user?.token) return;

    try {
      setUpdating(true);
      
      const response = await fetch(`/api/cms/connections/${editingConnection.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userToken: user.token,
          connection_name: editForm.connection_name,
          base_url: editForm.base_url,
          api_token: editForm.api_token, // Only update if provided
          content_type: editForm.content_type
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update connection');
      }

      const data = await response.json();
      console.log('Connection updated successfully:', data);
      
      closeEditModal();
      onConnectionUpdated();
    } catch (err) {
      console.error('Error updating connection:', err);
      alert(err instanceof Error ? err.message : 'Failed to update connection. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl">
      <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60">
        <h2 className="font-semibold text-gray-800 dark:text-gray-100">
          Your CMS Connections ({connections.length})
        </h2>
      </div>
      
      <div className="divide-y divide-gray-100 dark:divide-gray-700/60">
        {connections.map((connection) => (
          <div key={connection.id} className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3">
                {getCMSIcon(connection.cms_type)}
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                      {connection.connection_name}
                    </h3>
                    {getStatusBadge(connection.status)}
                  </div>
                  
                  <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    <div className="flex items-center space-x-4">
                      <span className="flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
                        </svg>
                        {connection.website_domain || `Website ID: ${connection.website_id}`}
                      </span>
                      <span className="flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                        {new URL(connection.base_url).hostname}
                      </span>
                      <span className="capitalize">{connection.cms_type}</span>
                    </div>
                    
                    <div className="mt-1 flex items-center space-x-4 text-xs">
                      <span>Content Type: {connection.content_type}</span>
                      <span>Last Sync: {formatDate(connection.last_sync_at)}</span>
                    </div>
                  </div>

                  {connection.error_message && (
                    <div className="mt-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 rounded p-2">
                      <div className="flex">
                        <svg className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-xs">{connection.error_message}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => testConnection(connection)}
                  disabled={testingId === connection.id}
                  className="btn-sm border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 text-gray-700 dark:text-gray-300 disabled:opacity-50"
                  title="Test connection"
                >
                  {testingId === connection.id ? (
                    <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                </button>

                <button
                  onClick={() => openEditModal(connection)}
                  className="btn-sm border-blue-200 dark:border-blue-600 hover:border-blue-300 dark:hover:border-blue-500 text-blue-600 dark:text-blue-400"
                  title="Edit connection"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>

                <button
                  onClick={() => deleteConnection(connection.id)}
                  disabled={deletingId === connection.id}
                  className="btn-sm border-red-200 dark:border-red-800 hover:border-red-300 dark:hover:border-red-700 text-red-600 dark:text-red-400 disabled:opacity-50"
                  title="Delete connection"
                >
                  {deletingId === connection.id ? (
                    <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Modal */}
      {editingConnection && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full mx-4">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Edit CMS Connection
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Update your {editingConnection.cms_type} connection settings
              </p>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Connection Name
                </label>
                <input
                  type="text"
                  value={editForm.connection_name}
                  onChange={(e) => setEditForm(prev => ({ ...prev, connection_name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="My CMS Connection"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Base URL
                </label>
                <input
                  type="url"
                  value={editForm.base_url}
                  onChange={(e) => setEditForm(prev => ({ ...prev, base_url: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="https://your-cms.com"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  API Token
                </label>
                <input
                  type="password"
                  value={editForm.api_token}
                  onChange={(e) => setEditForm(prev => ({ ...prev, api_token: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Leave empty to keep current token"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Only enter a new token if you want to update it
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Content Type
                </label>
                <input
                  type="text"
                  value={editForm.content_type}
                  onChange={(e) => setEditForm(prev => ({ ...prev, content_type: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="api::blog-post.blog-post"
                />
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-100 dark:border-gray-700 flex justify-end space-x-3">
              <button
                onClick={closeEditModal}
                disabled={updating}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={updateConnection}
                disabled={updating || !editForm.connection_name || !editForm.base_url}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 flex items-center"
              >
                {updating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Updating...
                  </>
                ) : (
                  'Update Connection'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}