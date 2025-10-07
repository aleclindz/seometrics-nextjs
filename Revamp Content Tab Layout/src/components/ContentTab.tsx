import React, { useMemo, useState } from "react";
import { format, addDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameDay, isSameMonth } from "date-fns";
import { Check, Clock, Play, Settings, CalendarDays, FilePenLine, FileText, Rocket, ChevronUp, ChevronDown, Filter, Search, ExternalLink, X, Eye } from "lucide-react";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";

// =============================
// ContentTab - Table & Calendar Views
// - Table mode: sortable columns, filtering, different row styles per stage
// - Calendar mode: drag-and-drop scheduling, full month view
// - Clear visual differentiation between briefs, drafts, published
// =============================

// ---- Types ----
type ArticleStage = "brief" | "draft" | "published";
type SortField = "title" | "cluster" | "stage" | "publishDate" | "keywords" | "wordGoal";
type SortDirection = "asc" | "desc";

type Keyword = { term: string; vol?: number };

type ContentItem = {
  id: string;
  cluster: string;
  stage: ArticleStage;
  title: string;
  brief?: string;
  keywords?: Keyword[];
  wordGoal?: number;
  createdAt?: string;
  scheduledDraftAt?: string | null;
  scheduledPublishAt?: string | null;
  url?: string;
  flags?: {
    autoGenerate?: boolean;
    autoPublish?: boolean;
  };
};

