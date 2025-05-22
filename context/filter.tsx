'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

// Define filter types
export type FilterType = 'label' | 'status';
export type StatusFilterValue = 'read' | 'unread';

export interface Filter {
  id: string;
  type: FilterType;
  value: string;
  display: string;
  color?: string;
}

// Create context for filter state
interface FilterContextType {
  filters: Filter[];
  searchTerm: string;
  addFilter: (type: FilterType, value: string, display: string, color?: string) => void;
  removeFilter: (filterId: string) => void;
  clearAllFilters: () => void;
  setSearchTerm: (term: string) => void;
}

export const FilterContext = createContext<FilterContextType | undefined>(undefined);

// Filter provider component
interface FilterProviderProps {
  children: ReactNode;
}

export const FilterProvider: React.FC<FilterProviderProps> = ({ children }) => {
  const [filters, setFilters] = useState<Filter[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Add a filter
  const addFilter = (type: FilterType, value: string, display: string, color?: string) => {
    const id = `${type}-${value}`;
    // Check if filter already exists
    if (filters.some(filter => filter.id === id)) return;
    
    setFilters([...filters, { id, type, value, display, color }]);
  };

  // Remove a filter
  const removeFilter = (filterId: string) => {
    setFilters(filters.filter(filter => filter.id !== filterId));
  };

  // Clear all filters and search
  const clearAllFilters = () => {
    setFilters([]);
    setSearchTerm('');
  };

  // Provide filter context value
  const filterContextValue: FilterContextType = {
    filters,
    searchTerm,
    addFilter,
    removeFilter,
    clearAllFilters,
    setSearchTerm
  };

  return (
    <FilterContext.Provider value={filterContextValue}>
      {children}
    </FilterContext.Provider>
  );
};

export const useFilters = () => {
  const context = useContext(FilterContext);
  if (!context) {
    throw new Error('useFilters must be used within a FilterProvider');
  }
  return context;
};