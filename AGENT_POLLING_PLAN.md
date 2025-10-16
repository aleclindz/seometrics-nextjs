# Agent Chat & Strategy Polling Implementation Plan

## Problem Summary

The agent chat and strategy pages don't automatically update when background tasks complete. The backend correctly generates briefs and saves callback messages to the database, but the frontend never fetches them.

### Root Causes:
1. **ChatInterface** loads messages once, never polls for updates
2. **StrategyTabV2** loads status once, requires manual refresh
3. **Brief counts are inaccurate** - callbacks fire but UI shows stale data
4. **No real-time feedback** - users must refresh to see completed work

## Solution Architecture

### Phase 1: ChatInterface Polling (HIGH PRIORITY)

**File**: `/src/components/website-chat/ChatInterface.tsx`

**Changes**:
1. Add polling interval when conversation is active
2. Fetch new messages every 2-3 seconds during active tasks
3. Stop polling when agent is idle
4. Detect new messages and auto-scroll to bottom

**Implementation**:
```typescript
// Add state for polling control
const [isPolling, setIsPolling] = useState(false);
const [lastMessageCount, setLastMessageCount] = useState(0);

// Polling effect
useEffect(() => {
  if (!conversationId || !isPolling) return;

  const pollInterval = setInterval(async () => {
    const response = await fetch(`/api/agent/conversations?conversationId=${conversationId}`);
    const data = await response.json();
    
    if (data.messages.length > lastMessageCount) {
      setMessages(data.messages);
      setLastMessageCount(data.messages.length);
      scrollToBottom();
    }
  }, 2500); // Poll every 2.5 seconds

  return () => clearInterval(pollInterval);
}, [conversationId, isPolling, lastMessageCount]);

// Start polling when sending message
const handleSendMessage = async (content: string) => {
  setIsPolling(true); // Start polling
  // ... existing logic
};

// Stop polling when assistant responds (check for action completion)
useEffect(() => {
  const lastMessage = messages[messages.length - 1];
  if (lastMessage?.role === 'assistant' && !lastMessage?.metadata?.pending) {
    setIsPolling(false); // Stop polling when work complete
  }
}, [messages]);
```

**Success Criteria**:
- ✅ New messages appear automatically without refresh
- ✅ Polling starts when user sends message
- ✅ Polling stops when task completes
- ✅ No excessive API calls (max 1 per 2.5 seconds)

---

### Phase 2: Strategy Status Polling

**File**: `/src/components/strategy/StrategyTabV2.tsx`

**Changes**:
1. Poll strategy status every 3 seconds during initialization
2. Auto-update cluster count and brief count
3. Stop polling when status = 'complete'

**Implementation**:
```typescript
const [isInitializing, setIsInitializing] = useState(false);

useEffect(() => {
  if (!isInitializing) return;

  const pollInterval = setInterval(async () => {
    const response = await fetch(`/api/strategy/status?websiteToken=${websiteToken}`);
    const data = await response.json();
    
    setStatus(data);
    
    if (data.initialized && data.briefsGenerated > 0) {
      setIsInitializing(false); // Stop polling
      await loadClusters(); // Refresh clusters
    }
  }, 3000);

  return () => clearInterval(pollInterval);
}, [isInitializing, websiteToken]);

// Trigger polling when user clicks "Initialize Strategy"
const handleInitializeStrategy = async () => {
  setIsInitializing(true);
  // ... trigger discovery
};
```

---

### Phase 3: Accurate Brief Counts

**Problem**: Agent says "0 article briefs ready" even after generating briefs.

**Root Cause**: Agent response uses stale data from BEFORE brief generation completes.

**File**: `/src/app/api/agent/chat/route.ts`

**Fix**: Query briefs AFTER tool execution completes, not before.

