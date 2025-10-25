'use client';

import React, { useMemo, useState } from "react";
import { format } from "date-fns";
import { ChevronUp, ChevronDown, Filter, Search, ExternalLink, Eye, FilePenLine, FileText, Rocket, MessageSquare } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { useContentPipeline, ContentItem, ArticleStage, Keyword } from "@/hooks/useContentPipeline";

// =============================
// PipelineTab - Table View Only
// - Sortable columns, filtering, different row styles per stage
// - Clear visual differentiation between briefs, drafts, published
// =============================

type SortField = "title" | "cluster" | "stage" | "publishDate" | "keywords" | "wordGoal";
type SortDirection = "asc" | "desc";

interface PipelineTabProps {
  userToken: string;
  websiteToken: string;
  domain: string;
  conversationId?: string | null;
  onSwitchToCalendar?: () => void;
}

// ---- Utility ----
const classNames = (...xs: (string | false | null | undefined)[]) => xs.filter(Boolean).join(" ");

// ---- Components ----
function StageBadge({ stage }: { stage: ArticleStage }) {
  const map = {
    brief: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", icon: FilePenLine },
    draft: { bg: "bg-amber-50", text: "text-amber-800", border: "border-amber-200", icon: FileText },
    published: { bg: "bg-green-50", text: "text-green-700", border: "border-green-200", icon: Rocket },
  } as const;
  const style = map[stage];
  const Icon = style.icon;
  return (
    <span className={classNames(
      "inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full border",
      style.bg, style.text, style.border
    )}>
      <Icon className="w-3 h-3" />
      {stage.charAt(0).toUpperCase() + stage.slice(1)}
    </span>
  );
}

