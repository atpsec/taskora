/**
 * Pure, side-effect-free todo operations for testability.
 * All functions are immutable and return new arrays.
 */

export type Priority = 'low' | 'medium' | 'high';

export interface Todo {
  id: string;
  text: string;
  completed: boolean;
  priority: Priority;
  dueDate?: string; // YYYY-MM-DD
  listId: string;
}

export interface List {
  id: string;
  name: string;
}

/**
 * Creates a new todo and appends it.
 */
export function addTodo(
  todos: Todo[],
  text: string,
  listId: string,
  priority: Priority = 'medium',
  dueDate?: string
): Todo[] {
  const trimmed = text.trim();
  if (!trimmed) return todos;

  const newTodo: Todo = {
    id: crypto.randomUUID(),
    text: trimmed,
    completed: false,
    priority,
    dueDate,
    listId,
  };
  return [...todos, newTodo];
}

/**
 * Toggles completed state for the todo with given id.
 */
export function toggleTodo(todos: Todo[], id: string): Todo[] {
  return todos.map((todo) =>
    todo.id === id ? { ...todo, completed: !todo.completed } : todo
  );
}

/**
 * Deletes the todo with given id.
 */
export function deleteTodo(todos: Todo[], id: string): Todo[] {
  return todos.filter((todo) => todo.id !== id);
}

/**
 * Removes all completed todos.
 */
export function clearCompleted(todos: Todo[]): Todo[] {
  return todos.filter((todo) => !todo.completed);
}

/**
 * Reorders todos array by moving item from fromIndex to toIndex.
 */
export function reorderTodos(todos: Todo[], fromIndex: number, toIndex: number): Todo[] {
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= todos.length || toIndex >= todos.length) {
    return todos;
  }
  const result = [...todos];
  const [moved] = result.splice(fromIndex, 1);
  result.splice(toIndex, 0, moved);
  return result;
}

/**
 * Helper to count completed.
 */
export function getCompletedCount(todos: Todo[]): number {
  return todos.filter((t) => t.completed).length;
}