'use client';

import React, { useMemo, useState } from "react";
import { format, addDays, startOfWeek, isSameDay, startOfDay } from "date-fns";
import { X, Calendar as CalendarIcon, FilePenLine, FileText, Eye, ChevronDown, ChevronUp } from "lucide-react";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { useContentPipeline, ContentItem } from "@/hooks/useContentPipeline";

// =============================
// CalendarTab - Calendar View Only
// - Drag-and-drop scheduling for briefs and drafts
// - 1-week view with unscheduled items pills at top
// - Clear visual differentiation with gradient backgrounds
// =============================

interface CalendarTabProps {
  userToken: string;
  websiteToken: string;
  domain: string;
  conversationId?: string | null;
}

// ---- Utility ----
const classNames = (...xs: (string | false | null | undefined)[]) => xs.filter(Boolean).join(" ");

// ---- Brief Details Modal ----
function BriefDetailsModal({ item }: { item: ContentItem }) {
  return (
    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Brief Details</DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium text-gray-700">Title</label>
          <p className="text-base text-gray-900 mt-1">{item.title}</p>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700">Topic Cluster</label>
          <p className="text-sm text-gray-600 mt-1">{item.cluster || "Uncategorized"}</p>
        </div>

        {item.keywords && item.keywords.length > 0 && (
          <div>
            <label className="text-sm font-medium text-gray-700">Target Keywords</label>
            <div className="flex flex-wrap gap-2 mt-2">
              {item.keywords.map((kw, i) => (
                <span
                  key={i}
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                >
                  {kw.term}
                  {kw.vol && <span className="ml-1 text-blue-600">({kw.vol})</span>}
                </span>
              ))}
            </div>
          </div>
        )}

        {item.wordGoal && (
          <div>
            <label className="text-sm font-medium text-gray-700">Word Goal</label>
            <p className="text-sm text-gray-600 mt-1">{item.wordGoal.toLocaleString()} words</p>
          </div>
        )}

        {(item.scheduledDraftAt || item.scheduledPublishAt) && (
          <div>
            <label className="text-sm font-medium text-gray-700">Scheduled For</label>
            <p className="text-sm text-gray-600 mt-1">
              {format(new Date(item.scheduledDraftAt || item.scheduledPublishAt!), "MMM d, yyyy 'at' h:mm a")}
            </p>
          </div>
        )}

        {item.status && (
          <div>
            <label className="text-sm font-medium text-gray-700">Status</label>
            <p className="text-sm text-gray-600 mt-1 capitalize">{item.status.replace('_', ' ')}</p>
          </div>
        )}
      </div>
    </DialogContent>
  );
}