function StatusBadge({ status, scheduledPublishAt }: { status?: string; scheduledPublishAt?: string | null }) {
  if (!status || status === 'published') return null;

  let label = '';
  let styles = '';

  if (status === 'generating') {
    label = 'Generating...';
    styles = 'bg-purple-50 text-purple-700 border-purple-200';
  } else if (status === 'generated') {
    if (scheduledPublishAt) {
      label = 'Scheduled';
      styles = 'bg-indigo-50 text-indigo-700 border-indigo-200';
    } else {
      label = 'Generated';
      styles = 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
  } else if (status === 'pending') {
    label = 'Queued';
    styles = 'bg-gray-50 text-gray-600 border-gray-200';
  } else if (status === 'generation_failed' || status === 'publishing_failed') {
    label = 'Failed';
    styles = 'bg-red-50 text-red-700 border-red-200';
  } else {
    label = status.replace('_', ' ');
    styles = 'bg-gray-50 text-gray-600 border-gray-200';
  }

  return (
    <span className={classNames(
      "inline-flex items-center px-2 py-0.5 text-xs rounded-full border ml-2",
      styles
    )}>
      {label}
    </span>
  );
}

function KeywordList({ keywords }: { keywords?: Keyword[] }) {
  if (!keywords?.length) return <span className="text-gray-400">-</span>;
  const display = keywords.slice(0, 2).map(k => k.term).join(", ");
  const extra = keywords.length > 2 ? ` +${keywords.length - 2}` : "";
  return <span className="text-sm">{display}{extra}</span>;
}

function SortHeader({ field, label, sortField, sortDirection, onSort }: {
  field: SortField;
  label: string;
  sortField: SortField | null;
  sortDirection: SortDirection;
  onSort: (field: SortField) => void;
}) {
  const isActive = sortField === field;
  return (
    <button
      onClick={() => onSort(field)}
      className="flex items-center gap-1 text-left hover:bg-gray-50 px-2 py-1 rounded"
    >
      <span>{label}</span>
      {isActive && (
        sortDirection === "asc" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
      )}
    </button>
  );
}

function ClusterTag({ cluster, onClick }: { cluster: string; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
    >
      {cluster}
    </button>
  );
}

function ArticleModal({ item }: { item: ContentItem }) {
  const hasContent = item.articleContent && item.status === 'generated';

  return (
    <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
      <DialogHeader>
        <div className="flex items-center gap-2 flex-wrap">
          <DialogTitle className="text-left text-gray-900">{item.title}</DialogTitle>
          <StatusBadge status={item.status} scheduledPublishAt={item.scheduledPublishAt} />
        </div>
      </DialogHeader>
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <StageBadge stage={item.stage} />
          <ClusterTag cluster={item.cluster} />
        </div>

        {item.brief && (
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">
              {item.stage === "brief" ? "Brief Description" : "Article Description"}
            </h4>
            <p className="text-gray-700 leading-relaxed">{item.brief}</p>
          </div>
        )}

        {hasContent && (
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">Generated Article Content</h4>
            <div
              className="prose prose-sm max-w-none text-gray-700 leading-relaxed border rounded-lg p-4 bg-gray-50"
              dangerouslySetInnerHTML={{ __html: item.articleContent || '' }}
            />
          </div>
        )}

        {item.keywords && item.keywords.length > 0 && (
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">Keywords</h4>
            <div className="flex flex-wrap gap-2">
              {item.keywords.map((keyword, index) => (
                <span key={index} className="px-2 py-1 bg-gray-100 text-gray-800 text-sm rounded">
                  {keyword.term}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 text-sm text-gray-700">
          {item.wordGoal && (
            <div>
              <span className="font-semibold text-gray-900">Target Length:</span>
              <span className="ml-2">{item.wordGoal.toLocaleString()} words</span>
            </div>
          )}

          {item.createdAt && (
            <div>
              <span className="font-semibold text-gray-900">Created:</span>
              <span className="ml-2">{format(new Date(item.createdAt), "MMM d, yyyy")}</span>
            </div>
          )}

          {item.scheduledPublishAt && (
            <div>
              <span className="font-semibold text-gray-900">Scheduled:</span>
              <span className="ml-2">{format(new Date(item.scheduledPublishAt), "MMM d, yyyy")}</span>
            </div>
          )}

          {item.url && (
            <div>
              <span className="font-semibold text-gray-900">Published URL:</span>
              <a href={item.url} target="_blank" rel="noreferrer" className="ml-2 text-blue-600 hover:text-blue-800 inline-flex items-center gap-1">
                View Article <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>
      </div>
    </DialogContent>
  );
}

function TableRow({ item, onAdvance, onScheduleForPublication, onPublishNow, onScheduleBriefForGeneration, onClusterClick }: {
  item: ContentItem;
  onAdvance: (id: string) => void;
  onScheduleForPublication: (id: string) => void;
  onPublishNow: (id: string) => void;
  onScheduleBriefForGeneration: (id: string) => void;
  onClusterClick: (cluster: string) => void;
}) {
  const rowStyle = {
    brief: "bg-blue-50/30 hover:bg-blue-50/50 border-blue-100",
    draft: "bg-amber-50/30 hover:bg-amber-50/50 border-amber-100",
    published: "bg-green-50/30 hover:bg-green-50/50 border-green-100",
  }[item.stage];

  const publishDate = item.stage === "published" ? item.scheduledPublishAt : null;

  return (
    <tr className={classNames("border-b transition-colors", rowStyle)}>
      <td className="px-4 py-3">
        <StageBadge stage={item.stage} />
      </td>
      <td className="px-4 py-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1 flex-wrap">
              <div className="font-medium text-sm">{item.title}</div>
              <StatusBadge status={item.status} scheduledPublishAt={item.scheduledPublishAt} />
            </div>
            {item.brief && <div className="text-xs text-gray-600 mt-1 line-clamp-1">{item.brief}</div>}
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <button className="p-1 rounded hover:bg-gray-100 shrink-0 opacity-60 hover:opacity-100 transition-opacity">
                <Eye className="w-4 h-4" />
              </button>
            </DialogTrigger>
            <ArticleModal item={item} />
          </Dialog>
        </div>
      </td>
      <td className="px-4 py-3">
        <ClusterTag cluster={item.cluster} onClick={() => onClusterClick(item.cluster)} />
      </td>
      <td className="px-4 py-3">
        <KeywordList keywords={item.keywords} />
      </td>
      <td className="px-4 py-3 text-sm">
        {item.wordGoal ? `${item.wordGoal.toLocaleString()} words` : "-"}
      </td>
      <td className="px-4 py-3 text-sm">
        {item.createdAt ? format(new Date(item.createdAt), "MMM d, yyyy") : "-"}
      </td>
      <td className="px-4 py-3 text-sm">
        {publishDate ? format(new Date(publishDate), "MMM d, yyyy") : "-"}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          {item.stage === "brief" && (
            <>
              <button
                onClick={() => onScheduleBriefForGeneration(item.id)}
                className="px-3 py-1 text-xs rounded border bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100 flex items-center justify-center"
              >
                Schedule
              </button>
              <button
                onClick={() => onAdvance(item.id)}
                className="px-3 py-1 text-xs rounded border bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
              >
                Generate Now
              </button>
            </>
          )}
          {item.stage === "draft" && (
            <>
              <button
                onClick={() => onPublishNow(item.id)}
                className="px-3 py-1 text-xs rounded border bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
              >
                Publish
              </button>
              <button
                onClick={() => onScheduleForPublication(item.id)}
                className="px-3 py-1 text-xs rounded border bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100 flex items-center justify-center"
              >
                Schedule
              </button>
            </>
          )}
          {item.stage === "published" && item.url && (
            <a
              href={item.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
            >
              <ExternalLink className="w-3 h-3" />
              View
            </a>
          )}
        </div>
      </td>
    </tr>
  );
}

export default function PipelineTab({ userToken, websiteToken, domain, conversationId, onSwitchToCalendar }: PipelineTabProps) {
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [search, setSearch] = useState("");
  const [stageFilters, setStageFilters] = useState({
    brief: true,
    draft: true,
    published: true,
  });

  // Use content pipeline hook
  const { items, loading, error, advanceToDraft, scheduleForPublication, publishNow, scheduleBriefForGeneration } = useContentPipeline({
    userToken,
    websiteToken,
    domain,
    conversationId
  });

  // Filtering and sorting logic
  const filteredAndSortedItems = useMemo(() => {
    let filtered = items.filter(item => {
      const matchesSearch = search === "" ||
        item.title.toLowerCase().includes(search.toLowerCase()) ||
        item.cluster.toLowerCase().includes(search.toLowerCase()) ||
        item.keywords?.some(k => k.term.toLowerCase().includes(search.toLowerCase()));

      const matchesStage = stageFilters[item.stage];

      return matchesSearch && matchesStage;
    });

    if (sortField) {
      filtered.sort((a, b) => {
        let aVal: any, bVal: any;

        switch (sortField) {
          case "title":
            aVal = a.title;
            bVal = b.title;
            break;
          case "cluster":
            aVal = a.cluster;
            bVal = b.cluster;
            break;
          case "stage":
            const stageOrder = { brief: 0, draft: 1, published: 2 };
            aVal = stageOrder[a.stage];
            bVal = stageOrder[b.stage];
            break;
          case "publishDate":
            aVal = a.scheduledPublishAt || a.scheduledDraftAt || "";
            bVal = b.scheduledPublishAt || b.scheduledDraftAt || "";
            break;
          case "keywords":
            aVal = a.keywords?.length || 0;
            bVal = b.keywords?.length || 0;
            break;
          case "wordGoal":
            aVal = a.wordGoal || 0;
            bVal = b.wordGoal || 0;
            break;
          default:
            return 0;
        }

        if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
        if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [items, search, stageFilters, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const handleStageFilterChange = (stage: ArticleStage, checked: boolean) => {
    setStageFilters(prev => ({ ...prev, [stage]: checked }));
  };

  const handleAdvanceToDraft = async (id: string) => {
    try {
      await advanceToDraft(id);
    } catch (err) {
      console.error('Failed to advance to draft:', err);
      alert('Failed to generate draft. Please try again.');
    }
  };

  const handleScheduleForPublication = (id: string) => {
    if (onSwitchToCalendar) {
      onSwitchToCalendar();
    } else {
      alert('Please switch to the Calendar tab to schedule this article.');
    }
  };

  const handlePublishNow = async (id: string) => {
    try {
      await publishNow(id);
      alert('Article published successfully! You can view it in the Published section.');
    } catch (err) {
      console.error('Failed to publish article:', err);
      alert('Failed to publish article. Please check that your CMS is properly connected and try again.');
    }
  };

  const handleScheduleBriefForGeneration = (id: string) => {
    if (onSwitchToCalendar) {
      onSwitchToCalendar();
    } else {
      alert('Please switch to the Calendar tab to schedule this brief.');
    }
  };

  if (loading) {
    return (
      <div className="bg-white border rounded-2xl p-8 text-center">
        <div className="text-gray-600">Loading content pipeline...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white border rounded-2xl p-8 text-center">
        <div className="text-red-600 mb-2">Error loading content</div>
        <div className="text-sm text-gray-500">{error}</div>
      </div>
    );
  }

  // Empty state
  if (items.length === 0) {
    return (
      <div className="bg-white border rounded-2xl p-12 text-center">
        <div className="max-w-md mx-auto">
          <MessageSquare className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Content in Your Pipeline</h3>
          <p className="text-gray-600 mb-6">
            Get started by chatting with the SEO agent to create a content strategy for your website.
          </p>
          <button
            onClick={() => {
              // Scroll to chat or trigger chat focus
              const chatInput = document.querySelector('textarea[placeholder*="Ask"]') as HTMLTextAreaElement;
              if (chatInput) {
                chatInput.focus();
                chatInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <MessageSquare className="w-4 h-4" />
            Chat with SEO Agent
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="bg-white border rounded-2xl p-4 sm:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Content Pipeline</h2>
          <p className="text-sm text-gray-500">Manage your content from brief to publication</p>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search articles..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-xl bg-white"
          />
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-600">Show:</span>
          </div>

          {(["brief", "draft", "published"] as ArticleStage[]).map(stage => (
            <label key={stage} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={stageFilters[stage]}
                onChange={(e) => handleStageFilterChange(stage, e.target.checked)}
                className="rounded"
              />
              <span className="capitalize">{stage === "published" ? "Published" : stage + "s"}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-900">
                <SortHeader
                  field="stage"
                  label="Status"
                  sortField={sortField}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                />
              </th>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-900">
                <SortHeader
                  field="title"
                  label="Article"
                  sortField={sortField}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                />
              </th>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-900">
                <SortHeader
                  field="cluster"
                  label="Topic Cluster"
                  sortField={sortField}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                />
              </th>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-900">
                <SortHeader
                  field="keywords"
                  label="Keywords"
                  sortField={sortField}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                />
              </th>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-900">
                <SortHeader
                  field="wordGoal"
                  label="Length"
                  sortField={sortField}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                />
              </th>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-900">
                <span className="px-2 py-1">Generated</span>
              </th>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-900">
                <SortHeader
                  field="publishDate"
                  label="Publish Date"
                  sortField={sortField}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                />
              </th>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-900">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedItems.map(item => (
              <TableRow
                key={item.id}
                item={item}
                onAdvance={handleAdvanceToDraft}
                onScheduleForPublication={handleScheduleForPublication}
                onPublishNow={handlePublishNow}
                onScheduleBriefForGeneration={handleScheduleBriefForGeneration}
                onClusterClick={(cluster) => setSearch(cluster)}
              />
            ))}
          </tbody>
        </table>

        {filteredAndSortedItems.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No articles match your current filters
          </div>
        )}
      </div>

      {/* Footer Stats */}
      <footer className="flex items-center justify-between pt-4 border-t text-sm text-gray-600">
        <div className="flex items-center gap-4">
          <span>Briefs: {items.filter(i => i.stage === "brief").length}</span>
          <span>Drafts: {items.filter(i => i.stage === "draft").length}</span>
          <span>Published: {items.filter(i => i.stage === "published").length}</span>
        </div>
        <div>
          Total: {items.length}
        </div>
      </footer>
    </main>
  );
}