**Implementation**:
```typescript
// AFTER tool execution (discovery, brief generation, etc.)
if (toolName === 'initialize_strategy' || toolName === 'generate_briefs') {
  // Wait a moment for database writes to complete
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Re-fetch brief count for accurate response
  const { count: briefCount } = await supabase
    .from('article_briefs')
    .select('*', { count: 'exact', head: true })
    .eq('user_token', userToken)
    .eq('website_token', websiteToken)
    .in('status', ['draft', 'queued']);
  
  // Include accurate count in response
  responseContext.briefsReady = briefCount || 0;
}
```

---

### Phase 4: Progress Indicators

**Add visual feedback** for long-running operations:

1. **During strategy initialization**:
   - Show spinner with text: "Discovering keywords..."
   - Update to: "Generating topic clusters..."
   - Update to: "Creating article briefs..."

2. **During brief generation**:
   - Show: "Generating 6 article briefs..." with progress bar
   - Update: "3/6 briefs complete..."

3. **During article generation**:
   - Show: "Writing article (1-2 minutes)..."

**File**: `/src/components/website-chat/ActionCards.tsx`

Add `ProgressCard` component type that shows:
- Current step
- Progress percentage
- Estimated time remaining

---

## Implementation Order

### Week 1 (Critical Fixes):
1. ✅ **Day 1**: Add ChatInterface polling (Phase 1)
2. ✅ **Day 2**: Add Strategy status polling (Phase 2)
3. ✅ **Day 3**: Fix brief count accuracy (Phase 3)
4. ✅ **Day 4**: Test end-to-end workflows
5. ✅ **Day 5**: Deploy and monitor

### Week 2 (Enhancements):
1. Add progress indicators (Phase 4)
2. Add Supabase realtime subscriptions (optional, better than polling)
3. Add WebSocket support for instant updates

---

## Testing Checklist

After implementation, test these scenarios:

### ChatInterface Polling:
- [ ] User asks agent to initialize strategy
- [ ] Initial response shows immediately
- [ ] Callback message appears automatically (no refresh)
- [ ] Brief count is accurate (not 0)
- [ ] Polling stops when task completes
- [ ] No console errors

### Strategy Page:
- [ ] User clicks "Initialize Strategy"
- [ ] Page shows "Initializing..." state
- [ ] Clusters appear automatically when ready
- [ ] Brief count updates automatically
- [ ] No manual refresh needed

### Brief Generation:
- [ ] User generates briefs via agent
- [ ] Initial message shows
- [ ] Completion message appears automatically
- [ ] Brief count in agent response is accurate
- [ ] Strategy page updates automatically

---

## Performance Considerations

**Polling Frequency**:
- ChatInterface: 2.5 seconds (only during active tasks)
- Strategy: 3 seconds (only during initialization)
- Max concurrent polls: 2 (chat + strategy)

**API Load**:
- Before: 0 polling requests/second
- After: ~0.4 requests/second during active tasks
- Impact: Negligible (< 1% of current load)

**Alternative (Future Enhancement)**:
Replace polling with **Supabase Realtime Subscriptions**:
```typescript
supabase
  .channel('agent_conversations')
  .on('postgres_changes', { 
    event: 'INSERT', 
    schema: 'public', 
    table: 'agent_conversations',
    filter: `conversation_id=eq.${conversationId}`
  }, (payload) => {
    // New message arrived, update UI instantly
    setMessages(prev => [...prev, payload.new]);
  })
  .subscribe();
```

**Benefit**: Real-time updates without polling overhead.

---

## Success Metrics

After implementation, measure:
1. **User satisfaction**: No more "refresh to see updates" confusion
2. **Task completion**: Brief counts are accurate 100% of time
3. **Performance**: Page load time < 2s, polling adds < 100ms
4. **Reliability**: Background tasks complete and update UI 100% of time

---

## Rollback Plan

If polling causes issues:
1. Add feature flag: `ENABLE_POLLING=false`
2. Revert to manual refresh buttons
3. Investigate and fix root cause
4. Re-enable with better safeguards

---

## Notes

- Polling is a **temporary solution** - realtime subscriptions are better
- Keep polling intervals > 2 seconds to avoid rate limits
- Add exponential backoff if polling fails
- Add UI indication that polling is active (optional loading spinner)
