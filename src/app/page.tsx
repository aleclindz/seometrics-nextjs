export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-6">
            SEO Metrics Tool
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            AI-powered SEO content generation and optimization platform. 
            Create high-quality articles, meta tags, and optimize your content for search engines.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto mt-12">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Article Generation
              </h3>
              <p className="text-gray-600">
                Generate SEO-optimized articles with AI assistance in multiple languages
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Meta Tag Optimization
              </h3>
              <p className="text-gray-600">
                Automatically generate optimized meta titles and descriptions
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Content Enhancement
              </h3>
              <p className="text-gray-600">
                Add images, videos, tables, and FAQs to boost content quality
              </p>
            </div>
          </div>
          
          <div className="mt-12">
            <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition duration-300">
              Get Started
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}