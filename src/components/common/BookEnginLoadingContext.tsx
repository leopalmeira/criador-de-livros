import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  BookEnginLoadingService,
  BookEnginTaskCategory,
  BookEnginTaskState
} from '../../services/bookengin-loading-service';
import { BookEnginLoader } from './BookEnginLoader';

interface BookEnginLoadingContextValue {
  tasks: Map<string, BookEnginTaskState>;
  startLoading: (
    taskId: string,
    options?: {
      category?: BookEnginTaskCategory;
      title?: string;
      message?: string;
      currentStep?: number;
      totalSteps?: number;
      progress?: number;
      areaTarget?: string;
    }
  ) => BookEnginTaskState;
  updateLoading: (
    taskId: string,
    updates: Partial<Omit<BookEnginTaskState, 'id' | 'startTime'>>
  ) => void;
  stopLoading: (taskId: string) => void;
  failLoading: (taskId: string, errorMsg?: string) => void;
  isTaskLoading: (taskId: string) => boolean;
  getTaskState: (taskId: string) => BookEnginTaskState | null;
  renderTaskLoader: (
    taskId: string,
    options?: {
      variant?: 'button' | 'inline' | 'overlay' | 'fullscreen';
      size?: 'micro' | 'sm' | 'md' | 'lg';
      fallbackTitle?: string;
      fallbackMessage?: string;
    }
  ) => React.ReactNode;
}

const BookEnginLoadingContext = createContext<BookEnginLoadingContextValue | null>(null);

export const BookEnginLoadingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tasks, setTasks] = useState<Map<string, BookEnginTaskState>>(new Map());

  useEffect(() => {
    const unsubscribe = BookEnginLoadingService.subscribe(newTasks => {
      setTasks(newTasks);
    });
    return unsubscribe;
  }, []);

  const startLoading = useCallback(
    (taskId: string, options?: any) => {
      return BookEnginLoadingService.startTask(taskId, options);
    },
    []
  );

  const updateLoading = useCallback((taskId: string, updates: any) => {
    BookEnginLoadingService.updateTask(taskId, updates);
  }, []);

  const stopLoading = useCallback((taskId: string) => {
    BookEnginLoadingService.completeTask(taskId);
  }, []);

  const failLoading = useCallback((taskId: string, errorMsg?: string) => {
    BookEnginLoadingService.failTask(taskId, errorMsg);
  }, []);

  const isTaskLoading = useCallback((taskId: string) => {
    return BookEnginLoadingService.isTaskActive(taskId);
  }, []);

  const getTaskState = useCallback((taskId: string) => {
    return BookEnginLoadingService.getTask(taskId);
  }, []);

  const renderTaskLoader = useCallback(
    (
      taskId: string,
      options?: {
        variant?: 'button' | 'inline' | 'overlay' | 'fullscreen';
        size?: 'micro' | 'sm' | 'md' | 'lg';
        fallbackTitle?: string;
        fallbackMessage?: string;
      }
    ) => {
      const task = BookEnginLoadingService.getTask(taskId);
      if (!task) return null;

      return (
        <BookEnginLoader
          title={task.title || options?.fallbackTitle}
          message={task.message || options?.fallbackMessage}
          progress={task.progress}
          currentStep={task.currentStep}
          totalSteps={task.totalSteps}
          variant={options?.variant || 'inline'}
          size={options?.size}
        />
      );
    },
    []
  );

  return (
    <BookEnginLoadingContext.Provider
      value={{
        tasks,
        startLoading,
        updateLoading,
        stopLoading,
        failLoading,
        isTaskLoading,
        getTaskState,
        renderTaskLoader
      }}
    >
      {children}
    </BookEnginLoadingContext.Provider>
  );
};

export const useBookEnginLoading = () => {
  const context = useContext(BookEnginLoadingContext);
  if (!context) {
    // Fallback caso seja chamado fora do Provider: utiliza diretamente o BookEnginLoadingService
    return {
      tasks: new Map(),
      startLoading: (taskId: string, options?: any) => BookEnginLoadingService.startTask(taskId, options),
      updateLoading: (taskId: string, updates: any) => BookEnginLoadingService.updateTask(taskId, updates),
      stopLoading: (taskId: string) => BookEnginLoadingService.completeTask(taskId),
      failLoading: (taskId: string, errorMsg?: string) => BookEnginLoadingService.failTask(taskId, errorMsg),
      isTaskLoading: (taskId: string) => BookEnginLoadingService.isTaskActive(taskId),
      getTaskState: (taskId: string) => BookEnginLoadingService.getTask(taskId),
      renderTaskLoader: (taskId: string, options?: any) => {
        const task = BookEnginLoadingService.getTask(taskId);
        if (!task) return null;
        return (
          <BookEnginLoader
            title={task.title || options?.fallbackTitle}
            message={task.message || options?.fallbackMessage}
            progress={task.progress}
            currentStep={task.currentStep}
            totalSteps={task.totalSteps}
            variant={options?.variant || 'inline'}
            size={options?.size}
          />
        );
      }
    };
  }
  return context;
};
