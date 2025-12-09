import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Activity, AlertTriangle, RefreshCw, TrendingUp } from 'lucide-react';

const API_BASE = (import.meta.env.VITE_SERVER_URL || 'http://localhost:3001') + '/api';

function AnalyticsDashboard() {
    const [stats, setStats] = useState({ totalEvents: 0, totalErrors: 0 });
    const [events, setEvents] = useState([]);
    const [errors, setErrors] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [statsRes, eventsRes, errorsRes] = await Promise.all([
                fetch(`${API_BASE}/stats`),
                fetch(`${API_BASE}/events?limit=50`),
                fetch(`${API_BASE}/errors?limit=50`)
            ]);

            const statsData = await statsRes.json();
            const eventsData = await eventsRes.json();
            const errorsData = await errorsRes.json();

            setStats(statsData);
            setEvents(eventsData.data || []);
            setErrors(errorsData.data || []);
        } catch (error) {
            console.error('Failed to fetch analytics data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const formatTimestamp = (timestamp) => {
        return new Date(timestamp).toLocaleString();
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-neon-pink via-neon-purple to-neon-cyan">
                            Analytics Dashboard
                        </h1>
                        <p className="text-gray-400 mt-2">Real-time insights into the application</p>
                    </div>
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

                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="glass-panel p-6 bg-gradient-to-br from-neon-cyan/10 to-transparent border border-neon-cyan/20"
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-gray-400 text-sm uppercase tracking-wider mb-2">Total Events</div>
                                <div className="text-5xl font-black text-neon-cyan">{stats.totalEvents}</div>
                            </div>
                            <Activity size={48} className="text-neon-cyan opacity-50" />
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="glass-panel p-6 bg-gradient-to-br from-neon-pink/10 to-transparent border border-neon-pink/20"
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-gray-400 text-sm uppercase tracking-wider mb-2">Total Errors</div>
                                <div className="text-5xl font-black text-neon-pink">{stats.totalErrors}</div>
                            </div>
                            <AlertTriangle size={48} className="text-neon-pink opacity-50" />
                        </div>
                    </motion.div>
                </div>

                {/* Events Table */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="glass-panel p-6 bg-white/5 backdrop-blur-xl border border-white/10 mb-8"
                >
                    <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                        <TrendingUp size={24} className="text-neon-cyan" />
                        Recent Events
                    </h2>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-white/10">
                                    <th className="text-left py-3 px-4 text-gray-400 font-semibold">ID</th>
                                    <th className="text-left py-3 px-4 text-gray-400 font-semibold">Type</th>
                                    <th className="text-left py-3 px-4 text-gray-400 font-semibold">Payload</th>
                                    <th className="text-left py-3 px-4 text-gray-400 font-semibold">Timestamp</th>
                                </tr>
                            </thead>
                            <tbody>
                                {events.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" className="text-center py-8 text-gray-500">
                                            No events recorded yet
                                        </td>
                                    </tr>
                                ) : (
                                    events.map((event) => (
                                        <tr key={event.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                            <td className="py-3 px-4 text-gray-300">{event.id}</td>
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
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </motion.div>

                {/* Errors Table */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="glass-panel p-6 bg-white/5 backdrop-blur-xl border border-white/10"
                >
                    <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                        <AlertTriangle size={24} className="text-neon-pink" />
                        Error Logs
                    </h2>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-white/10">
                                    <th className="text-left py-3 px-4 text-gray-400 font-semibold">ID</th>
                                    <th className="text-left py-3 px-4 text-gray-400 font-semibold">Message</th>
                                    <th className="text-left py-3 px-4 text-gray-400 font-semibold">Stack</th>
                                    <th className="text-left py-3 px-4 text-gray-400 font-semibold">Timestamp</th>
                                </tr>
                            </thead>
                            <tbody>
                                {errors.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" className="text-center py-8 text-gray-500">
                                            No errors logged (that's good!)
                                        </td>
                                    </tr>
                                ) : (
                                    errors.map((error) => (
                                        <tr key={error.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                            <td className="py-3 px-4 text-gray-300">{error.id}</td>
                                            <td className="py-3 px-4 text-neon-pink max-w-md truncate">
                                                {error.message}
                                            </td>
                                            <td className="py-3 px-4 text-gray-500 font-mono text-xs max-w-lg truncate">
                                                {error.stack}
                                            </td>
                                            <td className="py-3 px-4 text-gray-500 text-sm">
                                                {formatTimestamp(error.timestamp)}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}

export default AnalyticsDashboard;
