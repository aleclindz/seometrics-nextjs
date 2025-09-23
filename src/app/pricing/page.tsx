'use client';

import { useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import PricingPlans from '@/components/pricing/PricingPlans';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';

export default function PricingPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(true);

  return (
    <ProtectedRoute>
      <div className="flex h-screen w-full bg-gray-50">
        <Sidebar
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          sidebarExpanded={sidebarExpanded}
          setSidebarExpanded={setSidebarExpanded}
        />
        <div className="flex-1 flex flex-col min-w-0">
          <Header sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
          <div className="flex-1 overflow-auto">
            <PricingPlans />
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