// ---- Demo data ----
const seedData: ContentItem[] = [
  {
    id: "1",
    cluster: "Logistics & Compliance",
    stage: "brief",
    title: "The Complete Guide to Logistics & Compliance in 2025",
    brief: "Foundational overview of logistics regulations and practical compliance steps.",
    keywords: [
      { term: "logistics compliance 2025" },
      { term: "importer regulations guide" },
      { term: "port everglades compliance" },
    ],
    wordGoal: 3500,
    createdAt: addDays(new Date(), -3).toISOString(),
    scheduledDraftAt: addDays(new Date(), 1).toISOString(),
    scheduledPublishAt: null,
    flags: { autoGenerate: true, autoPublish: false },
  },
  {
    id: "2",
    cluster: "Logistics & Compliance",
    stage: "draft",
    title: "Bulk Importer Port Everglades - South Florida",
    brief: "Step-by-step for bulk importers using Port Everglades.",
    keywords: [
      { term: "bulk importer port everglades" },
      { term: "container logistics south florida" },
    ],
    wordGoal: 3500,
    createdAt: addDays(new Date(), -4).toISOString(),
    scheduledDraftAt: null,
    scheduledPublishAt: addDays(new Date(), 5).toISOString(),
    flags: { autoGenerate: false, autoPublish: true },
  },
  {
    id: "3",
    cluster: "Foodservice & Retail",
    stage: "brief",
    title: "The Complete Guide to Foodservice & Retail in 2025",
    brief: "Retail playbook for restaurant distributors.",
    keywords: [
      { term: "distributor for restaurants florida" },
      { term: "bulk imports distributor" },
    ],
    wordGoal: 3500,
    createdAt: addDays(new Date(), -5).toISOString(),
    scheduledDraftAt: addDays(new Date(), 3).toISOString(),
    scheduledPublishAt: null,
    flags: { autoGenerate: true, autoPublish: false },
  },
  {
    id: "4",
    cluster: "Suppliers & Procurement",
    stage: "draft",
    title: "Best Supplier Near Me South Florida - 2025 Guide",
    brief: "Supplier selection rubric and local sourcing.",
    keywords: [{ term: "supplier near me south florida" }],
    wordGoal: 2000,
    createdAt: addDays(new Date(), -10).toISOString(),
    scheduledDraftAt: null,
    scheduledPublishAt: addDays(new Date(), 7).toISOString(),
    flags: { autoGenerate: false, autoPublish: true },
  },
  {
    id: "5",
    cluster: "Suppliers & Procurement",
    stage: "published",
    title: "5 Best Suppliers & Procurement Tools for 2025 in South Florida",
    url: "https://example.com/suppliers-and-procurement/best-supplier-near-me-south-florida",
    wordGoal: 2000,
    createdAt: addDays(new Date(), -15).toISOString(),
    scheduledPublishAt: addDays(new Date(), -5).toISOString(),
    flags: { autoGenerate: false, autoPublish: false },
  },
  {
    id: "6",
    cluster: "Foodservice & Retail",
    stage: "draft",
    title: "Miami Restaurant Supply Chain Optimization",
    brief: "How Miami restaurants can optimize their supply chains.",
    keywords: [{ term: "miami restaurant supply chain" }, { term: "restaurant logistics florida" }],
    wordGoal: 2800,
    createdAt: addDays(new Date(), -6).toISOString(),
    scheduledPublishAt: null,
    flags: { autoGenerate: false, autoPublish: false },
  },
];

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
  return (
    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="text-left">{item.title}</DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <StageBadge stage={item.stage} />
          <ClusterTag cluster={item.cluster} />
        </div>
        
        {item.brief && (
          <div>
            <h4 className="font-medium mb-2">
              {item.stage === "brief" ? "Brief Description" : "Article Description"}
            </h4>
            <p className="text-gray-700 leading-relaxed">{item.brief}</p>
          </div>
        )}
        
        {item.keywords && item.keywords.length > 0 && (
          <div>
            <h4 className="font-medium mb-2">Keywords</h4>
            <div className="flex flex-wrap gap-2">
              {item.keywords.map((keyword, index) => (
                <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 text-sm rounded">
                  {keyword.term}
                </span>
              ))}
            </div>
          </div>
        )}
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          {item.wordGoal && (
            <div>
              <span className="font-medium">Target Length:</span>
              <span className="ml-2">{item.wordGoal.toLocaleString()} words</span>
            </div>
          )}
          
          {item.createdAt && (
            <div>
              <span className="font-medium">Created:</span>
              <span className="ml-2">{format(new Date(item.createdAt), "MMM d, yyyy")}</span>
            </div>
          )}
          
          {item.scheduledPublishAt && (
            <div>
              <span className="font-medium">Scheduled:</span>
              <span className="ml-2">{format(new Date(item.scheduledPublishAt), "MMM d, yyyy")}</span>
            </div>
          )}
          
          {item.url && (
            <div>
              <span className="font-medium">Published URL:</span>
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

function TableRow({ item, onAdvance, onScheduleForPublication, onClusterClick }: {
  item: ContentItem;
  onAdvance: (id: string) => void;
  onScheduleForPublication: (id: string) => void;
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
            <div className="font-medium text-sm">{item.title}</div>
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
            <button 
              onClick={() => onAdvance(item.id)}
              className="px-2 py-1 text-xs rounded border bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
            >
              Generate Draft
            </button>
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
      ref={drag}
      className={classNames(
        "p-2 mb-2 border rounded-lg cursor-move bg-white shadow-sm",
        isDragging ? "opacity-50" : "hover:shadow-md",
        isSelected ? "ring-2 ring-blue-500 bg-blue-50" : ""
      )}
    >
      <div className="flex items-center gap-2 mb-1">
        <FileText className="w-4 h-4 text-amber-600" />
        <span className="text-sm font-medium truncate">{item.title}</span>
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
  const [{ isOver }, drop] = useDrop({
    accept: "article",
    drop: (item: { id: string }) => onDrop(item.id, date),
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  });

  const isToday = isSameDay(date, new Date());

  return (
    <div
      ref={drop}
      className={classNames(
        "min-h-[140px] p-3 border border-gray-200",
        isToday ? "bg-blue-50 border-blue-300" : "bg-white",
        isOver ? "bg-blue-100" : ""
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <span className={classNames(
          "text-sm font-medium",
          isToday ? "font-bold text-blue-600" : "text-gray-700"
        )}>
          {format(date, "d")}
        </span>
        <span className="text-xs text-gray-500">
          {format(date, "EEE")}
        </span>
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id} className="group relative">
            <div className="text-xs bg-amber-100 text-amber-800 px-2 py-2 rounded-lg border border-amber-200">
              <div className="flex items-start justify-between gap-1">
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{item.title}</div>
                  <div className="text-amber-600 mt-1">{item.cluster}</div>
                </div>
                <button
                  onClick={() => onRemove(item.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 p-1 rounded hover:bg-amber-200"
                  title="Remove from schedule"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ContentTab() {
  const [mode, setMode] = useState<"table" | "calendar">("table");
  const [items, setItems] = useState<ContentItem[]>(seedData);
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

  const advanceToDraft = (id: string) => {
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, stage: "draft" as ArticleStage } : item
    ));
  };

  const scheduleForPublication = (id: string) => {
    setSelectedArticleId(id);
    setMode("calendar");
  };

  const handleDropOnCalendar = (articleId: string, date: Date) => {
    setItems(prev => prev.map(item => 
      item.id === articleId ? { 
        ...item, 
        scheduledPublishAt: date.toISOString()
      } : item
    ));
    // Clear selection after scheduling
    setSelectedArticleId(null);
  };

  const handleRemoveFromCalendar = (articleId: string) => {
    setItems(prev => prev.map(item => 
      item.id === articleId ? { 
        ...item, 
        scheduledPublishAt: null
      } : item
    ));
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
                      onAdvance={advanceToDraft} 
                      onScheduleForPublication={scheduleForPublication}
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
                <h3 className="font-medium">
                  {format(weekStart, "MMM d")} - {format(addDays(weekStart, 13), "MMM d, yyyy")}
                </h3>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setCurrentDate(addDays(currentDate, -14))}
                    className="px-3 py-1 text-sm border rounded-lg hover:bg-gray-50"
                  >
                    Previous 2 Weeks
                  </button>
                  <button 
                    onClick={() => setCurrentDate(new Date())}
                    className="px-3 py-1 text-sm border rounded-lg hover:bg-gray-50"
                  >
                    Today
                  </button>
                  <button 
                    onClick={() => setCurrentDate(addDays(currentDate, 14))}
                    className="px-3 py-1 text-sm border rounded-lg hover:bg-gray-50"
                  >
                    Next 2 Weeks
                  </button>
                </div>
              </div>
              
              <div className="border rounded-xl overflow-hidden">
                {/* Calendar Header */}
                <div className="grid grid-cols-7 bg-gray-50">
                  {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(day => (
                    <div key={day} className="p-3 text-center text-sm font-medium border-r border-gray-200 last:border-r-0">
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