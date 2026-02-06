# Claude Dashboard Future Enhancements

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enhance the Claude Dashboard with polish features, improved UX, and comprehensive testing.

**Architecture:** Build on existing Electron + React architecture with incremental improvements.

**Tech Stack:** Existing stack plus: react-markdown, prism-react-renderer, vitest, @testing-library/react, react-window

---

## Phase 6: Chat Enhancements

### Task 6.1: Add Markdown Rendering to Chat Messages

**Files:**
- Modify: `src/components/chat/MessageBubble.tsx`
- Create: `src/components/chat/MarkdownContent.tsx`

**Step 1: Install dependencies**

```bash
npm install react-markdown remark-gfm
npm install -D @types/react-markdown
```

**Step 2: Create MarkdownContent component**

```typescript
// src/components/chat/MarkdownContent.tsx
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownContentProps {
  content: string;
}

export function MarkdownContent({ content }: MarkdownContentProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        code: ({ inline, children }) =>
          inline
            ? <code className="bg-gray-700 px-1 rounded">{children}</code>
            : <pre className="bg-gray-900 p-3 rounded overflow-x-auto"><code>{children}</code></pre>,
        a: ({ href, children }) =>
          <a href={href} className="text-blue-400 hover:underline" target="_blank" rel="noopener">{children}</a>,
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
```

**Step 3: Update MessageBubble to use MarkdownContent**

Replace simple text rendering with MarkdownContent for assistant messages.

**Step 4: Commit**

```bash
git commit -m "feat: add markdown rendering to chat messages"
```

---

### Task 6.2: Add Syntax Highlighting to Code Blocks

**Files:**
- Modify: `src/components/chat/MarkdownContent.tsx`
- Modify: `src/components/chat/ToolChip.tsx`

**Step 1: Install Prism**

```bash
npm install prism-react-renderer
```

**Step 2: Create CodeBlock component with syntax highlighting**

```typescript
import { Highlight, themes } from 'prism-react-renderer';

function CodeBlock({ code, language }: { code: string; language: string }) {
  return (
    <Highlight theme={themes.nightOwl} code={code} language={language}>
      {({ style, tokens, getLineProps, getTokenProps }) => (
        <pre style={style} className="p-3 rounded overflow-x-auto text-sm">
          {tokens.map((line, i) => (
            <div key={i} {...getLineProps({ line })}>
              {line.map((token, key) => (
                <span key={key} {...getTokenProps({ token })} />
              ))}
            </div>
          ))}
        </pre>
      )}
    </Highlight>
  );
}
```

**Step 3: Apply to ToolChip for JSON display**

**Step 4: Commit**

```bash
git commit -m "feat: add syntax highlighting to code blocks and tool output"
```

---

### Task 6.3: Add File Picker for Project Selection

**Files:**
- Modify: `electron/main.ts` - Add IPC handler for dialog
- Modify: `electron/preload.ts` - Expose dialog method
- Modify: `src/components/chat/ChatView.tsx` - Use file picker

**Step 1: Add IPC handler for folder picker**

```typescript
// In main.ts
ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory'],
    title: 'Select Project Directory',
  });
  return result.canceled ? null : result.filePaths[0];
});
```

**Step 2: Expose in preload**

```typescript
selectFolder: () => ipcRenderer.invoke('select-folder'),
```

**Step 3: Add browse button to ChatView**

**Step 4: Commit**

```bash
git commit -m "feat: add file picker for project selection in chat"
```

---

### Task 6.4: Implement Session Resume Functionality

**Files:**
- Modify: `src/components/sessions/SessionsView.tsx`
- Modify: `src/components/sessions/SessionCard.tsx`
- Modify: `electron/services/ChatService.ts`

**Step 1: Add resume button to SessionCard**

**Step 2: Pass sessionId to ChatService.start()**

**Step 3: Navigate to chat view with resumed session**

**Step 4: Commit**

```bash
git commit -m "feat: add ability to resume sessions from sessions view"
```

---

## Phase 7: Keyboard & Accessibility

### Task 7.1: Add Global Keyboard Shortcuts

**Files:**
- Create: `src/hooks/useKeyboardShortcuts.ts`
- Modify: `src/App.tsx`

