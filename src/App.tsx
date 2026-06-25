import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import TodoItem from './components/TodoItem';
import type { Todo, List, Priority } from './utils/todoUtils';
import {
  addTodo,
  toggleTodo,
  deleteTodo,
  reorderTodos,
} from './utils/todoUtils';

function App() {
  const { t, i18n } = useTranslation();

  // === New practical data model ===
  const [lists, setLists] = useState<List[]>(() => {
    try {
      const saved = localStorage.getItem('lists-v1');
      return saved ? JSON.parse(saved) : [
        { id: 'inbox', name: 'Inbox' },
        { id: 'work', name: 'Work' },
      ];
    } catch { return [{ id: 'inbox', name: 'Inbox' }]; }
  });

  const [currentListId, setCurrentListId] = useState<string>(() => {
    return localStorage.getItem('currentListId') || 'inbox';
  });

  const [todos, setTodos] = useState<Todo[]>(() => {
    try {
      const saved = localStorage.getItem('todos-v2');
      if (saved) return JSON.parse(saved);

      // First time user - add some nice sample tasks
      const sampleDate = new Date();
      sampleDate.setDate(sampleDate.getDate() + 1);
      const tomorrow = sampleDate.toISOString().slice(0, 10);

      return [
        {
          id: crypto.randomUUID(),
          text: "Taskora'ya hoş geldiniz!",
          completed: false,
          priority: "high",
          dueDate: tomorrow,
          listId: "inbox"
        },
        {
          id: crypto.randomUUID(),
          text: "Öncelik ve tarih ekleyerek yeni görev deneyin",
          completed: false,
          priority: "medium",
          listId: "inbox"
        },
        {
          id: crypto.randomUUID(),
          text: "Sürükleyerek sıralamayı değiştirin",
          completed: true,
          priority: "low",
          listId: "inbox"
        }
      ];
    } catch { return []; }
  });

  // UI state
  const [inputValue, setInputValue] = useState('');
  const [selectedPriority, setSelectedPriority] = useState<Priority>('medium');
  const [selectedDueDate, setSelectedDueDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'today' | 'completed'>('all');

  // Settings Modal
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [licenseKey, setLicenseKey] = useState(() => localStorage.getItem('license-key') || '');
  const [isPro, setIsPro] = useState(() => !!localStorage.getItem('license-key'));

  // Drag state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Theme
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const saved = localStorage.getItem('theme-v1');
    if (saved === 'dark') return true;
    if (saved === 'light') return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const [accentColor, setAccentColor] = useState<'indigo' | 'violet' | 'emerald' | 'rose'>('indigo');

  // Language
  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  // === Persistence ===
  useEffect(() => {
    try { localStorage.setItem('lists-v1', JSON.stringify(lists)); } catch {}
  }, [lists]);

  useEffect(() => {
    try { localStorage.setItem('currentListId', currentListId); } catch {}
  }, [currentListId]);

  useEffect(() => {
    try { localStorage.setItem('todos-v2', JSON.stringify(todos)); } catch {}
  }, [todos]);

  // Accent color persistence
  useEffect(() => {
    const saved = localStorage.getItem('accent-v1');
    if (saved && ['indigo','violet','emerald','rose'].includes(saved)) {
      setAccentColor(saved as any);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('accent-v1', accentColor);
    const root = document.documentElement;
    root.classList.remove('accent-indigo', 'accent-violet', 'accent-emerald', 'accent-rose');
    root.classList.add(`accent-${accentColor}`);
  }, [accentColor]);

  // Migrate old data (todos-v1) to new model if exists
  useEffect(() => {
    const oldTodos = localStorage.getItem('todos-v1');
    const newTodos = localStorage.getItem('todos-v2');
    
    if (oldTodos && !newTodos) {
      try {
        const old = JSON.parse(oldTodos);
        if (Array.isArray(old) && old.length > 0) {
          const migrated = old.map((t: any) => ({
            ...t,
            priority: t.priority || 'medium',
            listId: t.listId || 'inbox',
            dueDate: t.dueDate || undefined
          }));
          setTodos(migrated);
          localStorage.setItem('todos-v2', JSON.stringify(migrated));
          localStorage.removeItem('todos-v1'); // clean up
        }
      } catch {}
    }
  }, []);

  // === Keyboard Shortcuts (practical for power users) ===
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        if (e.key === 'Escape') {
          (e.target as HTMLElement).blur();
        }
        return;
      }

      if (e.key.toLowerCase() === 'n' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        const input = document.querySelector('input[placeholder*="Yeni görev"], input[placeholder*="Add a new"], input[placeholder*="görev ekle"]') as HTMLInputElement;
        input?.focus();
      }

      if (e.key === '/') {
        e.preventDefault();
        const search = document.querySelector('input[placeholder*="ara"], input[placeholder*="Search"]') as HTMLInputElement;
        search?.focus();
      }

      if (e.key === '?') {
        e.preventDefault();
        setIsShortcutsOpen(true);
      }

      if (e.key === 'Escape') {
        setIsSettingsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Apply theme class to <html> and persist
  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem('theme-v1', isDark ? 'dark' : 'light');
    } catch {
      /* ignore */
    }
  }, [isDark]);

  // Handlers using pure utils (testable)
  // === Add task (enhanced) ===
  const handleAdd = () => {
    if (!inputValue.trim()) return;
    const newTodos = addTodo(
      todos,
      inputValue,
      currentListId,
      selectedPriority,
      selectedDueDate || undefined
    );
    setTodos(newTodos);
    setInputValue('');
    // Reset form to sensible defaults
    setSelectedPriority('medium');
    setSelectedDueDate('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  const handleToggle = (id: string) => {
    setTodos((prev) => toggleTodo(prev, id));
  };

  const handleDelete = (id: string) => {
    setTodos((prev) => deleteTodo(prev, id));
  };

  const handleClearCompleted = () => {
    setTodos(prev => prev.filter(t => !(t.listId === currentListId && t.completed)));
  };

  // Export / Import (premium features for commercial product)
  const handleExport = (allData = false) => {
    const dataToExport = allData ? todos : currentListTodos;
    const dataStr = JSON.stringify(dataToExport, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const prefix = allData ? 'all' : lists.find(l => l.id === currentListId)?.name.toLowerCase().replace(/\s+/g, '-') || 'list';
    const exportFileDefaultName = `taskora-${prefix}-${new Date().toISOString().slice(0,10)}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const imported = JSON.parse(event.target?.result as string);
          if (Array.isArray(imported)) {
            // Add to current list and keep their original listId if exists, otherwise current
            const updated = imported.map((t: any) => ({
              ...t,
              listId: t.listId || currentListId,
              priority: t.priority || 'medium'
            }));
            setTodos(prev => [...prev, ...updated]);
          }
        } catch (err) {
          alert('Invalid file');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  // Native HTML5 Drag & Drop reorder handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    try {
      e.dataTransfer.setData('text/plain', String(index));
    } catch {}
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== dropIndex) {
      const reordered = reorderTodos(todos, draggedIndex, dropIndex);
      setTodos(reordered);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // const hasCompleted = getCompletedCount(currentListTodos) > 0;

  const toggleTheme = () => setIsDark((d) => !d);

  const currentLang = i18n.language?.startsWith('tr') ? 'tr' : 'en';

  // === List management (practical) ===
  const [newListName, setNewListName] = useState('');
  const [isAddingList, setIsAddingList] = useState(false);

  const addNewList = () => {
    if (!newListName.trim()) return;

    const newList: List = {
      id: crypto.randomUUID(),
      name: newListName.trim()
    };
    setLists(prev => [...prev, newList]);
    setCurrentListId(newList.id);
    setNewListName('');
    setIsAddingList(false);
  };

  const cancelAddList = () => {
    setNewListName('');
    setIsAddingList(false);
  };

  const switchList = (listId: string) => {
    setCurrentListId(listId);
    setSearchTerm('');
    setFilter('all');
  };

  // === Current list todos + filtering ===
  const currentListTodos = todos.filter(t => t.listId === currentListId);

  const filteredTodos = currentListTodos
    .filter(todo => {
      const matchesSearch = todo.text.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      const today = new Date().toISOString().slice(0, 10);

      if (filter === 'active') return !todo.completed;
      if (filter === 'completed') return todo.completed;
      if (filter === 'today') {
        return todo.dueDate === today && !todo.completed;
      }
      return true;
    })
    .sort((a, b) => {
      // Sort by due date, then priority
      if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;

      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

  const completedInList = currentListTodos.filter(t => t.completed).length;
  const totalInList = currentListTodos.length;

  // === Premium interactive stats ===
  const todayStr = new Date().toISOString().slice(0, 10);
  const dueTodayCount = currentListTodos.filter(t => t.dueDate === todayStr && !t.completed).length;
  const overdueCount = currentListTodos.filter(t => {
    if (!t.dueDate || t.completed) return false;
    return t.dueDate < todayStr;
  }).length;

  const completionRate = totalInList > 0 ? Math.round((completedInList / totalInList) * 100) : 0;

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 transition-colors">
      <div className="max-w-5xl mx-auto flex">
        {/* Sidebar - Lists */}
        <div className="w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 hidden md:block">
          <div className="flex items-center justify-between mb-4 px-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center text-white text-xs font-bold">T</div>
              <span className="font-semibold text-lg text-slate-900 dark:text-white">{t('app.name')}</span>
            </div>
          </div>

          <div className="space-y-1">
            {lists.map(list => (
              <button
                key={list.id}
                onClick={() => switchList(list.id)}
                className={`list-btn w-full text-left pl-5 pr-3 py-2 rounded-xl text-sm font-medium transition flex justify-between items-center
                  ${currentListId === list.id ? 'active' : 'text-slate-600 dark:text-slate-300'}`}
              >
                <span className="flex items-center gap-2">
                  <span className="text-base opacity-70">📋</span>
                  {list.name}
                </span>
                <span className="text-xs opacity-60 tabular-nums">
                  {todos.filter(t => t.listId === list.id).length}
                </span>
              </button>
            ))}
          </div>

          {!isAddingList ? (
            <button 
              onClick={() => setIsAddingList(true)}
              className="mt-3 w-full text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 flex items-center gap-1 px-3 py-1.5 font-medium"
            >
              {t('actions.newList') || '+ Yeni Liste'}
            </button>
          ) : (
            <div className="mt-2 px-2">
              <input
                type="text"
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') addNewList();
                  if (e.key === 'Escape') cancelAddList();
                }}
                placeholder={t('sidebar.newListPlaceholder') || 'Liste adı'}
                className="w-full text-sm bg-slate-800 border border-slate-700 rounded px-2 py-1 focus:outline-none focus:border-indigo-500"
                autoFocus
              />
              <div className="flex gap-1 mt-1">
                <button onClick={addNewList} className="text-xs px-2 py-0.5 bg-indigo-600 rounded">{t('actions.addList')}</button>
                <button onClick={cancelAddList} className="text-xs px-2 py-0.5 hover:bg-slate-700 rounded">{t('actions.cancel')}</button>
              </div>
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0 p-6">
          {/* Premium Top Bar */}
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">T</div>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">Taskora</h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 -mt-0.5">{t('header.subtitle')}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-400">
              <span className="hidden sm:block">{t('shortcuts.title') || 'Klavye Kısayolları'}: N • / • ?</span>
              <button onClick={() => setIsShortcutsOpen(true)} className="px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-indigo-600 dark:text-indigo-400">?</button>
            </div>
          </div>

        {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
                  {lists.find(l => l.id === currentListId)?.name || 'Tasks'}
                </h1>
                {isPro && (
                  <span className="text-[10px] px-1.5 py-px bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300 rounded font-medium">PRO</span>
                )}
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {totalInList} {t('stats.total')?.toLowerCase() || 'tasks'} • {completedInList} {t('stats.done')?.toLowerCase() || 'done'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {/* Language */}
              <div className="hidden sm:flex rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden text-sm">
                <button onClick={() => changeLanguage('en')} className={`px-2.5 py-1 ${currentLang === 'en' ? 'bg-indigo-600 text-white' : ''}`}>EN</button>
                <button onClick={() => changeLanguage('tr')} className={`px-2.5 py-1 ${currentLang === 'tr' ? 'bg-indigo-600 text-white' : ''}`}>TR</button>
              </div>

              <button onClick={toggleTheme} className="w-9 h-9 flex items-center justify-center text-xl rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                {isDark ? '☀️' : '🌙'}
              </button>

              <button 
                onClick={() => setIsSettingsOpen(true)} 
                className="w-9 h-9 flex items-center justify-center text-xl rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700"
                title="Settings"
              >
                ⚙️
              </button>
            </div>
          </div>

          {/* Mobile List Selector (visible only on small screens) */}
          <div className="md:hidden mb-4 -mx-1 overflow-x-auto pb-1">
            <div className="flex gap-2 px-1 min-w-max">
              {lists.map(list => (
                <button
                  key={list.id}
                  onClick={() => switchList(list.id)}
                  className={`mobile-list-chip ${currentListId === list.id ? 'active' : ''}`}
                >
                  {list.name}
                  <span className="ml-1 opacity-60 text-xs tabular-nums">({todos.filter(t => t.listId === list.id).length})</span>
                </button>
              ))}
              {!isAddingList && (
                <button onClick={() => setIsAddingList(true)} className="mobile-list-chip border-dashed">
                  {t('actions.newList')}
                </button>
              )}
            </div>
          </div>

          {/* Add Task - Premium Form */}
          <div className="add-form rounded-3xl p-4 mb-5 border">
            <div className="text-xs uppercase tracking-[1px] font-semibold text-slate-500 dark:text-slate-400 mb-2 pl-1 flex items-center gap-2">
              <span>✚</span> {t('add.placeholder').replace('...', '') || 'NEW TASK'}
            </div>
            <div className="flex flex-col sm:flex-row gap-2.5 items-center">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t('add.placeholder')}
                className="flex-1 w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-[15px] focus:outline-none dark:text-white placeholder:text-slate-400"
              />

              {/* Priority Selector - colorful premium pills */}
              <div className="flex gap-1.5 text-xs shrink-0" aria-label={t('add.priority')}>
                {(['high','medium','low'] as const).map(p => (
                  <button
                    key={p}
                    onClick={() => setSelectedPriority(p)}
                    className={`prio-btn ${p} ${selectedPriority === p ? 'active' : ''}`}
                  >
                    {currentLang === 'tr' 
                      ? (p === 'high' ? 'Yüksek' : p === 'medium' ? 'Orta' : 'Düşük')
                      : p.toUpperCase()}
                  </button>
                ))}
              </div>

              {/* Due Date */}
              <div className="flex items-center gap-1 text-sm shrink-0 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-2xl px-3 py-1">
                <span className="text-base opacity-60">📅</span>
                <input
                  type="date"
                  value={selectedDueDate}
                  onChange={(e) => setSelectedDueDate(e.target.value)}
                  className="bg-transparent text-sm focus:outline-none w-[118px] dark:text-white"
                  aria-label={t('add.dueDate')}
                />
              </div>

              <button
                onClick={handleAdd}
                disabled={!inputValue.trim()}
                className="px-6 py-[13px] bg-accent hover:bg-accent/90 text-white rounded-2xl font-semibold text-sm disabled:opacity-50 shrink-0 active:scale-[0.985] transition"
              >
                {t('add.button')}
              </button>
            </div>
            <div className="text-[10px] pl-1 mt-1.5 text-slate-400 dark:text-slate-500">{t('welcome')}</div>
          </div>

          {/* Interactive Premium Stats Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
            <div 
              onClick={() => { setFilter('all'); }}
              className={`stat-card flex items-baseline justify-between ${filter === 'all' ? 'active' : ''}`}
            >
              <div>
                <div className="stat-label">{t('stats.total')}</div>
                <div className="stat-value tabular-nums">{totalInList}</div>
              </div>
              <div className="text-2xl opacity-40">📋</div>
            </div>
            <div 
              onClick={() => { setFilter('completed'); }}
              className={`stat-card flex items-baseline justify-between ${filter === 'completed' ? 'active' : ''}`}
            >
              <div>
                <div className="stat-label">{t('stats.done')}</div>
                <div className="stat-value tabular-nums">{completedInList}</div>
              </div>
              <div className="text-2xl opacity-40">✅</div>
            </div>
            <div 
              onClick={() => { setFilter('today'); }}
              className={`stat-card flex items-baseline justify-between ${filter === 'today' ? 'active' : ''}`}
            >
              <div>
                <div className="stat-label">{t('stats.today')}</div>
                <div className="stat-value tabular-nums text-amber-600 dark:text-amber-400">{dueTodayCount}</div>
              </div>
              <div className="text-2xl opacity-40">📅</div>
            </div>
            <div 
              onClick={() => { if (overdueCount > 0) setFilter('active'); }}
              className={`stat-card flex items-baseline justify-between ${overdueCount > 0 ? 'border-red-300 dark:border-red-900/60' : ''}`}
            >
              <div>
                <div className="stat-label">{t('stats.overdue')}</div>
                <div className={`stat-value tabular-nums ${overdueCount > 0 ? 'text-red-600' : ''}`}>{overdueCount}</div>
              </div>
              <div className="text-2xl opacity-40">⚠️</div>
            </div>
          </div>

          {/* Progress bar (subtle) + Search + Filters */}
          <div className="mb-3 flex items-center gap-3">
            <div className="flex-1">
              <div className="flex justify-between text-[10px] mb-1 text-slate-500 dark:text-slate-400">
                <span>{t('stats.completion')}</span>
                <span className="font-semibold tabular-nums">{completionRate}%</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${completionRate}%` }} />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-4 items-center">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={currentLang === 'tr' ? "Görevlerde ara..." : "Search tasks..."}
              className="flex-1 min-w-[180px] rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2 text-sm focus:border-accent"
            />

            <div className="flex flex-wrap gap-1">
              {(['all', 'active', 'today', 'completed'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`filter-pill ${filter === f ? 'active' : ''}`}
                >
                  {t(`filters.${f}`)}
                </button>
              ))}
            </div>

            <div className="ml-auto flex flex-wrap gap-1.5">
              <button onClick={() => handleExport(false)} disabled={totalInList === 0} className="text-xs px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700">{t('actions.exportList')}</button>
              <button onClick={() => handleExport(true)} disabled={todos.length === 0} className="text-xs px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700">{t('actions.exportAll')}</button>
              <button onClick={handleImport} className="text-xs px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700">{t('actions.import')}</button>
              <button onClick={handleClearCompleted} disabled={completedInList === 0} className="text-xs px-3 py-1.5 rounded-lg text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30">{t('actions.clearDone')}</button>
            </div>
          </div>

          {/* Task List */}
          {filteredTodos.length === 0 ? (
            <div className="rich-empty">
              {searchTerm ? (
                <>
                  <div className="emoji">🔍</div>
                  <div className="title">{t('empty.noResults', { term: searchTerm })}</div>
                </>
              ) : filter === 'today' ? (
                <>
                  <div className="emoji">🎉</div>
                  <div className="title">{t('empty.todayEmpty')}</div>
                  <div className="subtitle">Yeni bir görev ekleyebilir veya başka filtreye geçebilirsin.</div>
                </>
              ) : (
                <>
                  <div className="emoji">📭</div>
                  <div className="title">{t('empty.title')}</div>
                  <div className="subtitle">{t('empty.subtitle')}</div>
                  <div className="flex gap-2 justify-center">
                    <button 
                      onClick={() => {
                        const inputEl = document.querySelector('input[placeholder*="Yeni görev"], input[placeholder*="Add a new"]') as HTMLInputElement;
                        inputEl?.focus();
                      }}
                      className="text-sm px-4 py-1.5 rounded-xl bg-accent text-white font-medium"
                    >
                      {t('empty.getStarted')}
                    </button>
                    <button 
                      onClick={() => {
                        // Add 3 useful sample todos to current list
                        const now = new Date();
                        const tmr = new Date(now.getTime() + 86400000).toISOString().slice(0,10);
                        const samples = [
                          { text: currentLang === 'tr' ? "Önemli bir toplantı için hazırlık yap" : "Prepare for an important meeting", priority: 'high' as const, due: tmr },
                          { text: currentLang === 'tr' ? "Haftalık raporu tamamla" : "Finish the weekly report", priority: 'medium' as const, due: '' },
                          { text: currentLang === 'tr' ? "Ekip ile sync çağrısı ayarla" : "Schedule sync call with team", priority: 'low' as const, due: '' }
                        ];
                        const newOnes = samples.map(s => ({
                          id: crypto.randomUUID(),
                          text: s.text,
                          completed: false,
                          priority: s.priority,
                          dueDate: s.due || undefined,
                          listId: currentListId
                        }));
                        setTodos(prev => [...prev, ...newOnes]);
                      }}
                      className="text-sm px-4 py-1.5 rounded-xl border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      {t('empty.addSample')}
                    </button>
                  </div>
                  <div className="tip mt-4">{t('empty.tip')}</div>
                </>
              )}
            </div>
          ) : (
            <div className="task-container p-2">
              <ul className="space-y-1.5">
                {filteredTodos.map((todo) => {
                  const realIndex = currentListTodos.findIndex(t => t.id === todo.id);
                  return (
                    <TodoItem
                      key={todo.id}
                      todo={todo}
                      index={realIndex}
                      onToggle={handleToggle}
                      onDelete={handleDelete}
                      onDragStart={handleDragStart}
                      onDragOver={handleDragOver}
                      onDrop={handleDrop}
                      onDragEnd={handleDragEnd}
                      isDragging={draggedIndex === realIndex}
                      dragOverIndex={dragOverIndex}
                    />
                  );
                })}
              </ul>
            </div>
          )}

          {/* Footer + Shortcuts hint */}
          <div className="mt-8 text-xs text-center text-slate-400 dark:text-slate-500 space-y-1">
            <div>{t('footer')}</div>
            <div className="opacity-60">Press <kbd>n</kbd> to add • <kbd>/</kbd> to search • <kbd>?</kbd> for shortcuts</div>
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-6 modal">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">{t('settings.title')}</h2>
              <button onClick={() => setIsSettingsOpen(false)} className="text-2xl leading-none">×</button>
            </div>

            {/* Accent Colors */}
            <div className="mb-5">
              <p className="text-sm font-medium mb-2">{t('settings.accent')}</p>
              <div className="flex gap-2">
                {(['indigo', 'violet', 'emerald', 'rose'] as const).map(color => (
                  <button
                    key={color}
                    onClick={() => setAccentColor(color)}
                    className={`w-8 h-8 rounded-full border-2 ${accentColor === color ? 'border-slate-900 dark:border-white' : 'border-transparent'}`}
                    style={{ backgroundColor: {
                      indigo: '#6366f1',
                      violet: '#8b5cf6',
                      emerald: '#10b981',
                      rose: '#f43f5e'
                    }[color] }}
                  />
                ))}
              </div>
            </div>

            {/* License Key for AppSumo */}
            <div className="mb-5">
              <p className="text-sm font-medium mb-1">{t('settings.license')}</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={licenseKey}
                  onChange={(e) => setLicenseKey(e.target.value)}
                  placeholder="XXXX-XXXX-XXXX"
                  className="flex-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                />
                <button
                  onClick={() => {
                    if (licenseKey.trim().length > 5) {
                      localStorage.setItem('license-key', licenseKey.trim());
                      setIsPro(true);
                      alert(currentLang === 'tr' ? 'Lisans etkinleştirildi! Destek için teşekkürler.' : 'License activated! Thank you.');
                    }
                  }}
                  className="px-4 py-2 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700"
                >
                  {t('settings.activate')}
                </button>
              </div>
              {isPro && <div className="text-xs text-emerald-600 mt-1">{t('settings.proActive')}</div>}
            </div>

            {/* Data Management */}
            <div>
              <p className="text-sm font-medium mb-2">{t('settings.data')}</p>
              <div className="flex gap-2">
                <button onClick={() => handleExport(true)} className="flex-1 py-2 text-sm border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800">{t('settings.exportAll')}</button>
                <button onClick={() => {
                  if (confirm(t('settings.clearAllConfirm') || 'Clear all data?')) {
                    localStorage.clear();
                    window.location.reload();
                  }
                }} className="flex-1 py-2 text-sm border border-red-300 text-red-600 rounded-lg hover:bg-red-50">{t('settings.clearAll')}</button>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
              <button 
                onClick={() => { setIsSettingsOpen(false); setIsShortcutsOpen(true); }}
                className="text-sm text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
              >
                ⌨️ {t('shortcuts.title')}
              </button>
            </div>

            <div className="mt-6 text-xs text-center text-slate-400">
              Taskora • Premium todo for power users
            </div>
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Modal */}
      {isShortcutsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setIsShortcutsOpen(false)}>
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-6 modal" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">{t('shortcuts.title')}</h2>
              <button onClick={() => setIsShortcutsOpen(false)} className="text-2xl">×</button>
            </div>
            
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span><kbd>N</kbd></span> <span>{t('shortcuts.add')}</span></div>
              <div className="flex justify-between"><span><kbd>/</kbd></span> <span>{t('shortcuts.search')}</span></div>
              <div className="flex justify-between"><span><kbd>?</kbd></span> <span>{t('shortcuts.shortcutsHelp')}</span></div>
              <div className="flex justify-between"><span><kbd>Esc</kbd></span> <span>{t('shortcuts.esc')}</span></div>
            </div>

            <div className="mt-5 text-xs text-slate-400 text-center">
              {currentLang === 'tr' ? 'Kısayollar yazarken çalışmaz.' : 'Shortcuts do not work while typing in a field.'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
