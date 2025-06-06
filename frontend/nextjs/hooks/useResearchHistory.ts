import { useState, useEffect } from 'react';
import { ResearchHistoryItem, Data } from '../types/data';

// Configuration constants
const MAX_HISTORY_ITEMS = 15; // Maximum number of items to keep
const MAX_STORAGE_SIZE = 4 * 1024 * 1024; // 4MB limit for localStorage
const MAX_ANSWER_LENGTH = 5000; // Truncate long answers
const MAX_ORDERED_DATA_ITEMS = 3; // Keep only first few orderedData items

export const useResearchHistory = () => {
  const [history, setHistory] = useState<ResearchHistoryItem[]>([]);

  // Helper function to calculate storage size
  const getStorageSize = (data: any): number => {
    return new Blob([JSON.stringify(data)]).size;
  };

  // Helper function to truncate and clean data
  const cleanData = (data: Data[]): Data[] => {
    return data.slice(0, MAX_ORDERED_DATA_ITEMS).map(item => {
      // Handle each data type properly based on the union type
      switch (item.type) {
        case 'basic':
          return {
            type: 'basic',
            content: typeof item.content === 'string'
              ? item.content.substring(0, 1000) + (item.content.length > 1000 ? '...' : '')
              : item.content
          };
        case 'langgraphButton':
          return {
            type: 'langgraphButton',
            link: item.link
          };
        case 'differences':
          return {
            type: 'differences',
            content: typeof item.content === 'string'
              ? item.content.substring(0, 1000) + (item.content.length > 1000 ? '...' : '')
              : item.content,
            output: typeof item.output === 'string' && item.output.length > 500
              ? item.output.substring(0, 500) + '...'
              : item.output
          };
        case 'question':
          return {
            type: 'question',
            content: typeof item.content === 'string'
              ? item.content.substring(0, 1000) + (item.content.length > 1000 ? '...' : '')
              : item.content
          };
        case 'chat':
          return {
            type: 'chat',
            content: typeof item.content === 'string'
              ? item.content.substring(0, 1000) + (item.content.length > 1000 ? '...' : '')
              : item.content
          };
        case 'error':
          return {
            type: 'error',
            content: typeof item.content === 'string'
              ? item.content.substring(0, 1000) + (item.content.length > 1000 ? '...' : '')
              : item.content,
            output: typeof item.output === 'string' && item.output.length > 500
              ? item.output.substring(0, 500) + '...'
              : item.output
          };
        default:
          // Fallback for unknown types
          return item;
      }
    });
  };

  // Helper function to clean up history when storage is full
  const cleanupHistory = (currentHistory: ResearchHistoryItem[]): ResearchHistoryItem[] => {
    // Sort by timestamp (newest first) and limit items
    let cleanHistory = [...currentHistory]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, MAX_HISTORY_ITEMS);

    // If still too large, reduce data per item
    if (getStorageSize(cleanHistory) > MAX_STORAGE_SIZE) {
      cleanHistory = cleanHistory.map(item => ({
        ...item,
        answer: item.answer.substring(0, MAX_ANSWER_LENGTH / 2) +
          (item.answer.length > MAX_ANSWER_LENGTH / 2 ? '...' : ''),
        orderedData: item.orderedData.slice(0, 2) // Keep only 2 items
      }));
    }

    // If still too large, keep only the most recent items
    while (getStorageSize(cleanHistory) > MAX_STORAGE_SIZE && cleanHistory.length > 1) {
      cleanHistory = cleanHistory.slice(0, -1);
    }

    return cleanHistory;
  };

  // Safe localStorage operations with error handling
  const safeSetItem = (key: string, value: string): boolean => {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        // Clear some space and try again
        const currentData = localStorage.getItem('researchHistory');
        if (currentData) {
          try {
            const parsed = JSON.parse(currentData);
            const cleaned = cleanupHistory(Array.isArray(parsed) ? parsed : []);
            localStorage.setItem('researchHistory', JSON.stringify(cleaned));
            console.log('Cleaned up history due to quota exceeded');
            return true;
          } catch (cleanupError) {
            console.error('Failed to cleanup history:', cleanupError);
            localStorage.removeItem('researchHistory');
          }
        }
      }
      return false;
    }
  };

  const safeGetItem = (key: string): string | null => {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.error('Failed to read from localStorage:', error);
      return null;
    }
  };

  // Load history from localStorage on initial render
  useEffect(() => {
    const storedHistory = safeGetItem('researchHistory');
    if (storedHistory) {
      try {
        const parsed = JSON.parse(storedHistory);
        if (Array.isArray(parsed)) {
          // Clean up on load to ensure we're within limits
          const cleanedHistory = cleanupHistory(parsed);
          setHistory(cleanedHistory);

          // If we had to clean up, save the cleaned version
          if (cleanedHistory.length !== parsed.length) {
            safeSetItem('researchHistory', JSON.stringify(cleanedHistory));
          }
        } else {
          setHistory([]);
        }
      } catch (error) {
        console.error('Error parsing research history:', error);
        localStorage.removeItem('researchHistory');
        setHistory([]);
      }
    }
  }, []);

  // Save research to history with data reduction
  const saveResearch = (question: string, answer: string, orderedData: Data[]) => {
    const cleanedAnswer = answer.length > MAX_ANSWER_LENGTH
      ? answer.substring(0, MAX_ANSWER_LENGTH) + '...'
      : answer;

    const cleanedOrderedData = cleanData(orderedData);

    const newItem: ResearchHistoryItem = {
      id: Date.now().toString(),
      question: question.substring(0, 200), // Limit question length too
      answer: cleanedAnswer,
      timestamp: Date.now(),
      orderedData: cleanedOrderedData,
    };

    // Add to history and cleanup
    const updatedHistory = [newItem, ...history];
    const cleanedHistory = cleanupHistory(updatedHistory);

    setHistory(cleanedHistory);

    const success = safeSetItem('researchHistory', JSON.stringify(cleanedHistory));
    if (!success) {
      console.warn('Failed to save research to history due to storage constraints');
      // Try with minimal data
      const minimalHistory = cleanedHistory.slice(0, 5).map(item => ({
        id: item.id,
        question: item.question.substring(0, 100),
        answer: item.answer.substring(0, 500),
        timestamp: item.timestamp,
        orderedData: []
      }));
      safeSetItem('researchHistory', JSON.stringify(minimalHistory));
      setHistory(minimalHistory);
    }

    return newItem.id;
  };

  // Get a specific research item by ID
  const getResearchById = (id: string) => {
    return history.find(item => item.id === id);
  };

  // Delete a research item
  const deleteResearch = (id: string) => {
    const updatedHistory = history.filter(item => item.id !== id);
    setHistory(updatedHistory);
    safeSetItem('researchHistory', JSON.stringify(updatedHistory));
  };

  // Clear all history
  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('researchHistory');
  };

  return {
    history,
    saveResearch,
    getResearchById,
    deleteResearch,
    clearHistory,
  };
}; 