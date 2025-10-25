'use client';

import React, { useMemo, useState } from "react";
import { format, addDays, startOfWeek, isSameDay, startOfDay } from "date-fns";
import { X, Calendar as CalendarIcon, FilePenLine, FileText } from "lucide-react";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { useContentPipeline, ContentItem } from "@/hooks/useContentPipeline";

// =============================
// CalendarTab - Calendar View Only
// - Drag-and-drop scheduling for briefs and drafts
// - 2-week view with unscheduled items panel
// - Clear visual differentiation between content types
// =============================

interface CalendarTabProps {
  userToken: string;
  websiteToken: string;
  domain: string;
  conversationId?: string | null;
}

// ---- Utility ----
const classNames = (...xs: (string | false | null | undefined)[]) => xs.filter(Boolean).join(" ");

// ---- Components ----
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

function DraggableArticle({ item, isSelected }: { item: ContentItem; isSelected?: boolean }) {
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
  const iconColor = item.stage === "brief" ? "text-blue-600" : "text-amber-600";

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
        <Icon className={classNames("w-4 h-4", iconColor)} />
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

  return (
    <div
      ref={drop as any}
      className={classNames(
        "min-h-[200px] p-4 border border-gray-200 transition-all duration-200",
        isPastDate ? "bg-gray-50 opacity-60" : isToday ? "bg-blue-50 border-blue-300" : "bg-white",
        isOver && canDrop && "bg-blue-100 border-blue-400 ring-2 ring-blue-400 ring-inset shadow-inner",
        isOver && !canDrop && isPastDate && "bg-red-50 border-red-300 ring-2 ring-red-300 ring-inset",
        canDrop && !isOver && "border-dashed"
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className={classNames(
            "text-2xl font-bold",
            isPastDate ? "text-gray-400" : isToday ? "text-blue-600" : "text-gray-700"
          )}>
            {format(date, "d")}
          </span>
          {isOver && canDrop && (
            <div className="text-xs text-blue-600 font-medium mt-1">Drop to schedule</div>
          )}
          {isOver && !canDrop && isPastDate && (
            <div className="text-xs text-red-600 font-medium mt-1">Cannot schedule in past</div>
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

export default function CalendarTab({ userToken, websiteToken, domain, conversationId }: CalendarTabProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);

  // Use content pipeline hook
  const { items, loading, error, scheduleForPublication, removeFromSchedule, scheduleBriefForGeneration } = useContentPipeline({
    userToken,
    websiteToken,
    domain,
    conversationId
  });

  // Calculate week start for calendar display
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });

  // Calendar view helpers - show 2 weeks
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

      setSelectedArticleId(null);
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

  // Empty state - no scheduled items
  if (scheduledItems.length === 0 && unscheduledItems.length === 0) {
    return (
      <div className="bg-white border rounded-2xl p-12 text-center">
        <div className="max-w-md mx-auto">
          <CalendarIcon className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Content to Schedule</h3>
          <p className="text-gray-600 mb-6">
            Create briefs and articles in the Content Pipeline, then come back here to schedule them for generation and publication.
          </p>
          <button
            onClick={() => {
              // This would typically trigger navigation to pipeline tab
              const chatInput = document.querySelector('textarea[placeholder*="Ask"]') as HTMLTextAreaElement;
              if (chatInput) {
                chatInput.focus();
              }
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <FilePenLine className="w-4 h-4" />
            Go to Content Pipeline
          </button>
        </div>
      </div>
    );
  }

  // Empty state - items exist but none scheduled
  if (scheduledItems.length === 0 && unscheduledItems.length > 0) {
    return (
      <DndProvider backend={HTML5Backend}>
        <div className="bg-white border rounded-2xl p-8">
          <div className="max-w-2xl mx-auto text-center mb-8">
            <CalendarIcon className="w-12 h-12 mx-auto mb-4 text-indigo-600" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Schedule Your Content</h3>
            <p className="text-gray-600">
              Drag briefs from the left panel onto calendar dates to schedule them for article generation.
              Drag drafts to schedule for publication.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Unscheduled Items */}
            <div className="lg:col-span-1">
              <h3 className="font-medium mb-3">Unscheduled Items ({unscheduledItems.length})</h3>
              <div className="bg-gray-50 border rounded-xl p-4 min-h-[400px]">
                {unscheduledItems.map(item => (
                  <DraggableArticle
                    key={item.id}
                    item={item}
                    isSelected={selectedArticleId === item.id}
                  />
                ))}
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

              <div className="border rounded-xl overflow-x-auto">
                <div className="min-w-[1400px]">
                  <div className="grid grid-cols-7 bg-gray-50">
                    {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map(day => (
                      <div key={day} className="p-4 text-center text-base font-semibold border-r border-gray-200 last:border-r-0">
                        {day}
                      </div>
                    ))}
                  </div>

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
        </div>
      </DndProvider>
    );
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <main className="bg-white border rounded-2xl p-4 sm:p-6 space-y-4">
        {/* Header */}
        <div>
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Content Calendar</h2>
          <p className="text-sm text-gray-500">Schedule briefs for generation and articles for publication</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Unscheduled Items */}
          <div className="lg:col-span-1">
            <h3 className="font-medium mb-3">Unscheduled Items</h3>
            <div className="bg-gray-50 border rounded-xl p-4 min-h-[400px]">
              {unscheduledItems.length === 0 ? (
                <div className="text-sm text-gray-500">No unscheduled items</div>
              ) : (
                unscheduledItems.map(item => (
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

            <div className="border rounded-xl overflow-x-auto">
              <div className="min-w-[1400px]">
                <div className="grid grid-cols-7 bg-gray-50">
                  {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map(day => (
                    <div key={day} className="p-4 text-center text-base font-semibold border-r border-gray-200 last:border-r-0">
                      {day}
                    </div>
                  ))}
                </div>

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
      </main>
    </DndProvider>
  );
}
