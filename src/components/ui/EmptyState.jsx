'use client';
import { AlertCircle, Search, FolderOpen, Filter, RefreshCw } from 'lucide-react';

/**
 * Professional EmptyState component with contextual messages
 * Shows appropriate icon, message, and action based on context
 */
export default function EmptyState({
  icon: Icon = FolderOpen,
  title = 'No items found',
  description = 'There are no items to display',
  actionLabel,
  onAction,
  variant = 'default', // default | search | filter | error
  className = ''
}) {
  // Auto-select icon based on variant
  const IconComponent = variant === 'search' ? Search 
    : variant === 'filter' ? Filter 
    : variant === 'error' ? AlertCircle 
    : Icon;

  return (
    <div className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className}`}>
      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ${
        variant === 'error' 
          ? 'bg-red-100 dark:bg-red-900/20' 
          : 'bg-gray-100 dark:bg-[#1a1a1a]'
      }`}>
        <IconComponent className={`w-8 h-8 ${
          variant === 'error' 
            ? 'text-red-500 dark:text-red-400' 
            : 'text-gray-400 dark:text-gray-500'
        }`} />
      </div>
      
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        {title}
      </h3>
      
      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mb-6">
        {description}
      </p>
      
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="px-4 py-2 bg-jecrc-red hover:bg-jecrc-red-dark text-white rounded-xl font-medium transition-colors shadow-lg shadow-jecrc-red/20 flex items-center gap-2"
        >
          {variant === 'search' || variant === 'filter' ? (
            <RefreshCw className="w-4 h-4" />
          ) : null}
          {actionLabel}
        </button>
      )}
    </div>
  );
}

// Preset configurations for common scenarios
export function SearchEmptyState({ searchTerm, onClear }) {
  return (
    <EmptyState
      variant="search"
      title="No results found"
      description={`No items match "${searchTerm}". Try adjusting your search.`}
      actionLabel="Clear search"
      onAction={onClear}
    />
  );
}

export function FilterEmptyState({ onClearFilters }) {
  return (
    <EmptyState
      variant="filter"
      title="No items match filters"
      description="Try adjusting or clearing your filters to see more results."
      actionLabel="Clear filters"
      onAction={onClearFilters}
    />
  );
}

export function NoDataEmptyState({ entityName = 'items', onAdd }) {
  return (
    <EmptyState
      icon={FolderOpen}
      title={`No ${entityName} yet`}
      description={`Get started by adding your first ${entityName}.`}
      actionLabel={`Add ${entityName}`}
      onAction={onAdd}
    />
  );
}

export function ErrorEmptyState({ error, onRetry }) {
  return (
    <EmptyState
      variant="error"
      title="Something went wrong"
      description={error || 'Failed to load data. Please try again.'}
      actionLabel="Retry"
      onAction={onRetry}
    />
  );
}