// src/hooks/useTaskManager.ts
// Task CRUD, validation, stable ID assignment. [Req 1]

import { useState, useCallback } from "react";
import type { Task, Priority } from "../types";
import type { StorageManager } from "../storage/storageManager";
import {
  validateTitle,
  validateSubject,
  validateEstimatedMinutes,
  validatePriority,
  validateDeadline,
} from "../scheduler/validation";

export interface TaskFormData {
  title: string;
  subject: string;
  deadline: string;
  estimatedMinutes: string;
  priority: string;
}

export interface TaskFormErrors {
  title: string | null;
  subject: string | null;
  deadline: string | null;
  estimatedMinutes: string | null;
  priority: string | null;
}

export const emptyTaskErrors: TaskFormErrors = {
  title: null, subject: null, deadline: null, estimatedMinutes: null, priority: null,
};

function validateForm(data: TaskFormData): TaskFormErrors {
  const mins = parseInt(data.estimatedMinutes, 10);
  return {
    title: validateTitle(data.title),
    subject: validateSubject(data.subject),
    deadline: validateDeadline(data.deadline),
    estimatedMinutes: validateEstimatedMinutes(Number.isNaN(mins) ? data.estimatedMinutes : mins),
    priority: validatePriority(data.priority),
  };
}

function hasErrors(e: TaskFormErrors): boolean {
  return Object.values(e).some((v) => v !== null);
}

export function useTaskManager(
  storage: StorageManager,
  initialTasks: Task[],
  initialNextId: number,
  onMutate: () => void,
) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [nextId, setNextId] = useState<number>(initialNextId);

  const persist = useCallback((t: Task[], id: number) => {
    storage.saveTasks(t, id);
    onMutate();
  }, [storage, onMutate]);

  const addTask = useCallback((data: TaskFormData): TaskFormErrors | null => {
    const errors = validateForm(data);
    if (hasErrors(errors)) return errors;
    const mins = parseInt(data.estimatedMinutes, 10);
    const newTask: Task = {
      id: nextId,
      title: data.title.trim(),
      subject: data.subject.trim(),
      deadline: data.deadline,
      estimatedMinutes: mins,
      priority: data.priority as Priority,
      completed: false,
    };
    const updated = [...tasks, newTask];
    const newNextId = nextId + 1;
    setTasks(updated);
    setNextId(newNextId);
    persist(updated, newNextId);
    return null;
  }, [tasks, nextId, persist]);

  const editTask = useCallback((id: number, data: TaskFormData): TaskFormErrors | null => {
    const errors = validateForm(data);
    if (hasErrors(errors)) return errors;
    const mins = parseInt(data.estimatedMinutes, 10);
    const updated = tasks.map((t) =>
      t.id === id
        ? { ...t, title: data.title.trim(), subject: data.subject.trim(), deadline: data.deadline, estimatedMinutes: mins, priority: data.priority as Priority }
        : t
    );
    setTasks(updated);
    persist(updated, nextId);
    return null;
  }, [tasks, nextId, persist]);

  const deleteTask = useCallback((id: number) => {
    const updated = tasks.filter((t) => t.id !== id);
    setTasks(updated);
    persist(updated, nextId);
  }, [tasks, nextId, persist]);

  const toggleComplete = useCallback((id: number) => {
    const updated = tasks.map((t) => t.id === id ? { ...t, completed: !t.completed } : t);
    setTasks(updated);
    persist(updated, nextId);
  }, [tasks, nextId, persist]);

  return { tasks, addTask, editTask, deleteTask, toggleComplete };
}

export function isOverdue(deadline: string, today: string): boolean {
  return deadline < today;
}