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
        const input = document.querySelector('input[placeholder*="Yeni görev"], input[placeholder*="Add a new"]') as HTMLInputElement;
        input?.focus();
      }

      if (e.key === '/') {
        e.preventDefault();
        const search = document.querySelector('input[placeholder="Search tasks..."]') as HTMLInputElement;
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

  // === Simple Weekly Stats (practical, not over-engineered) ===
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
                className={`w-full text-left px-3 py-2 rounded-xl text-sm font-medium transition flex justify-between items-center
                  ${currentListId === list.id 
                    ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300' 
                    : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'}`}
              >
                {list.name}
                <span className="text-xs opacity-60">
                  {todos.filter(t => t.listId === list.id).length}
                </span>
              </button>
            ))}
          </div>

          {!isAddingList ? (
            <button 
              onClick={() => setIsAddingList(true)}
              className="mt-3 w-full text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 flex items-center gap-1 px-3 py-1.5"
            >
              + New List
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
                placeholder="List name..."
                className="w-full text-sm bg-slate-800 border border-slate-700 rounded px-2 py-1 focus:outline-none focus:border-indigo-500"
                autoFocus
              />
              <div className="flex gap-1 mt-1">
                <button onClick={addNewList} className="text-xs px-2 py-0.5 bg-indigo-600 rounded">Add</button>
                <button onClick={cancelAddList} className="text-xs px-2 py-0.5 hover:bg-slate-700 rounded">Cancel</button>
              </div>
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0 p-6">
          {/* Top Bar */}
          <div className="flex items-center justify-between mb-4 border-b pb-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Taskora</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">Modern görev yöneticisi</p>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-400">Klavye: N ekle, / ara, ? kısayollar</span>
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
                {totalInList} tasks • {completedInList} done
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

          {/* Add Task - Enhanced Form */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-3 mb-5">
            <div className="flex gap-2 items-center">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t('add.placeholder')}
                className="flex-1 bg-transparent px-4 py-2 text-base focus:outline-none dark:text-white placeholder:text-slate-400"
              />

              {/* Priority Selector */}
              <div className="flex gap-1 text-xs">
                {(['high','medium','low'] as const).map(p => (
                  <button
                    key={p}
                    onClick={() => setSelectedPriority(p)}
                    className={`px-2 py-1 rounded-lg border ${selectedPriority === p ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30' : 'border-transparent hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                  >
                    {p[0].toUpperCase()}
                  </button>
                ))}
              </div>

              {/* Due Date */}
              <input
                type="date"
                value={selectedDueDate}
                onChange={(e) => setSelectedDueDate(e.target.value)}
                className="text-sm bg-slate-100 dark:bg-slate-800 rounded-lg px-2 py-1 border-0 focus:ring-1 focus:ring-indigo-500"
              />

              <button
                onClick={handleAdd}
                disabled={!inputValue.trim()}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium text-sm disabled:opacity-50"
              >
                {t('add.button')}
              </button>
            </div>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">{t('welcome')}</p>

          {/* Progress + Weekly Stats */}
          <div className="mb-4">
            <div className="flex justify-between text-xs mb-1">
              <span>Completion</span>
              <span className="font-medium">{completionRate}%</span>
            </div>
            <div className="h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-accent transition-all" 
                style={{ width: `${completionRate}%` }}
              />
            </div>
          </div>

          {/* Search + Filters */}
          <div className="flex flex-wrap gap-2 mb-4 items-center">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search tasks..."
              className="flex-1 min-w-[180px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2 text-sm"
            />

            <div className="flex rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 text-sm">
              {(['all', 'active', 'today', 'completed'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 capitalize ${filter === f ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                >
                  {f}
                </button>
              ))}
            </div>

            <div className="ml-auto flex gap-1.5">
              <button onClick={() => handleExport(false)} disabled={totalInList === 0} className="text-xs px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700">Export List</button>
              <button onClick={() => handleExport(true)} disabled={todos.length === 0} className="text-xs px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700">Export All</button>
              <button onClick={handleImport} className="text-xs px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700">Import</button>
              <button onClick={handleClearCompleted} disabled={completedInList === 0} className="text-xs px-3 py-1.5 rounded-lg text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30">Clear done</button>
            </div>
          </div>

          {/* Task List */}
          {filteredTodos.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 py-16 text-center">
              {searchTerm ? (
                <>
                  <div className="text-4xl mb-3">🔍</div>
                  <p className="text-slate-500 dark:text-slate-400">“{searchTerm}” için görev bulunamadı</p>
                </>
              ) : filter === 'today' ? (
                <>
                  <div className="text-4xl mb-3">🎉</div>
                  <p className="text-slate-500 dark:text-slate-400">Bugün için görev yok. Harika!</p>
                </>
              ) : (
                <>
                  <div className="text-4xl mb-3">📭</div>
                  <p className="text-slate-500 dark:text-slate-400">Bu listede henüz görev yok.</p>
                  <p className="text-sm mt-1">Yukarıdan yeni görev ekleyin veya <kbd className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-xs">N</kbd> tuşuna basın</p>
                </>
              )}
            </div>
          ) : (
            <ul className="space-y-2">
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
          )}

          {/* Footer + Shortcuts hint */}
          <div className="mt-8 text-xs text-center text-slate-400 dark:text-slate-500 space-y-1">
            <div>{t('footer')}</div>
            <div className="opacity-60">Press <kbd className="px-1 bg-slate-200 dark:bg-slate-700 rounded">n</kbd> to add • <kbd className="px-1 bg-slate-200 dark:bg-slate-700 rounded">/</kbd> to search • <kbd className="px-1 bg-slate-200 dark:bg-slate-700 rounded">?</kbd> for settings</div>
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Settings</h2>
              <button onClick={() => setIsSettingsOpen(false)} className="text-2xl leading-none">×</button>
            </div>

            {/* Accent Colors */}
            <div className="mb-5">
              <p className="text-sm font-medium mb-2">Accent Color</p>
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
              <p className="text-sm font-medium mb-1">License Key (AppSumo)</p>
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
                      alert('License activated! Thank you for supporting Taskora.');
                    }
                  }}
                  className="px-4 py-2 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700"
                >
                  Activate
                </button>
              </div>
              {isPro && <div className="text-xs text-emerald-600 mt-1">✓ Pro version active</div>}
            </div>

            {/* Data Management */}
            <div>
              <p className="text-sm font-medium mb-2">Data</p>
              <div className="flex gap-2">
                <button onClick={() => handleExport(true)} className="flex-1 py-2 text-sm border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800">Export All Data</button>
                <button onClick={() => {
                  if (confirm('Clear all data?')) {
                    localStorage.clear();
                    window.location.reload();
                  }
                }} className="flex-1 py-2 text-sm border border-red-300 text-red-600 rounded-lg hover:bg-red-50">Clear All Data</button>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
              <button 
                onClick={() => { setIsSettingsOpen(false); setIsShortcutsOpen(true); }}
                className="text-sm text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
              >
                <i className="fas fa-keyboard mr-1"></i> View Keyboard Shortcuts
              </button>
            </div>

            <div className="mt-6 text-xs text-center text-slate-400">
              Taskora v1.0 • Built for lifetime value
            </div>
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Modal */}
      {isShortcutsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setIsShortcutsOpen(false)}>
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-6" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Keyboard Shortcuts</h2>
              <button onClick={() => setIsShortcutsOpen(false)} className="text-2xl">×</button>
            </div>
            
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span><kbd className="px-2 py-0.5 bg-slate-200 dark:bg-slate-700 rounded">N</kbd></span> <span>Add new task</span></div>
              <div className="flex justify-between"><span><kbd className="px-2 py-0.5 bg-slate-200 dark:bg-slate-700 rounded">/</kbd></span> <span>Focus search</span></div>
              <div className="flex justify-between"><span><kbd className="px-2 py-0.5 bg-slate-200 dark:bg-slate-700 rounded">?</kbd></span> <span>Show shortcuts</span></div>
              <div className="flex justify-between"><span><kbd className="px-2 py-0.5 bg-slate-200 dark:bg-slate-700 rounded">Esc</kbd></span> <span>Close modals / blur</span></div>
            </div>

            <div className="mt-5 text-xs text-slate-400 text-center">
              These shortcuts work when you're not typing in a field.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;