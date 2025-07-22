'use client';

import { useRouter } from 'next/navigation';

interface UpgradeBadgeProps {
  feature: string;
  plan: 'starter' | 'pro' | 'enterprise';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function UpgradeBadge({ 
  feature, 
  plan, 
  size = 'sm', 
  className = '' 
}: UpgradeBadgeProps) {
  const router = useRouter();

  const handleUpgrade = () => {
    router.push('/account');
  };

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base'
  };

  const planColors = {
    starter: 'bg-violet-100 text-violet-800 hover:bg-violet-200 dark:bg-violet-900/30 dark:text-violet-400',
    pro: 'bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400',
    enterprise: 'bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-gray-900/30 dark:text-gray-400'
  };

  const planText = {
    starter: 'Starter',
    pro: 'Pro', 
    enterprise: 'Enterprise'
  };

  return (
    <button
      onClick={handleUpgrade}
      className={`
        inline-flex items-center rounded-full font-medium transition-colors cursor-pointer
        ${sizeClasses[size]}
        ${planColors[plan]}
        ${className}
      `}
      title={`Upgrade to ${planText[plan]} to access ${feature}`}
    >
      ⚡ {planText[plan]}
    </button>
  );
}