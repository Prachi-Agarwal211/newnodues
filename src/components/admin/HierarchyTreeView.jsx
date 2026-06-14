'use client';

import { useState, useEffect, useMemo } from 'react';

/**
 * HierarchyTreeView - Visual tree display of Schools → Courses → Branches
 * 
 * Features:
 * - Collapsible tree structure
 * - Search/filter functionality
 * - Counts at each level
 * - Visual indicators for active/inactive items
 */
export default function HierarchyTreeView() {
    const [data, setData] = useState({ schools: [], courses: [], branches: [] });
    const [expandedSchools, setExpandedSchools] = useState(new Set());
    const [expandedCourses, setExpandedCourses] = useState(new Set());
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Fetch all configuration data
    useEffect(() => {
        async function fetchData() {
            try {
                const response = await fetch('/api/public/config?type=all');
                const result = await response.json();

                if (!result.success) {
                    throw new Error(result.error || 'Failed to fetch data');
                }

                setData({
                    schools: result.data.schools || [],
                    courses: result.data.courses || [],
                    branches: result.data.branches || []
                });
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, []);

    // Build tree structure
    const tree = useMemo(() => {
        const result = [];
        const searchLower = searchTerm.toLowerCase();

        for (const school of data.schools) {
            const schoolCourses = data.courses
                .filter(c => c.school_id === school.id)
                .sort((a, b) => a.display_order - b.display_order);

            const courseNodes = [];
            for (const course of schoolCourses) {
                const courseBranches = data.branches
                    .filter(b => b.course_id === course.id)
                    .sort((a, b) => a.display_order - b.display_order);

                // Filter by search
                const matchingBranches = searchTerm
                    ? courseBranches.filter(b => b.name.toLowerCase().includes(searchLower))
                    : courseBranches;

                const courseMatches = course.name.toLowerCase().includes(searchLower);

                if (matchingBranches.length > 0 || courseMatches || !searchTerm) {
                    courseNodes.push({
                        ...course,
                        branches: searchTerm ? matchingBranches : courseBranches,
                        totalBranches: courseBranches.length
                    });
                }
            }

            const schoolMatches = school.name.toLowerCase().includes(searchLower);

            if (courseNodes.length > 0 || schoolMatches || !searchTerm) {
                result.push({
                    ...school,
                    courses: courseNodes,
                    totalCourses: schoolCourses.length,
                    totalBranches: schoolCourses.reduce((sum, c) =>
                        sum + data.branches.filter(b => b.course_id === c.id).length, 0
                    )
                });
            }
        }

        return result;
    }, [data, searchTerm]);

    const toggleSchool = (schoolId) => {
        setExpandedSchools(prev => {
            const next = new Set(prev);
            if (next.has(schoolId)) {
                next.delete(schoolId);
            } else {
                next.add(schoolId);
            }
            return next;
        });
    };

    const toggleCourse = (courseId) => {
        setExpandedCourses(prev => {
            const next = new Set(prev);
            if (next.has(courseId)) {
                next.delete(courseId);
            } else {
                next.add(courseId);
            }
            return next;
        });
    };

    const expandAll = () => {
        setExpandedSchools(new Set(data.schools.map(s => s.id)));
        setExpandedCourses(new Set(data.courses.map(c => c.id)));
    };

    const collapseAll = () => {
        setExpandedSchools(new Set());
        setExpandedCourses(new Set());
    };

    if (loading) {
        return (
            <div className="p-6 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600 dark:text-gray-400">Loading hierarchy...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6 text-center text-red-600 dark:text-red-400">
                <p>Error: {error}</p>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-[#141414] rounded-lg shadow-md">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Schools → Courses → Branches Hierarchy
                </h2>

                {/* Stats */}
                <div className="flex flex-wrap gap-4 mb-4 text-sm">
                    <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full">
                        🏫 {data.schools.length} Schools
                    </span>
                    <span className="px-3 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-full">
                        📚 {data.courses.length} Courses
                    </span>
                    <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded-full">
                        🔹 {data.branches.length} Branches
                    </span>
                </div>

                {/* Controls */}
                <div className="flex flex-wrap gap-2 items-center">
                    <input
                        type="text"
                        placeholder="Search schools, courses, or branches..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="flex-1 min-w-[200px] px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                        onClick={expandAll}
                        className="px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                    >
                        Expand All
                    </button>
                    <button
                        onClick={collapseAll}
                        className="px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                    >
                        Collapse All
                    </button>
                </div>
            </div>

            {/* Tree */}
            <div className="p-4 max-h-[600px] overflow-y-auto">
                {tree.length === 0 ? (
                    <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                        {searchTerm ? 'No results found' : 'No data available'}
                    </p>
                ) : (
                    <div className="space-y-1">
                        {tree.map(school => (
                            <div key={school.id} className="border-l-2 border-blue-300 dark:border-blue-600">
                                {/* School */}
                                <button
                                    onClick={() => toggleSchool(school.id)}
                                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-left"
                                >
                                    <span className="text-gray-400">
                                        {expandedSchools.has(school.id) ? '▼' : '▶'}
                                    </span>
                                    <span className="text-lg">🏫</span>
                                    <span className="font-medium text-gray-900 dark:text-white flex-1">
                                        {school.name}
                                    </span>
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                        {school.totalCourses} courses • {school.totalBranches} branches
                                    </span>
                                    {!school.is_active && (
                                        <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400 text-xs rounded">
                                            Inactive
                                        </span>
                                    )}
                                </button>

                                {/* Courses */}
                                {expandedSchools.has(school.id) && (
                                    <div className="ml-6 border-l-2 border-green-300 dark:border-green-600">
                                        {school.courses.map(course => (
                                            <div key={course.id}>
                                                <button
                                                    onClick={() => toggleCourse(course.id)}
                                                    className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-700 text-left"
                                                >
                                                    <span className="text-gray-400 text-sm">
                                                        {expandedCourses.has(course.id) ? '▼' : '▶'}
                                                    </span>
                                                    <span>📚</span>
                                                    <span className="text-gray-800 dark:text-gray-200 flex-1">
                                                        {course.name}
                                                    </span>
                                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                                        {course.totalBranches} branches
                                                    </span>
                                                    {!course.is_active && (
                                                        <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400 text-xs rounded">
                                                            Inactive
                                                        </span>
                                                    )}
                                                </button>

                                                {/* Branches */}
                                                {expandedCourses.has(course.id) && (
                                                    <div className="ml-6 border-l-2 border-purple-300 dark:border-purple-600">
                                                        {course.branches.map(branch => (
                                                            <div
                                                                key={branch.id}
                                                                className="flex items-center gap-2 px-3 py-1 hover:bg-gray-50 dark:hover:bg-gray-700"
                                                            >
                                                                <span className="text-purple-400">•</span>
                                                                <span className="text-sm text-gray-700 dark:text-gray-300 flex-1">
                                                                    {branch.name}
                                                                </span>
                                                                {!branch.is_active && (
                                                                    <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400 text-xs rounded">
                                                                        Inactive
                                                                    </span>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
