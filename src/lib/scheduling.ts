/**
 * Scheduling utilities for automated content generation and publishing
 * Based on subscription plan tiers: Starter (3/week), Pro (1/day), Scale (3/day)
 */

export type PlanTier = 'starter' | 'pro' | 'scale';

export interface SchedulePattern {
  daysOfWeek: number[]; // 0 = Sunday, 1 = Monday, etc.
  timesPerDay: string[]; // Array of times in "HH:mm" format (24-hour)
  itemsPerWeek: number;
}

/**
 * Get the scheduling pattern for a given plan tier
 */
export function getSchedulePattern(planTier: PlanTier): SchedulePattern {
  switch (planTier) {
    case 'starter':
      // 3 articles per week: Monday, Wednesday, Friday at 9:00 AM
      return {
        daysOfWeek: [1, 3, 5], // Mon, Wed, Fri
        timesPerDay: ['09:00'],
        itemsPerWeek: 3,
      };

    case 'pro':
      // 1 article per day: Every day at 9:00 AM
      return {
        daysOfWeek: [0, 1, 2, 3, 4, 5, 6], // All days
        timesPerDay: ['09:00'],
        itemsPerWeek: 7,
      };

    case 'scale':
      // 3 articles per day: Every day at 9:00 AM, 1:00 PM, 5:00 PM
      return {
        daysOfWeek: [0, 1, 2, 3, 4, 5, 6], // All days
        timesPerDay: ['09:00', '13:00', '17:00'],
        itemsPerWeek: 21,
      };

    default:
      // Default to starter plan
      return {
        daysOfWeek: [1, 3, 5],
        timesPerDay: ['09:00'],
        itemsPerWeek: 3,
      };
  }
}

/**
 * Check if a given date is a weekend (Saturday or Sunday)
 */
export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

/**
 * Calculate schedule dates for a given number of items based on plan tier
 * Starts from tomorrow and distributes evenly according to plan pattern
 */
export function calculateSchedule(
  itemCount: number,
  planTier: PlanTier,
  startDate?: Date
): Date[] {
  const schedule: Date[] = [];
  const pattern = getSchedulePattern(planTier);

  // Start from tomorrow if not specified
  const start = startDate || new Date();
  start.setDate(start.getDate() + 1);
  start.setHours(0, 0, 0, 0); // Reset to midnight

  let currentDate = new Date(start);
  let timeIndex = 0;
  let itemsScheduled = 0;

  // Generate schedule dates
  while (itemsScheduled < itemCount) {
    const dayOfWeek = currentDate.getDay();

    // Check if current day is in the allowed days for this plan
    if (pattern.daysOfWeek.includes(dayOfWeek)) {
      // Schedule items for each time slot on this day
      for (const time of pattern.timesPerDay) {
        if (itemsScheduled >= itemCount) break;

        const [hours, minutes] = time.split(':').map(Number);
        const scheduledDate = new Date(currentDate);
        scheduledDate.setHours(hours, minutes, 0, 0);

        schedule.push(scheduledDate);
        itemsScheduled++;
      }
    }

    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1);

    // Safety check: don't schedule more than 90 days out
    if (currentDate.getTime() - start.getTime() > 90 * 24 * 60 * 60 * 1000) {
      break;
    }
  }

  return schedule;
}

/**
 * Format a schedule summary for display
 */
export function formatScheduleSummary(
  briefCount: number,
  articleCount: number,
  schedules: Date[],
  planTier: PlanTier
): string {
  const totalItems = briefCount + articleCount;
  const pattern = getSchedulePattern(planTier);

  if (totalItems === 0) {
    return 'No items to schedule.';
  }

  const firstDate = schedules[0];
  const lastDate = schedules[schedules.length - 1];

  const dateFormat = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  let summary = `✅ **Scheduled ${totalItems} items!**\n\n`;

  if (briefCount > 0) {
    summary += `📝 **${briefCount} briefs** will be generated and published\n`;
  }

  if (articleCount > 0) {
    summary += `📄 **${articleCount} articles** will be published\n`;
  }

  summary += `\n🗓️ **Schedule**: Starting ${dateFormat.format(firstDate)}`;

  if (schedules.length > 1) {
    summary += ` through ${dateFormat.format(lastDate)}`;
  }

  summary += '\n\n';

  // Add pattern description
  switch (planTier) {
    case 'starter':
      summary += '📅 Publishing **3 times per week** (Mon, Wed, Fri at 9:00 AM)';
      break;
    case 'pro':
      summary += '📅 Publishing **once daily** at 9:00 AM';
      break;
    case 'scale':
      summary += '📅 Publishing **3 times daily** (9:00 AM, 1:00 PM, 5:00 PM)';
      break;
  }

  return summary;
}

/**
 * Get next N schedule dates for a plan tier
 */
export function getNextScheduleDates(
  count: number,
  planTier: PlanTier,
  startDate?: Date
): Date[] {
  return calculateSchedule(count, planTier, startDate);
}

/**
 * Check if a date matches the plan's schedule pattern
 */
export function isScheduledDay(date: Date, planTier: PlanTier): boolean {
  const pattern = getSchedulePattern(planTier);
  const dayOfWeek = date.getDay();
  return pattern.daysOfWeek.includes(dayOfWeek);
}
