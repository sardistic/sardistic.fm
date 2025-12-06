import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Activity, AlertTriangle, RefreshCw, TrendingUp, Clock, Mouse, BarChart3, Download } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const API_BASE = 'http://localhost:3001/api';

const COLORS = ['#06b6d4', '#ec4899', '#f59e0b', '#10b981', '#8b5cf6', '#f97316'];

function AdvancedAnalyticsDashboard() {
    const [summary, setSummary] = useState(null);
    const [events, setEvents] = useState([]);
    const [errors, setErrors] = useState([]);
    const [timeline, setTimeline] = useState([]);
    const [heatmapData, setHeatmapData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedPage, setSelectedPage] = useState('all');
    const [timeRange, setTimeRange] = useState(24);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [summaryRes, eventsRes, errorsRes, timelineRes, heatmapRes] = await Promise.all([
                fetch(`${API_BASE}/analytics/summary`),
                fetch(`${API_BASE}/events?limit=100`),
                fetch(`${API_BASE}/errors?limit=50`),
                fetch(`${API_BASE}/analytics/timeline?hours=${timeRange}`),
                fetch(`${API_BASE}/analytics/heatmap${selectedPage !== 'all' ? `?page=${selectedPage}` : ''}`)
            ]);

            const summaryData = await summaryRes.json();
            const eventsData = await eventsRes.json();
            const errorsData = await errorsRes.json();
            const timelineData = await timelineRes.json();
            const heatmapDataRes = await heatmapRes.json();

            setSummary(summaryData);
            setEvents(eventsData.data || []);
            setErrors(errorsData.data || []);
            setTimeline(timelineData.data || []);
            setHeatmapData(heatmapDataRes.data || []);
        } catch (error) {
            console.error('Failed to fetch analytics data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 5000); // Auto-refresh every 5s
        return () => clearInterval(interval);
    }, [timeRange, selectedPage]);

    const formatTimestamp = (timestamp) => {
        return new Date(timestamp).toLocaleString();
    };

    const exportData = () => {
        const data = { summary, events, errors, timeline, heatmapData };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `analytics-${Date.now()}.json`;
        a.click();
    };

    // Prepare chart data
    const eventTypeData = summary?.eventsByType?.map((item, i) => ({
        name: item.type,
        value: item.count,
        fill: COLORS[i % COLORS.length]
    })) || [];

    const topPagesData = summary?.topPages?.map(page => ({
        name: page.page,
        visits: page.visits,
        avgTime: Math.round(page.avg_time || 0)
    })) || [];

    // Timeline data grouped by hour
    const timelineGrouped = timeline.reduce((acc, event) => {
        const hour = new Date(event.timestamp).getHours();
        if (!acc[hour]) acc[hour] = { hour: `${hour}:00`, count: 0 };
        acc[hour].count++;
        return acc;
    }, {});
    const timelineChartData = Object.values(timelineGrouped).sort((a, b) => parseInt(a.hour) - parseInt(b.hour));

    if (loading && !summary) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center">
                <div className="text-white text-2xl">Loading analytics...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-neon-pink via-neon-purple to-neon-cyan">
                            Advanced Analytics
                        </h1>
                        <p className="text-gray-400 mt-2">Real-time insights with mouse tracking & time analysis</p>
                    </div>
                    <div className="flex gap-3">
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={exportData}
                            className="flex items-center gap-2 px-6 py-3 bg-neon-purple/20 hover:bg-neon-purple/30 rounded-xl border border-neon-purple/30 transition-colors"
                        >
                            <Download size={20} />
                            Export
                        </motion.button>
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={fetchData}
                            className="flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl border border-white/20 transition-colors"
                        >
                            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                            Refresh
                        </motion.button>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex gap-4 mb-8">
                    <select
                        value={timeRange}
                        onChange={(e) => setTimeRange(e.target.value)}
                        className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                    >
                        <option value={1}>Last Hour</option>
                        <option value={6}>Last 6 Hours</option>
                        <option value={24}>Last 24 Hours</option>
                        <option value={168}>Last Week</option>
                    </select>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <KPICard
                        title="Total Events"
                        value={summary?.totalEvents || 0}
                        icon={<Activity />}
                        color="cyan"
                    />
                    <KPICard
                        title="Total Errors"
                        value={summary?.totalErrors || 0}
                        icon={<AlertTriangle />}
                        color="pink"
                    />
                    <KPICard
                        title="Avg Page Time"
                        value={`${Math.round(summary?.avgPageTime?.avg || 0)}s`}
                        icon={<Clock />}
                        color="yellow"
                    />
                    <KPICard
                        title="Sessions"
                        value={summary?.totalSessions || 0}
                        icon={<BarChart3 />}
                        color="purple"
                    />
                </div>

                {/* Charts Row 1 */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                    {/* Event Timeline */}
                    <ChartCard title="Event Timeline">
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={timelineChartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                                <XAxis dataKey="hour" stroke="#6b7280" fontSize={12} />
                                <YAxis stroke="#6b7280" fontSize={12} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: '8px' }}
                                    itemStyle={{ color: '#fff' }}
                                />
                                <Line type="monotone" dataKey="count" stroke="#06b6d4" strokeWidth={3} dot={{ fill: '#06b6d4' }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </ChartCard>

                    {/* Event Types Distribution */}
                    <ChartCard title="Event Types">
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={eventTypeData}
                                    dataKey="value"
                                    nameKey="name"
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={100}
                                    label
                                >
                                    {eventTypeData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </ChartCard>
                </div>

                {/* Charts Row 2 */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                    {/* Top Pages */}
                    <ChartCard title="Top Pages by Visits">
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={topPagesData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                                <XAxis dataKey="name" stroke="#6b7280" fontSize={12} />
                                <YAxis stroke="#6b7280" fontSize={12} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: '8px' }}
                                />
                                <Bar dataKey="visits" fill="#ec4899" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartCard>

                    {/* Average Time per Page */}
                    <ChartCard title="Avg Time per Page (seconds)">
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={topPagesData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                                <XAxis dataKey="name" stroke="#6b7280" fontSize={12} />
                                <YAxis stroke="#6b7280" fontSize={12} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: '8px' }}
                                />
                                <Bar dataKey="avgTime" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartCard>
                </div>

                {/* Mouse Heatmap */}
                <ChartCard title="Mouse Movement Heatmap" icon={<Mouse />}>
                    <div className="text-gray-400 text-sm mb-4">
                        {heatmapData.length} movement samples recorded
                    </div>
                    <div className="relative h-64 bg-black/30 rounded-lg overflow-hidden">
                        {heatmapData.slice(0, 500).map((point, i) => (
                            <div
                                key={i}
                                className="absolute w-2 h-2 rounded-full bg-neon-cyan/50"
                                style={{
                                    left: `${(point.x / window.innerWidth) * 100}%`,
                                    top: `${(point.y / 400) * 100}%`,
                                    opacity: Math.min(point.intensity / 10, 1)
                                }}
                            />
                        ))}
                    </div>
                </ChartCard>

                {/* Recent Events Table */}
                <ChartCard title="Recent Events" className="mt-8">
                    <div className="overflow-x-auto max-h-96">
                        <table className="w-full">
                            <thead className="sticky top-0 bg-gray-900">
                                <tr className="border-b border-white/10">
                                    <th className="text-left py-3 px-4 text-gray-400 font-semibold">Type</th>
                                    <th className="text-left py-3 px-4 text-gray-400 font-semibold">Details</th>
                                    <th className="text-left py-3 px-4 text-gray-400 font-semibold">Timestamp</th>
                                </tr>
                            </thead>
                            <tbody>
                                {events.slice(0, 20).map((event) => (
                                    <tr key={event.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                        <td className="py-3 px-4">
                                            <span className="px-3 py-1 bg-neon-cyan/20 text-neon-cyan rounded-full text-sm">
                                                {event.type}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-gray-400 font-mono text-sm max-w-md truncate">
                                            {event.payload}
                                        </td>
                                        <td className="py-3 px-4 text-gray-500 text-sm">
                                            {formatTimestamp(event.timestamp)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </ChartCard>
            </div>
        </div>
    );
}

// Helper Components
const KPICard = ({ title, value, icon, color }) => {
    const colorMap = {
        cyan: { bg: 'from-neon-cyan/10', border: 'border-neon-cyan/20', text: 'text-neon-cyan' },
        pink: { bg: 'from-neon-pink/10', border: 'border-neon-pink/20', text: 'text-neon-pink' },
        yellow: { bg: 'from-neon-yellow/10', border: 'border-neon-yellow/20', text: 'text-neon-yellow' },
        purple: { bg: 'from-neon-purple/10', border: 'border-neon-purple/20', text: 'text-neon-purple' }
    };

    const colors = colorMap[color];

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`glass-panel p-6 bg-gradient-to-br ${colors.bg} to-transparent border ${colors.border}`}
        >
            <div className="flex items-center justify-between">
                <div>
                    <div className="text-gray-400 text-sm uppercase tracking-wider mb-2">{title}</div>
                    <div className={`text-5xl font-black ${colors.text}`}>{value}</div>
                </div>
                <div className={`${colors.text} opacity-50`}>
                    {React.cloneElement(icon, { size: 48 })}
                </div>
            </div>
        </motion.div>
    );
};

const ChartCard = ({ title, children, icon, className = '' }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`glass-panel p-6 bg-white/5 backdrop-blur-xl border border-white/10 ${className}`}
    >
        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
            {icon}
            {title}
        </h2>
        {children}
    </motion.div>
);

export default AdvancedAnalyticsDashboard;