// ---- Unscheduled Item Pill Component ----
function UnscheduledItemPill({ item }: { item: ContentItem }) {
  const [{ isDragging }, drag] = useDrag({
    type: "article",
    item: { id: item.id, title: item.title, stage: item.stage },
    canDrag: item.stage === "draft" || item.stage === "brief",
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  if (item.stage !== "draft" && item.stage !== "brief") return null;

  const Icon = item.stage === "brief" ? FilePenLine : FileText;
  const bgColor = item.stage === "brief"
    ? "bg-blue-100 hover:bg-blue-200 border-blue-300"
    : "bg-amber-100 hover:bg-amber-200 border-amber-300";
  const iconColor = item.stage === "brief" ? "text-blue-700" : "text-amber-700";

  return (
    <div
      ref={drag as any}
      className={classNames(
        "inline-flex items-center gap-1.5 px-2 py-1 rounded-full border cursor-move transition-all",
        bgColor,
        isDragging ? "opacity-50 shadow-lg" : "hover:shadow-md"
      )}
    >
      <Icon className={classNames("w-3.5 h-3.5 flex-shrink-0", iconColor)} />
      <span className="text-xs font-medium truncate max-w-[200px]">{item.title}</span>
      <Dialog>
        <DialogTrigger asChild>
          <button
            className="ml-0.5 p-0.5 rounded-full hover:bg-white/50 transition-colors flex-shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <Eye className="w-3 h-3" />
          </button>
        </DialogTrigger>
        <BriefDetailsModal item={item} />
      </Dialog>
    </div>
  );
}

// ---- Status Badge ----
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

// ---- Calendar Day Component ----
function CalendarDay({ date, items, onDrop, onRemove }: {
  date: Date;
  items: ContentItem[];
  onDrop: (articleId: string, date: Date) => void;
  onRemove: (articleId: string) => void;
}) {
  const isToday = isSameDay(date, new Date());
  const isPastDate = startOfDay(date) < startOfDay(new Date());

  const [{ isOver, canDrop }, drop] = useDrop({
    accept: "article",
    drop: (item: { id: string }) => onDrop(item.id, date),
    canDrop: () => !isPastDate,
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  });

  // Get gradient background based on items
  const getItemGradient = (item: ContentItem) => {
    if (item.stage === "published") {
      return "bg-gradient-to-br from-green-100 to-green-200 border-green-300 text-green-900";
    }
    if (item.status === 'generation_failed' || item.status === 'publishing_failed') {
      return "bg-gradient-to-br from-red-100 to-red-200 border-red-300 text-red-900";
    }
    if (item.stage === "brief") {
      return "bg-gradient-to-br from-blue-100 to-blue-200 border-blue-300 text-blue-900";
    }
    if (item.stage === "draft") {
      return "bg-gradient-to-br from-amber-100 to-amber-200 border-amber-300 text-amber-900";
    }
    return "bg-gradient-to-br from-gray-100 to-gray-200 border-gray-300 text-gray-900";
  };

  return (
    <div
      ref={drop as any}
      className={classNames(
        "min-h-[180px] p-3 border border-gray-200 transition-all duration-200",
        isPastDate ? "bg-gray-50 opacity-60" : isToday ? "bg-blue-50 border-blue-300 ring-1 ring-blue-300" : "bg-white",
        isOver && canDrop && "bg-blue-100 border-blue-400 ring-2 ring-blue-400 ring-inset shadow-inner",
        isOver && !canDrop && isPastDate && "bg-red-50 border-red-300 ring-2 ring-red-300 ring-inset",
        canDrop && !isOver && "border-dashed"
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <div>
          <span className={classNames(
            "text-lg font-bold",
            isPastDate ? "text-gray-400" : isToday ? "text-blue-600" : "text-gray-700"
          )}>
            {format(date, "d")}
          </span>
          {isOver && canDrop && (
            <div className="text-xs text-blue-600 font-medium mt-0.5">Drop here</div>
          )}
          {isOver && !canDrop && isPastDate && (
            <div className="text-xs text-red-600 font-medium mt-0.5">Past date</div>
          )}
        </div>
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id} className="group relative">
            <div className={classNames(
              "text-sm px-2.5 py-2 rounded-lg border transition-shadow",
              getItemGradient(item)
            )}>
              <div className="flex items-start gap-1.5">
                <div className="flex-1 min-w-0 pr-6">
                  <div className="flex items-center gap-1 flex-wrap">
                    <div className="font-semibold text-xs leading-snug truncate">{item.title}</div>
                    <StatusBadge status={item.status} scheduledPublishAt={item.scheduledPublishAt} />
                  </div>
                  <div className="text-xs opacity-75 mt-1 truncate">{item.cluster}</div>
                </div>
                <button
                  onClick={() => onRemove(item.id)}
                  className="absolute top-2 right-2 opacity-60 hover:opacity-100 transition-opacity shrink-0 hover:bg-black/10 rounded p-0.5"
                  title="Remove from schedule"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CalendarTab({ userToken, websiteToken, domain, conversationId }: CalendarTabProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [unscheduledCollapsed, setUnscheduledCollapsed] = useState(false);

  // Use content pipeline hook
  const { items, loading, error, scheduleForPublication, removeFromSchedule, scheduleBriefForGeneration } = useContentPipeline({
    userToken,
    websiteToken,
    domain,
    conversationId
  });

  // Calculate week start for calendar display
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });

  // Calendar view - show 2 weeks (14 days)
  const calendarDays = [];
  for (let i = 0; i < 14; i++) {
    calendarDays.push(addDays(weekStart, i));
  }

  const itemsByDate = useMemo(() => {
    const grouped: Record<string, ContentItem[]> = {};
    items.forEach(item => {
      const scheduledDate = item.scheduledPublishAt || item.scheduledDraftAt;
      if (scheduledDate) {
        const dateKey = format(new Date(scheduledDate), "yyyy-MM-dd");
        if (!grouped[dateKey]) grouped[dateKey] = [];
        grouped[dateKey].push(item);
      }
    });
    return grouped;
  }, [items]);

  const unscheduledItems = items.filter(item =>
    (item.stage === "draft" || item.stage === "brief") &&
    !item.scheduledPublishAt &&
    !item.scheduledDraftAt
  );

  const scheduledItems = items.filter(item =>
    item.scheduledPublishAt || item.scheduledDraftAt
  );

  const handleDropOnCalendar = async (articleId: string, date: Date) => {
    try {
      if (startOfDay(date) < startOfDay(new Date())) {
        alert('Cannot schedule content for past dates. Please choose today or a future date.');
        return;
      }

      const item = items.find(i => i.id === articleId);
      if (!item) {
        console.error('Item not found:', articleId);
        return;
      }

      if (item.stage === 'brief') {
        await scheduleBriefForGeneration(articleId, date);
      } else {
        await scheduleForPublication(articleId, date);
      }
    } catch (err) {
      console.error('Failed to schedule item:', err);
      alert('Failed to schedule item. Please try again.');
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

  if (loading) {
    return (
      <div className="bg-white border rounded-2xl p-8 text-center">
        <div className="text-gray-600">Loading calendar...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white border rounded-2xl p-8 text-center">
        <div className="text-red-600 mb-2">Error loading calendar</div>
        <div className="text-sm text-gray-500">{error}</div>
      </div>
    );
  }

  // Empty state - no content at all
  if (scheduledItems.length === 0 && unscheduledItems.length === 0) {
    return (
      <div className="bg-white border rounded-2xl p-12 text-center">
        <div className="max-w-md mx-auto">
          <CalendarIcon className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Content to Schedule</h3>
          <p className="text-gray-600 mb-6">
            Create briefs and articles in the Content Pipeline, then come back here to schedule them for generation and publication.
          </p>
        </div>
      </div>
    );
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <main className="bg-white border rounded-2xl p-4 sm:p-6 space-y-4">
        {/* Header */}
        <div>
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Content Calendar</h2>
          <p className="text-sm text-gray-500">Drag items onto dates to schedule for generation and publication</p>
        </div>

        {/* Unscheduled Items - Top Container (Hidden when empty) */}
        {unscheduledItems.length > 0 && (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
            <button
              onClick={() => setUnscheduledCollapsed(!unscheduledCollapsed)}
              className="flex items-center justify-between w-full mb-3"
            >
              <h3 className="font-medium text-sm">Unscheduled Items ({unscheduledItems.length})</h3>
              {unscheduledCollapsed ? (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronUp className="w-4 h-4 text-gray-500" />
              )}
            </button>

            {!unscheduledCollapsed && (
              <div className="flex flex-wrap gap-2">
                {unscheduledItems.map(item => (
                  <UnscheduledItemPill key={item.id} item={item} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Calendar Grid */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-base">
              {format(weekStart, "MMM d")} - {format(addDays(weekStart, 13), "MMM d, yyyy")}
            </h3>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentDate(addDays(currentDate, -14))}
                className="px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50 transition-colors"
              >
                Previous 2 Weeks
              </button>
              <button
                onClick={() => setCurrentDate(new Date())}
                className="px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50 transition-colors"
              >
                Today
              </button>
              <button
                onClick={() => setCurrentDate(addDays(currentDate, 14))}
                className="px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50 transition-colors"
              >
                Next 2 Weeks
              </button>
            </div>
          </div>

          <div className="border rounded-xl overflow-hidden">
            {/* Day Headers */}
            <div className="grid grid-cols-7 bg-gray-50">
              {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map(day => (
                <div key={day} className="p-3 text-center text-sm font-semibold border-r border-gray-200 last:border-r-0">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days */}
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
      </main>
    </DndProvider>
  );
}
