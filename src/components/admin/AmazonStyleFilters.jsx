'use client';

import { useState, useEffect } from 'react';
import { Filter, ChevronDown, X, Search, Calendar, Users, Building, BookOpen, GraduationCap, Briefcase, Check } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

export default function AmazonStyleFilters({ 
  onFiltersChange, 
  availableFilters = {},
  loading = false 
}) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  
  const [showFilters, setShowFilters] = useState(false);
  const [activeFilters, setActiveFilters] = useState({});
  const [expandedSections, setExpandedSections] = useState({
    basic: true,
    academic: true,
    status: true,
    date: false
  });

  // Initialize filters from available options
  useEffect(() => {
    if (availableFilters.schools && availableFilters.schools.length > 0) {
      setActiveFilters(prev => ({
        ...prev,
        schools: availableFilters.schools.map(s => ({ ...s, selected: false }))
      }));
    }
    if (availableFilters.courses && availableFilters.courses.length > 0) {
      setActiveFilters(prev => ({
        ...prev,
        courses: availableFilters.courses.map(c => ({ ...c, selected: false }))
      }));
    }
    if (availableFilters.branches && availableFilters.branches.length > 0) {
      setActiveFilters(prev => ({
        ...prev,
        branches: availableFilters.branches.map(b => ({ ...b, selected: false }))
      }));
    }
    if (availableFilters.departments && availableFilters.departments.length > 0) {
      setActiveFilters(prev => ({
        ...prev,
        departments: availableFilters.departments.map(d => ({ ...d, selected: false }))
      }));
    }
  }, [availableFilters]);

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleFilterChange = (category, value) => {
    setActiveFilters(prev => {
      const updated = { ...prev };
      
      if (category === 'search') {
        updated.search = value;
      } else if (category === 'status') {
        updated.status = updated.status === value ? '' : value;
      } else if (category === 'priority') {
        updated.priority = updated.priority === value ? '' : value;
      } else if (category === 'admissionYear') {
        updated.admissionYear = updated.admissionYear === value ? '' : value;
      } else if (category === 'passingYear') {
        updated.passingYear = updated.passingYear === value ? '' : value;
      } else if (updated[category]) {
        // Handle multi-select arrays
        updated[category] = updated[category].map(item => 
          item.id === value || item.name === value 
            ? { ...item, selected: !item.selected }
            : item
        );
      }
      
      return updated;
    });
  };

  const getSelectedFilters = () => {
    const selected = {};
    
    if (activeFilters.search) selected.search = activeFilters.search;
    if (activeFilters.status) selected.status = activeFilters.status;
    if (activeFilters.priority) selected.priority = activeFilters.priority;
    if (activeFilters.admissionYear) selected.admissionYear = activeFilters.admissionYear;
    if (activeFilters.passingYear) selected.passingYear = activeFilters.passingYear;
    
    // Multi-select filters
    ['schools', 'courses', 'branches', 'departments'].forEach(category => {
      if (activeFilters[category]) {
        const selectedItems = activeFilters[category]
          .filter(item => item.selected)
          .map(item => item.id || item.name);
        if (selectedItems.length > 0) {
          selected[category] = selectedItems;
        }
      }
    });
    
    return selected;
  };

  const clearAllFilters = () => {
    setActiveFilters(prev => {
      const cleared = { ...prev };
      
      // Clear single values
      cleared.search = '';
      cleared.status = '';
      cleared.priority = '';
      cleared.admissionYear = '';
      cleared.passingYear = '';
      
      // Clear multi-select arrays
      ['schools', 'courses', 'branches', 'departments'].forEach(category => {
        if (cleared[category]) {
          cleared[category] = cleared[category].map(item => ({ ...item, selected: false }));
        }
      });
      
      return cleared;
    });
    
    onFiltersChange({});
  };

  const applyFilters = () => {
    const selected = getSelectedFilters();
    onFiltersChange(selected);
    setShowFilters(false);
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (activeFilters.search) count++;
    if (activeFilters.status) count++;
    if (activeFilters.priority) count++;
    if (activeFilters.admissionYear) count++;
    if (activeFilters.passingYear) count++;
    
    ['schools', 'courses', 'branches', 'departments'].forEach(category => {
      if (activeFilters[category]) {
        count += activeFilters[category].filter(item => item.selected).length;
      }
    });
    
    return count;
  };

  const FilterSection = ({ title, icon: Icon, children, sectionKey }) => (
    <div className="border-b border-gray-200 dark:border-gray-700 last:border-b-0">
      <button
        onClick={() => toggleSection(sectionKey)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-[#1a1a1a] transition-colors"
      >
        <div className="flex items-center gap-3">
          <Icon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          <span className="font-medium text-gray-900 dark:text-white">{title}</span>
        </div>
        <ChevronDown 
          className={`w-5 h-5 text-gray-400 transition-transform ${
            expandedSections[sectionKey] ? 'rotate-180' : ''
          }`} 
        />
      </button>
      
      {expandedSections[sectionKey] && (
        <div className="px-4 pb-4">
          {children}
        </div>
      )}
    </div>
  );

  const MultiSelectFilter = ({ items, category, placeholder }) => (
    <div className="space-y-2">
      <div className="max-h-48 overflow-y-auto space-y-1">
        {items.map((item) => (
          <label
            key={item.id || item.name}
            className="flex items-center gap-2 p-2 hover:bg-gray-50 dark:hover:bg-[#1a1a1a] rounded cursor-pointer"
          >
            <input
              type="checkbox"
              checked={item.selected || false}
              onChange={() => handleFilterChange(category, item.id || item.name)}
              className="rounded border-gray-300 text-jecrc-red focus:ring-jecrc-red"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {item.name || item.display_name}
            </span>
          </label>
        ))}
      </div>
    </div>
  );

  const SingleSelectFilter = ({ options, value, category, placeholder }) => (
    <div className="space-y-2">
      <select
        value={value || ''}
        onChange={(e) => handleFilterChange(category, e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-jecrc-red focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value || option} value={option.value || option}>
            {option.label || option}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <div className="relative">
      {/* Filter Toggle Button */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ${
            getActiveFilterCount() > 0
              ? 'border-jecrc-red bg-jecrc-red/10 text-jecrc-red'
              : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-[#1a1a1a]'
          }`}
        >
          <Filter className="w-4 h-4" />
          <span className="text-sm font-medium">Filters</span>
          {getActiveFilterCount() > 0 && (
            <span className="px-2 py-0.5 bg-jecrc-red text-white text-xs rounded-full">
              {getActiveFilterCount()}
            </span>
          )}
        </button>
        
        {getActiveFilterCount() > 0 && (
          <button
            onClick={clearAllFilters}
            className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Filter Dropdown */}
      {showFilters && (
        <div className="absolute top-full left-0 right-0 z-50 mt-2 bg-white dark:bg-[#141414] border border-white/10 rounded-lg shadow-lg">
          <div className="max-h-96 overflow-y-auto">
            {/* Basic Filters */}
            <FilterSection title="Basic Filters" icon={Search} sectionKey="basic">
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Search
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={activeFilters.search || ''}
                      onChange={(e) => handleFilterChange('search', e.target.value)}
                      placeholder="Search by name, registration, email..."
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-jecrc-red focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                    />
                  </div>
                </div>
              </div>
            </FilterSection>

            {/* Academic Filters */}
            <FilterSection title="Academic Filters" icon={GraduationCap} sectionKey="academic">
              <div className="space-y-4">
                {activeFilters.schools && (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Schools
                    </label>
                    <MultiSelectFilter
                      items={activeFilters.schools}
                      category="schools"
                      placeholder="Select schools"
                    />
                  </div>
                )}
                
                {activeFilters.courses && (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Courses
                    </label>
                    <MultiSelectFilter
                      items={activeFilters.courses}
                      category="courses"
                      placeholder="Select courses"
                    />
                  </div>
                )}
                
                {activeFilters.branches && (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Branches
                    </label>
                    <MultiSelectFilter
                      items={activeFilters.branches}
                      category="branches"
                      placeholder="Select branches"
                    />
                  </div>
                )}
                
                {activeFilters.departments && (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Departments
                    </label>
                    <MultiSelectFilter
                      items={activeFilters.departments}
                      category="departments"
                      placeholder="Select departments"
                    />
                  </div>
                )}
              </div>
            </FilterSection>

            {/* Status Filters */}
            <FilterSection title="Status & Priority" icon={Users} sectionKey="status">
              <div className="space-y-4">
                <SingleSelectFilter
                  options={[
                    { value: 'pending', label: 'Pending' },
                    { value: 'in_progress', label: 'In Progress' },
                    { value: 'completed', label: 'Completed' },
                    { value: 'rejected', label: 'Rejected' }
                  ]}
                  value={activeFilters.status}
                  category="status"
                  placeholder="Select status"
                />
                
                <SingleSelectFilter
                  options={[
                    { value: 'low', label: 'Low' },
                    { value: 'medium', label: 'Medium' },
                    { value: 'high', label: 'High' },
                    { value: 'critical', label: 'Critical' }
                  ]}
                  value={activeFilters.priority}
                  category="priority"
                  placeholder="Select priority"
                />
              </div>
            </FilterSection>

            {/* Date Filters */}
            <FilterSection title="Date Filters" icon={Calendar} sectionKey="date">
              <div className="space-y-4">
                <SingleSelectFilter
                  options={[
                    { value: '2018', label: '2018' },
                    { value: '2019', label: '2019' },
                    { value: '2020', label: '2020' },
                    { value: '2021', label: '2021' },
                    { value: '2022', label: '2022' },
                    { value: '2023', label: '2023' },
                    { value: '2024', label: '2024' },
                    { value: '2025', label: '2025' }
                  ]}
                  value={activeFilters.admissionYear}
                  category="admissionYear"
                  placeholder="Admission Year"
                />
                
                <SingleSelectFilter
                  options={[
                    { value: '2022', label: '2022' },
                    { value: '2023', label: '2023' },
                    { value: '2024', label: '2024' },
                    { value: '2025', label: '2025' },
                    { value: '2026', label: '2026' },
                    { value: '2027', label: '2027' }
                  ]}
                  value={activeFilters.passingYear}
                  category="passingYear"
                  placeholder="Passing Year"
                />
              </div>
            </FilterSection>
          </div>

          {/* Action Buttons */}
          <div className="border-t border-gray-200 dark:border-gray-700 p-4 flex justify-between items-center">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {getActiveFilterCount()} filter{getActiveFilterCount() !== 1 ? 's' : ''} selected
            </div>
            <div className="flex gap-2">
              <button
                onClick={clearAllFilters}
                className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-[#1a1a1a] transition-colors"
              >
                Clear
              </button>
              <button
                onClick={applyFilters}
                className="px-4 py-2 text-sm bg-jecrc-red text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
