import React from 'react';

interface ActivityItem {
  id: string;
  title: string;
  description: string;
  status: 'done' | 'in_progress' | 'failed';
  timestamp: string;
  hasDetails?: boolean;
}

interface CompactActivityFeedProps {
  activities: ActivityItem[];
}

export const CompactActivityFeed: React.FC<CompactActivityFeedProps> = ({
  activities = []
}) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'done':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-green-500">
            <path d="M21.801 10A10 10 0 1 1 17 3.335"></path>
            <path d="m9 11 3 3L22 4"></path>
          </svg>
        );
      case 'in_progress':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-blue-500">
            <path d="M12 6v6l4 2"></path>
            <circle cx="12" cy="12" r="10"></circle>
          </svg>
        );
      case 'failed':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-red-500">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="15" x2="9" y1="9" y2="15"></line>
            <line x1="9" x2="15" y1="9" y2="15"></line>
          </svg>
        );
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'done':
        return (
          <div className="inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold bg-green-100 text-green-800 border-green-200">
            ✅ Done
          </div>
        );
      case 'in_progress':
        return (
          <div className="inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold bg-blue-100 text-blue-800 border-blue-200">
            ⏳ Running
          </div>
        );
      case 'failed':
        return (
          <div className="inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold bg-red-100 text-red-800 border-red-200">
            ❌ Failed
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="rounded-xl border bg-card text-card-foreground shadow h-full flex flex-col w-64">
      <div className="flex flex-col space-y-1.5 p-4 pb-2">
        <h3 className="font-semibold tracking-tight text-base">Activity Feed</h3>
      </div>
      <div className="p-4 pt-2 flex-1 overflow-y-auto">
        <div className="space-y-3">
          {activities.map((activity) => (
            <div 
              key={activity.id} 
              className="border border-gray-100 rounded-lg p-2.5 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-start gap-2">
                <div className="flex-shrink-0 mt-0.5">
                  {getStatusIcon(activity.status)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    {getStatusBadge(activity.status)}
                    <span className="text-xs text-gray-500">{activity.timestamp}</span>
                  </div>
                  <h4 className="text-xs font-medium text-gray-900 mb-1 leading-tight">
                    {activity.title}
                  </h4>
                  <p className="text-xs text-gray-600 mb-1 leading-tight">
                    {activity.description}
                  </p>
                  {activity.hasDetails && (
                    <button className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 mt-1">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
                        <path d="m6 9 6 6 6-6"></path>
                      </svg>
                      Details
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
          {activities.length === 0 && (
            <div className="text-center py-8">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-gray-400">
                  <path d="M12 8V4H8"></path>
                  <rect width="16" height="12" x="4" y="8" rx="2"></rect>
                  <path d="M2 14h2"></path>
                  <path d="M20 14h2"></path>
                  <path d="M15 13v2"></path>
                  <path d="M9 13v2"></path>
                </svg>
              </div>
              <p className="text-sm text-gray-500 mb-1">No recent activity</p>
              <p className="text-xs text-gray-400">SEO actions will appear here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};