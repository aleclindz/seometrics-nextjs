import LandingPage from '@/components/LandingPage';

export default function Home() {
  // Always render the landing page for SSR
  // Auth redirect logic will be handled client-side in LandingPage
  return <LandingPage />;
}