**Shortcuts:**
- `Cmd+1-5` - Switch between views
- `Cmd+K` - Focus search (in Skills/Tools view)
- `Cmd+N` - New chat
- `Escape` - Clear search / close modals

**Step 1: Create useKeyboardShortcuts hook**

```typescript
export function useKeyboardShortcuts(shortcuts: Record<string, () => void>) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const key = `${e.metaKey ? 'cmd+' : ''}${e.key}`;
      shortcuts[key]?.();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [shortcuts]);
}
```

**Step 2: Integrate with App.tsx for view switching**

**Step 3: Commit**

```bash
git commit -m "feat: add keyboard shortcuts for navigation"
```

---

### Task 7.2: Add Command Palette (Cmd+K)

**Files:**
- Create: `src/components/common/CommandPalette.tsx`
- Modify: `src/App.tsx`

**Features:**
- Search across views, skills, tools
- Quick actions (start chat, toggle server)
- Keyboard navigation

**Step 1: Create CommandPalette component**

**Step 2: Add overlay and focus trap**

**Step 3: Integrate with global shortcuts**

**Step 4: Commit**

```bash
git commit -m "feat: add command palette with Cmd+K"
```

---

### Task 7.3: Improve Accessibility (ARIA)

**Files:**
- Modify: `src/components/layout/NavRail.tsx`
- Modify: `src/components/tools/McpServerCard.tsx`
- Modify: `src/components/skills/SkillCard.tsx`

**Step 1: Add aria-label to all interactive elements**

**Step 2: Add role attributes where needed**

**Step 3: Ensure focus indicators are visible**

**Step 4: Commit**

```bash
git commit -m "feat: improve accessibility with ARIA attributes"
```

---

## Phase 8: Performance & Polish

### Task 8.1: Add Virtual Scrolling for Long Lists

**Files:**
- Create: `src/components/common/VirtualList.tsx`
- Modify: `src/components/sessions/SessionsView.tsx`
- Modify: `src/components/skills/SkillsView.tsx`

**Step 1: Install react-window**

```bash
npm install react-window
npm install -D @types/react-window
```

**Step 2: Create VirtualList wrapper component**

**Step 3: Apply to SessionsView and SkillsView**

**Step 4: Commit**

```bash
git commit -m "feat: add virtual scrolling for large lists"
```

---

### Task 8.2: Add Skeleton Loading States

**Files:**
- Create: `src/components/common/Skeleton.tsx`
- Modify: All view components

**Step 1: Create Skeleton component**

```typescript
export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-gray-700 rounded ${className}`} />
  );
}

export function CardSkeleton() {
  return (
    <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
      <Skeleton className="h-5 w-3/4 mb-2" />
      <Skeleton className="h-4 w-1/2 mb-3" />
      <Skeleton className="h-3 w-full" />
    </div>
  );
}
```

**Step 2: Replace spinner loading with skeleton loaders**

**Step 3: Commit**

```bash
git commit -m "feat: add skeleton loading states for better UX"
```

---

### Task 8.3: Persist User Preferences

**Files:**
- Create: `electron/services/PreferencesService.ts`
- Modify: `electron/main.ts`
- Create: `src/hooks/usePreferences.ts`

**Preferences to persist:**
- Active view
- Stats period selection
- Skills search query
- Window size and position

**Step 1: Install electron-store**

```bash
npm install electron-store
```

**Step 2: Create PreferencesService**

**Step 3: Create usePreferences hook**

**Step 4: Integrate with App and views**

**Step 5: Commit**

```bash
git commit -m "feat: persist user preferences across sessions"
```

---

### Task 8.4: Add Settings Panel

**Files:**
- Create: `src/components/settings/SettingsModal.tsx`
- Modify: `src/components/layout/TitleBar.tsx`

**Settings:**
- Theme (dark only for now, prepare for light)
- Default stats period
- Notification preferences

**Step 1: Create SettingsModal component**

**Step 2: Wire up Settings button in TitleBar**

**Step 3: Commit**

```bash
git commit -m "feat: add settings panel"
```

---

## Phase 9: Testing

### Task 9.1: Set Up Vitest

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json`

