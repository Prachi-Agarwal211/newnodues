'use client';

import React from 'react';
import { Bar } from 'react-chartjs-2';
import { useTheme } from '@/contexts/ThemeContext';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

function DepartmentPerformanceChart({ data }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const chartData = {
    labels: data ? data.map(item => item.department_name) : [],
    datasets: [
      {
        label: 'Completed',
        data: data ? data.map(item => item.completed_requests || 0) : [],
        backgroundColor: isDark ? 'rgba(0, 255, 136, 0.8)' : 'rgba(45, 122, 69, 0.8)',
      },
      {
        label: 'Rejected',
        data: data ? data.map(item => item.rejected_requests || 0) : [],
        backgroundColor: isDark ? 'rgba(255, 51, 102, 0.8)' : 'rgba(196, 30, 58, 0.8)',
      },
      {
        label: 'Pending',
        data: data ? data.map(item => item.pending_requests || 0) : [],
        backgroundColor: isDark ? 'rgba(255, 176, 32, 0.8)' : 'rgba(217, 119, 6, 0.8)',
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: isDark ? '#FFFFFF' : '#000000',
        },
      },
      title: {
        display: true,
        text: 'Department Performance Overview',
        color: isDark ? '#FFFFFF' : '#000000',
      },
    },
    scales: {
      x: {
        ticks: {
          color: isDark ? '#CCCCCC' : '#333333',
        },
        grid: {
          color: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
        },
      },
      y: {
        ticks: {
          color: isDark ? '#CCCCCC' : '#333333',
        },
        grid: {
          color: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
        },
      },
    },
  };

  return (
    <div className={`rounded-xl border p-6 transition-all duration-700 ${
      isDark
        ? 'bg-white/5 border-white/10 backdrop-blur-sm'
        : 'bg-white border-gray-200 shadow-sm'
    }`}>
      <Bar data={chartData} options={options} />
    </div>
  );
}

// Export without memo to allow real-time updates
export default DepartmentPerformanceChart;