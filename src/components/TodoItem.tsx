import React from 'react';
import { useTranslation } from 'react-i18next';
import type { Todo } from '../utils/todoUtils';

interface TodoItemProps {
  todo: Todo;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  // Drag props for native HTML5 DnD reordering
  index: number;
  onDragStart: (e: React.DragEvent, index: number) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDrop: (e: React.DragEvent, index: number) => void;
  onDragEnd: (e: React.DragEvent) => void;
  isDragging: boolean;
  dragOverIndex: number | null;
}

const TodoItem: React.FC<TodoItemProps> = ({
  todo,
  onToggle,
  onDelete,
  index,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  isDragging,
  dragOverIndex,
}) => {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language?.startsWith('tr') ? 'tr' : 'en';
  const isDragOver = dragOverIndex === index;

  return (
    <li
      draggable
      data-testid="todo-item"
      onDragStart={(e) => onDragStart(e, index)}
      onDragOver={(e) => onDragOver(e, index)}
      onDrop={(e) => onDrop(e, index)}
      onDragEnd={onDragEnd}
      className={`todo-item group flex items-center gap-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3.5 shadow-sm hover:shadow-lg active:shadow cursor-default select-none ${
        todo.completed ? 'opacity-80' : ''
      } ${isDragging ? 'dragging opacity-60' : ''}
      ${isDragOver ? 'ring-2 ring-accent border-accent' : ''} transition-all`}
    >
      {/* Drag Handle */}
      <div
        data-testid="drag-handle"
        className="drag-handle flex-shrink-0 w-7 h-7 flex items-center justify-center text-slate-300 dark:text-slate-600 hover:text-indigo-400 transition-colors"
        aria-label={t('todoItem.drag')}
        title={t('todoItem.dragTitle')}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </div>

      {/* Checkbox + Text */}
      <label className="flex flex-1 items-center gap-3 cursor-pointer min-w-0">
        <input
          type="checkbox"
          checked={todo.completed}
          onChange={() => onToggle(todo.id)}
          className="w-5 h-5 accent-indigo-600 cursor-pointer flex-shrink-0 rounded border-slate-300 dark:border-slate-600"
          aria-label={todo.completed ? t('todoItem.completeAria') : t('todoItem.incompleteAria')}
        />
        <div className="flex-1 min-w-0">
          <span
            className={`todo-text block text-[15px] leading-snug break-words font-medium text-slate-900 dark:text-slate-100 ${todo.completed ? 'completed' : ''}`}
          >
            {todo.text}
          </span>

          {/* Priority + Due Date */}
          <div className="flex items-center gap-1.5 mt-1">
            {todo.priority && (
              <span className={`priority-badge text-[10px] font-bold tracking-wider
                ${todo.priority === 'high' ? 'bg-red-100 text-red-700 dark:bg-red-900/70 dark:text-red-300' : ''}
                ${todo.priority === 'medium' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/70 dark:text-amber-300' : ''}
                ${todo.priority === 'low' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/70 dark:text-emerald-300' : ''}`}>
                {currentLang === 'tr' 
                  ? (todo.priority === 'high' ? 'YÜKSEK' : todo.priority === 'medium' ? 'ORTA' : 'DÜŞÜK')
                  : todo.priority.toUpperCase()}
              </span>
            )}
            {todo.dueDate && (() => {
              const due = new Date(todo.dueDate);
              const today = new Date();
              today.setHours(0,0,0,0);
              const isOverdue = due < today && !todo.completed;
              return (
                <span className={`inline-flex items-center text-[11px] px-1.5 py-px rounded-full font-medium ${isOverdue ? 'bg-red-100 text-red-600 dark:bg-red-900/70 dark:text-red-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
                  📅 {due.toLocaleDateString(currentLang === 'tr' ? 'tr-TR' : 'en-US', { month: 'short', day: 'numeric' })}
                  {isOverdue && (currentLang === 'tr' ? ' • gecikti' : ' • overdue')}
                </span>
              );
            })()}
          </div>
        </div>
      </label>

      {/* Delete Button */}
      <button
        onClick={() => onDelete(todo.id)}
        className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-slate-300 hover:text-red-500 dark:text-slate-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-all opacity-0 group-hover:opacity-100 active:scale-95"
        aria-label={t('todoItem.delete')}
        title={t('todoItem.deleteTitle')}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6h12v12" />
        </svg>
      </button>
    </li>
  );
};

export default TodoItem;
