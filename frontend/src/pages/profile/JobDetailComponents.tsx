
import React from 'react';
import {
    Radar,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    Cell,
} from 'recharts';

/**
 * --------------------------------------------------------------------------
 * Types
 * --------------------------------------------------------------------------
 */
export interface IndicatorChartItem {
    indicator: string;      // e.g. "Creativity, WLB, Social..."
    indicator_data: string; // e.g. "3.4, 16.2, 3.4..."
}

export interface CompetencyItem {
    perform?: string;
    knowledge?: string;
    skill?: string;
    importance: number;
    source?: string;
}

/**
 * --------------------------------------------------------------------------
 * Helpers
 * --------------------------------------------------------------------------
 */
const parseIndicatorData = (chartData: IndicatorChartItem[]) => {
    if (!chartData || chartData.length === 0) return [];

    try {
        const item = chartData[0]; // Usually 1 row with comma-sep strings
        const labels = item.indicator.split(',').map((s) => s.trim());
        const values = item.indicator_data.split(',').map((s) => parseFloat(s.trim()));

        return labels.map((label, i) => ({
            subject: label,
            A: values[i] || 0,
            fullMark: 100, // assuming 100 scale or normalize later
        }));
    } catch (e) {
        console.warn("Failed to parse indicator chart data", e);
        return [];
    }
};

/**
 * --------------------------------------------------------------------------
 * Components
 * --------------------------------------------------------------------------
 */

// 1. Radar Chart for Job Indicators
export const JobIndicatorChart = ({ data }: { data: IndicatorChartItem[] }) => {
    const chartData = parseIndicatorData(data);

    if (chartData.length === 0) {
        return (
            <div className="flex h-64 items-center justify-center rounded-2xl bg-gray-50 text-sm text-gray-400">
                지표 데이터가 없습니다.
            </div>
        );
    }

    return (
        <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
                    <PolarGrid stroke="#e5e7eb" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#4b5563', fontSize: 12 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={false} axisLine={false} />
                    <Radar
                        name="직업 지표"
                        dataKey="A"
                        stroke="#6366f1"
                        fill="#6366f1"
                        fillOpacity={0.4}
                    />
                    <Tooltip
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                        itemStyle={{ color: '#4f46e5', fontWeight: 'bold' }}
                    />
                </RadarChart>
            </ResponsiveContainer>
        </div>
    );
};

// 2. Bar Chart for Competency (Perform/Knowledge/Skill)
export const CompetencyBarChart = ({
    data,
    type,
    darkMode = false
}: {
    data: CompetencyItem[],
    type: 'perform' | 'knowledge' | 'skill',
    darkMode?: boolean
}) => {
    // Sort by importance desc and take top 5
    const sortedData = [...data]
        .sort((a, b) => b.importance - a.importance)
        .slice(0, 5)
        .map(item => ({
            name: item[type] || 'Unknown',
            value: item.importance,
        }));

    if (sortedData.length === 0) {
        return (
            <div className={`flex h-40 items-center justify-center rounded-2xl text-sm ${
                darkMode ? 'bg-white/[0.03] text-white/50' : 'bg-gray-50 text-gray-400'
            }`}>
                역량 데이터가 없습니다.
            </div>
        );
    }

    return (
        <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    layout="vertical"
                    data={sortedData}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                    <XAxis type="number" hide />
                    <YAxis
                        dataKey="name"
                        type="category"
                        width={100}
                        tick={{ fontSize: 11, fill: darkMode ? 'rgba(255,255,255,0.6)' : '#374151' }}
                        interval={0}
                    />
                    <Tooltip
                        cursor={{ fill: darkMode ? 'rgba(255,255,255,0.05)' : '#f3f4f6' }}
                        contentStyle={{
                            borderRadius: '8px',
                            border: 'none',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                            backgroundColor: darkMode ? '#1a1a24' : '#fff',
                            color: darkMode ? '#fff' : '#000'
                        }}
                    />
                    <Bar dataKey="value" barSize={12} radius={[0, 4, 4, 0]}>
                        {sortedData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={index < 3 ? '#5A7BFF' : darkMode ? '#5A7BFF50' : '#a5b4fc'} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

// 3. Simple Tab Component
interface TabProps {
    label: string;
    isActive: boolean;
    onClick: () => void;
}

export const TabButton = ({ label, isActive, onClick }: TabProps) => (
    <button
        onClick={onClick}
        className={`
      flex-1 py-4 text-sm font-bold transition-all relative
      ${isActive ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-600'}
    `}
    >
        {label}
        {isActive && (
            <div className="absolute bottom-0 left-0 h-0.5 w-full bg-indigo-600 rounded-t-full" />
        )}
    </button>
);