**Step 1: Install Vitest**

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

**Step 2: Create vitest config**

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
});
```

**Step 3: Update package.json test script**

**Step 4: Commit**

```bash
git commit -m "chore: set up Vitest for testing"
```

---

### Task 9.2: Add Service Tests

**Files:**
- Create: `electron/services/__tests__/CostService.test.ts`
- Create: `electron/services/__tests__/SkillService.test.ts`

**Test coverage:**
- CostService: Price calculation, cache discounts, aggregation
- SkillService: Frontmatter parsing, usage stats

**Step 1: Write CostService tests**

```typescript
describe('CostService', () => {
  it('calculates Opus pricing correctly', () => {
    // ...
  });

  it('applies 90% cache discount', () => {
    // ...
  });
});
```

**Step 2: Write SkillService tests**

**Step 3: Commit**

```bash
git commit -m "test: add unit tests for CostService and SkillService"
```

---

### Task 9.3: Add Component Tests

**Files:**
- Create: `src/components/chat/__tests__/MessageBubble.test.tsx`
- Create: `src/components/tools/__tests__/McpServerCard.test.tsx`

**Step 1: Write MessageBubble tests**

**Step 2: Write McpServerCard tests**

**Step 3: Commit**

```bash
git commit -m "test: add component tests for MessageBubble and McpServerCard"
```

---

### Task 9.4: Add Hook Tests

**Files:**
- Create: `src/hooks/__tests__/useChat.test.ts`
- Create: `src/hooks/__tests__/useMcpServers.test.ts`

**Step 1: Mock electronAPI**

**Step 2: Write hook tests with React Testing Library**

**Step 3: Commit**

```bash
git commit -m "test: add hook tests for useChat and useMcpServers"
```

---

## Phase 10: Data Export & Analytics

### Task 10.1: Add CSV Export for Stats

**Files:**
- Create: `src/utils/export.ts`
- Modify: `src/components/stats/StatsView.tsx`

**Step 1: Create CSV export utility**

```typescript
export function exportToCSV(data: any[], filename: string) {
  const headers = Object.keys(data[0]);
  const csv = [
    headers.join(','),
    ...data.map(row => headers.map(h => row[h]).join(','))
  ].join('\n');

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
}
```

**Step 2: Add export button to StatsView**

**Step 3: Commit**

```bash
git commit -m "feat: add CSV export for usage statistics"
```

---

### Task 10.2: Add Usage Charts (Optional)

**Files:**
- Create: `src/components/stats/UsageChart.tsx`
- Modify: `src/components/stats/StatsView.tsx`

**Step 1: Install recharts**

```bash
npm install recharts
```

**Step 2: Create line chart for daily usage**

**Step 3: Create pie chart for model breakdown**

**Step 4: Commit**

```bash
git commit -m "feat: add usage charts to stats dashboard"
```

---

## Priority Order

1. **High Priority** (User Experience)
   - Task 6.1: Markdown rendering
   - Task 6.4: Session resume
   - Task 7.1: Keyboard shortcuts

2. **Medium Priority** (Polish)
   - Task 6.2: Syntax highlighting
   - Task 6.3: File picker
   - Task 8.2: Skeleton loading
   - Task 8.4: Settings panel

3. **Low Priority** (Infrastructure)
   - Task 9.1-9.4: Testing
   - Task 8.1: Virtual scrolling
   - Task 8.3: Preferences
   - Task 10.1-10.2: Export & charts

---

## Estimated Effort

| Phase | Tasks | Estimated Time |
|-------|-------|----------------|
| Phase 6: Chat Enhancements | 4 tasks | 4-6 hours |
| Phase 7: Keyboard & Accessibility | 3 tasks | 3-4 hours |
| Phase 8: Performance & Polish | 4 tasks | 4-5 hours |
| Phase 9: Testing | 4 tasks | 4-6 hours |
| Phase 10: Data Export | 2 tasks | 2-3 hours |

**Total:** 17-24 hours of development time

---

## Notes

- All tasks are independent and can be implemented in any order
- Testing (Phase 9) can be done incrementally alongside other phases
- Consider user feedback before implementing Phase 10 charts
