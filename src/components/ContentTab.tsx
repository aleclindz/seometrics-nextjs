'use client';

import React, { useMemo, useState } from "react";
import { format, addDays, startOfWeek, isSameDay } from "date-fns";
import { ChevronUp, ChevronDown, Filter, Search, ExternalLink, X, Eye, FilePenLine, FileText, Rocket, Settings } from "lucide-react";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { useContentPipeline, ContentItem, ArticleStage, Keyword } from "@/hooks/useContentPipeline";

// =============================
// ContentTab - Table & Calendar Views
// - Table mode: sortable columns, filtering, different row styles per stage
// - Calendar mode: drag-and-drop scheduling, 2-week view
// - Clear visual differentiation between briefs, drafts, published
// =============================

type SortField = "title" | "cluster" | "stage" | "publishDate" | "keywords" | "wordGoal";
type SortDirection = "asc" | "desc";

interface ContentTabProps {
  userToken: string;
  websiteToken: string;
  domain: string;
}

// ---- Utility ----
const classNames = (...xs: (string | false | null | undefined)[]) => xs.filter(Boolean).join(" ");

// ---- Components ----
function Segmented({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const items = [
    { key: "table", label: "Table" },
    { key: "calendar", label: "Calendar" },
  ];
  return (
    <div className="inline-flex rounded-2xl border p-1 bg-white shadow-sm">
      {items.map((it) => (
        <button
          key={it.key}
          onClick={() => onChange(it.key)}
          className={classNames(
            "px-3 py-1.5 text-sm rounded-xl transition",
            value === it.key ? "bg-gray-900 text-white" : "text-gray-700 hover:bg-gray-100"
          )}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}

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

  // Determine badge style based on status
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
    <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
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

        {hasContent ? (
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">Article Content</h4>
            <div
              className="prose prose-sm max-w-none text-gray-700 leading-relaxed border rounded-lg p-4 bg-gray-50"
              dangerouslySetInnerHTML={{ __html: item.articleContent || '' }}
            />
          </div>
        ) : item.brief && (
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">
              {item.stage === "brief" ? "Brief Description" : "Article Description"}
            </h4>
            <p className="text-gray-700 leading-relaxed">{item.brief}</p>
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

function TableRow({ item, onAdvance, onScheduleForPublication, onScheduleBriefForGeneration, onClusterClick }: {
  item: ContentItem;
  onAdvance: (id: string) => void;
  onScheduleForPublication: (id: string) => void;
  onScheduleBriefForGeneration: (id: string) => void;
  onClusterClick: (cluster: string) => void;
}) {
  const rowStyle = {
    brief: "bg-blue-50/30 hover:bg-blue-50/50 border-blue-100",
    draft: "bg-amber-50/30 hover:bg-amber-50/50 border-amber-100",
    published: "bg-green-50/30 hover:bg-green-50/50 border-green-100",
  }[item.stage];

  const publishDate = item.stage === "published"
    ? item.scheduledPublishAt
    : item.scheduledPublishAt || item.scheduledDraftAt;

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
        {publishDate ? format(new Date(publishDate), "MMM d, yyyy") : "-"}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          {item.stage === "brief" && (
            <>
              <button
                onClick={() => onScheduleBriefForGeneration(item.id)}
                className="px-2 py-1 text-xs rounded border bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100"
              >
                Schedule
              </button>
              <button
                onClick={() => onAdvance(item.id)}
                className="px-2 py-1 text-xs rounded border bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
              >
                Generate Now
              </button>
            </>
          )}
          {item.stage === "draft" && (
            <button
              onClick={() => onScheduleForPublication(item.id)}
              className="px-2 py-1 text-xs rounded border bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100"
            >
              Schedule for publication
            </button>
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

function DraggableArticle({ item, isSelected }: { item: ContentItem; isSelected?: boolean }) {
  const [{ isDragging }, drag] = useDrag({
    type: "article",
    item: { id: item.id, title: item.title, stage: item.stage },
    canDrag: item.stage === "draft",
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  if (item.stage !== "draft") return null;

  return (
    <div
      ref={drag as any}
      className={classNames(
        "p-2 mb-2 border rounded-lg cursor-move bg-white shadow-sm",
        isDragging ? "opacity-50" : "hover:shadow-md",
        isSelected ? "ring-2 ring-blue-500 bg-blue-50" : ""
      )}
    >
      <div className="flex items-center gap-2 mb-1">
        <FileText className="w-4 h-4 text-amber-600" />
        <div className="flex-1 flex items-center gap-1 flex-wrap min-w-0">
          <span className="text-sm font-medium truncate">{item.title}</span>
          <StatusBadge status={item.status} scheduledPublishAt={item.scheduledPublishAt} />
        </div>
      </div>
      <div className="text-xs text-gray-500">{item.cluster}</div>
    </div>
  );
}

function CalendarDay({ date, items, onDrop, onRemove }: {
  date: Date;
  items: ContentItem[];
  onDrop: (articleId: string, date: Date) => void;
  onRemove: (articleId: string) => void;
}) {
  const [{ isOver, canDrop }, drop] = useDrop({
    accept: "article",
    drop: (item: { id: string }) => onDrop(item.id, date),
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  });

  const isToday = isSameDay(date, new Date());

  return (
    <div
      ref={drop as any}
      className={classNames(
        "min-h-[200px] p-4 border border-gray-200 transition-all duration-200",
        isToday ? "bg-blue-50 border-blue-300" : "bg-white",
        isOver && canDrop && "bg-blue-100 border-blue-400 ring-2 ring-blue-400 ring-inset shadow-inner",
        canDrop && !isOver && "border-dashed"
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className={classNames(
            "text-2xl font-bold",
            isToday ? "text-blue-600" : "text-gray-700"
          )}>
            {format(date, "d")}
          </span>
          {isOver && canDrop && (
            <div className="text-xs text-blue-600 font-medium mt-1">Drop to schedule</div>
          )}
        </div>
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id} className="group relative">
            <div className="text-sm bg-amber-100 text-amber-800 px-3 py-2.5 rounded-lg border border-amber-200 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0 pr-8">
                  <div className="flex items-center gap-1 flex-wrap">
                    <div className="font-semibold text-sm leading-snug break-words">{item.title}</div>
                    <StatusBadge status={item.status} scheduledPublishAt={item.scheduledPublishAt} />
                  </div>
                  <div className="text-xs text-amber-700 mt-1.5 truncate">{item.cluster}</div>
                </div>
                <button
                  onClick={() => onRemove(item.id)}
                  className="absolute top-2 right-2 opacity-60 group-hover:opacity-100 transition-opacity shrink-0 hover:bg-amber-200 rounded"
                  title="Remove from schedule"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ContentTab({ userToken, websiteToken, domain }: ContentTabProps) {
  const [mode, setMode] = useState<"table" | "calendar">("table");
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [search, setSearch] = useState("");
  const [stageFilters, setStageFilters] = useState({
    brief: true,
    draft: true,
    published: true,
  });
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);

  // Use content pipeline hook
  const { items, loading, error, advanceToDraft, scheduleForPublication, removeFromSchedule, scheduleBriefForGeneration } = useContentPipeline({
    userToken,
    websiteToken,
    domain
  });

  // Calculate week start for calendar display
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });

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
    setSelectedArticleId(id);
    setMode("calendar");
  };

  const handleDropOnCalendar = async (articleId: string, date: Date) => {
    try {
      await scheduleForPublication(articleId, date);
      setSelectedArticleId(null);
    } catch (err) {
      console.error('Failed to schedule article:', err);
      alert('Failed to schedule article. Please try again.');
    }
  };

  const handleRemoveFromCalendar = async (articleId: string) => {
    try {
      await removeFromSchedule(articleId);
    } catch (err) {
      console.error('Failed to remove from calendar:', err);
      alert('Failed to remove from calendar. Please try again.');
    }
  };

  const handleScheduleBriefForGeneration = async (id: string) => {
    try {
      // Prompt user for date
      const dateStr = prompt('Enter scheduled date for article generation (YYYY-MM-DD):');
      if (!dateStr) return; // User cancelled

      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        alert('Invalid date format. Please use YYYY-MM-DD');
        return;
      }

      await scheduleBriefForGeneration(id, date);
    } catch (err) {
      console.error('Failed to schedule brief:', err);
      alert('Failed to schedule brief. Please try again.');
    }
  };

  // Calendar view helpers - show 2 weeks
  const calendarDays = [];
  for (let i = 0; i < 14; i++) {
    calendarDays.push(addDays(weekStart, i));
  }

  const itemsByDate = useMemo(() => {
    const grouped: Record<string, ContentItem[]> = {};
    items.forEach(item => {
      if (item.scheduledPublishAt) {
        const dateKey = format(new Date(item.scheduledPublishAt), "yyyy-MM-dd");
        if (!grouped[dateKey]) grouped[dateKey] = [];
        grouped[dateKey].push(item);
      }
    });
    return grouped;
  }, [items]);

  const draftItems = items.filter(item => item.stage === "draft" && !item.scheduledPublishAt);

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

  return (
    <DndProvider backend={HTML5Backend}>
      <main className="bg-white border rounded-2xl p-4 sm:p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Content Pipeline</h2>
            <p className="text-sm text-gray-500">Manage your content from brief to publication</p>
          </div>
          <div className="flex items-center gap-3">
            <Segmented value={mode} onChange={(v) => setMode(v as any)} />
            <button className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border bg-white hover:bg-gray-50">
              <Settings className="w-4 h-4"/> Settings
            </button>
          </div>
        </div>

        {mode === "table" ? (
          <>
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
          </>
        ) : (
          /* Calendar View */
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Unscheduled Drafts */}
            <div className="lg:col-span-1">
              <h3 className="font-medium mb-3">Unscheduled Drafts</h3>
              <div className="bg-gray-50 border rounded-xl p-4 min-h-[400px]">
                {draftItems.length === 0 ? (
                  <div className="text-sm text-gray-500">No unscheduled drafts</div>
                ) : (
                  draftItems.map(item => (
                    <DraggableArticle
                      key={item.id}
                      item={item}
                      isSelected={selectedArticleId === item.id}
                    />
                  ))
                )}
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="lg:col-span-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-base">
                  {format(weekStart, "MMM d")} - {format(addDays(weekStart, 13), "MMM d, yyyy")}
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentDate(addDays(currentDate, -14))}
                    className="px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50"
                  >
                    Previous 2 Weeks
                  </button>
                  <button
                    onClick={() => setCurrentDate(new Date())}
                    className="px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50"
                  >
                    Today
                  </button>
                  <button
                    onClick={() => setCurrentDate(addDays(currentDate, 14))}
                    className="px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50"
                  >
                    Next 2 Weeks
                  </button>
                </div>
              </div>

              {/* Horizontal scrollable container */}
              <div className="border rounded-xl overflow-x-auto">
                <div className="min-w-[1400px]">
                  {/* Calendar Header */}
                  <div className="grid grid-cols-7 bg-gray-50">
                    {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map(day => (
                      <div key={day} className="p-4 text-center text-base font-semibold border-r border-gray-200 last:border-r-0">
                        {day}
                      </div>
                    ))}
                  </div>

                  {/* Calendar Days - 2 weeks */}
                  <div className="grid grid-cols-7">
                    {calendarDays.map(day => {
                      const dateKey = format(day, "yyyy-MM-dd");
                      const dayItems = itemsByDate[dateKey] || [];
                      return (
                        <CalendarDay
                          key={dateKey}
                          date={day}
                          items={dayItems}
                          onDrop={handleDropOnCalendar}
                          onRemove={handleRemoveFromCalendar}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>
              <div className="mt-2 text-sm text-gray-500 text-center">
                ← Scroll horizontally to see all days →
              </div>
            </div>
          </div>
        )}

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
    </DndProvider>
  );
}
