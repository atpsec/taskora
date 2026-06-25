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
  const { t } = useTranslation();
  const isDragOver = dragOverIndex === index;

  return (
    <li
      draggable
      data-testid="todo-item"
      onDragStart={(e) => onDragStart(e, index)}
      onDragOver={(e) => onDragOver(e, index)}
      onDrop={(e) => onDrop(e, index)}
      onDragEnd={onDragEnd}
      className={`todo-item group flex items-center gap-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 sm:px-4 py-3 shadow-sm hover:shadow-md active:shadow cursor-default select-none ${
        isDragging ? 'dragging' : ''
      } ${isDragOver ? 'ring-2 ring-indigo-400 dark:ring-indigo-500 border-indigo-300' : ''}`}
    >
      {/* Drag Handle */}
      <div
        data-testid="drag-handle"
        className="drag-handle flex-shrink-0 w-8 h-8 flex items-center justify-center text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 active:text-slate-800 transition-colors"
        aria-label={t('todoItem.drag')}
        title={t('todoItem.dragTitle')}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </div>

      {/* Checkbox + Text */}
      <label className="flex flex-1 items-center gap-3 cursor-pointer min-w-0">
        <input
          type="checkbox"
          checked={todo.completed}
          onChange={() => onToggle(todo.id)}
          className="w-5 h-5 accent-indigo-600 cursor-pointer flex-shrink-0"
          aria-label={todo.completed ? t('todoItem.completeAria') : t('todoItem.incompleteAria')}
        />
        <div className="flex-1 min-w-0">
          <span
            className={`todo-text block text-base sm:text-[15px] leading-snug break-words text-slate-800 dark:text-slate-100 ${todo.completed ? 'completed' : ''}`}
          >
            {todo.text}
          </span>

          {/* Priority + Due Date */}
          <div className="flex items-center gap-2 mt-0.5">
            {todo.priority && (
              <span className={`text-[10px] px-1.5 py-px rounded font-medium
                ${todo.priority === 'high' ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300' : ''}
                ${todo.priority === 'medium' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300' : ''}
                ${todo.priority === 'low' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300' : ''}`}>
                {todo.priority.toUpperCase()}
              </span>
            )}
            {todo.dueDate && (() => {
              const due = new Date(todo.dueDate);
              const today = new Date();
              today.setHours(0,0,0,0);
              const isOverdue = due < today && !todo.completed;
              return (
                <span className={`text-[10px] px-1.5 py-px rounded ${isOverdue ? 'bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'}`}>
                  {due.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  {isOverdue && ' (overdue)'}
                </span>
              );
            })()}
          </div>
        </div>
      </label>

      {/* Delete Button */}
      <button
        onClick={() => onDelete(todo.id)}
        className="flex-shrink-0 w-9 h-9 flex items-center justify-center text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-all active:scale-95"
        aria-label={t('todoItem.delete')}
        title={t('todoItem.deleteTitle')}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.25}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6h12v12" />
        </svg>
      </button>
    </li>
  );
};

export default TodoItem;