import React, { useState, useMemo, useEffect } from 'react';
import { Search, ArrowLeft, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

function Library({ data, onBack, onArtistClick }) {
    const [search, setSearch] = useState('');
    const [sort, setSort] = useState('plays');
    const [order, setOrder] = useState('desc');
    const [page, setPage] = useState(1);

    // Config
    const ITEMS_PER_PAGE = 50;

    // 1. Process Data
    const allArtists = useMemo(() => {
        if (!data || !data.artists) return [];
        return Object.entries(data.artists).map(([name, stats]) => ({
            name,
            plays: stats.t,
            year: stats.y ? Object.keys(stats.y).length : 0,
            img: stats.img
        }));
    }, [data]);

    // 2. Filter & Sort
    const filteredArtists = useMemo(() => {
        let result = allArtists;

        if (search) {
            const q = search.toLowerCase();
            result = result.filter(a => a.name.toLowerCase().includes(q));
        }

        return result.sort((a, b) => {
            let valA = sort === 'name' ? a.name : a.plays;
            let valB = sort === 'name' ? b.name : b.plays;

            if (sort === 'name') {
                return order === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
            } else {
                return order === 'asc' ? valA - valB : valB - valA;
            }
        });
    }, [allArtists, search, sort, order]);

    // 3. Paginate
    const totalPages = Math.ceil(filteredArtists.length / ITEMS_PER_PAGE);
    const paginatedArtists = filteredArtists.slice(
        (page - 1) * ITEMS_PER_PAGE,
        page * ITEMS_PER_PAGE
    );

    // Reset page on filter change
    useEffect(() => {
        setPage(1);
    }, [search, sort, order]);

    // Scroll to top on page change
    useEffect(() => {
        const listContainer = document.getElementById('library-list');
        if (listContainer) listContainer.scrollTop = 0;
    }, [page]);

    return (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex flex-col">
            {/* Header */}
            <div className="h-20 flex items-center justify-between gap-4 px-6 border-b border-white/10 bg-black/50 shrink-0">
                <button onClick={onBack} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
                    <ArrowLeft size={20} /> Back
                </button>
                <div className="flex-1 max-w-md relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-neon-cyan transition-colors" size={18} />
                    <input
                        type="text"
                        placeholder={`Search ${allArtists.length.toLocaleString()} artists...`}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-full py-2 pl-10 pr-4 text-white focus:outline-none focus:border-neon-cyan/50 transition-colors"
                        autoFocus
                    />
                </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between text-sm text-gray-500 py-3 px-6 bg-black/30 border-b border-white/5 shrink-0">
                <div className="flex items-center gap-4">
                    <span>
                        <span className="text-white font-bold">{filteredArtists.length.toLocaleString()}</span> artists
                    </span>
                    <div className="h-4 w-px bg-white/10"></div>
                    <button
                        onClick={() => {
                            if (sort === 'plays') setOrder(o => o === 'asc' ? 'desc' : 'asc');
                            else { setSort('plays'); setOrder('desc'); }
                        }}
                        className={`flex items-center gap-1 hover:text-white transition-colors ${sort === 'plays' ? 'text-neon-pink' : ''}`}
                    >
                        Plays {sort === 'plays' && (order === 'desc' ? '↓' : '↑')}
                    </button>
                    <button
                        onClick={() => {
                            if (sort === 'name') setOrder(o => o === 'asc' ? 'desc' : 'asc');
                            else { setSort('name'); setOrder('asc'); }
                        }}
                        className={`flex items-center gap-1 hover:text-white transition-colors ${sort === 'name' ? 'text-neon-pink' : ''}`}
                    >
                        Name {sort === 'name' && (order === 'asc' ? '↓' : '↑')}
                    </button>
                </div>

                {/* Pagination Controls Top */}
                <div className="flex items-center gap-2">
                    <button
                        disabled={page === 1}
                        onClick={() => setPage(p => p - 1)}
                        className="p-1 hover:text-white disabled:opacity-30 disabled:hover:text-gray-500"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <span className="font-mono text-xs">
                        Page <span className="text-white">{page}</span> / {totalPages || 1}
                    </span>
                    <button
                        disabled={page === totalPages || totalPages === 0}
                        onClick={() => setPage(p => p + 1)}
                        className="p-1 hover:text-white disabled:opacity-30 disabled:hover:text-gray-500"
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>
            </div>

            {/* List Content */}
            <div id="library-list" className="flex-1 overflow-y-auto p-4 content-start">
                {paginatedArtists.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-gray-500">
                        No artists found
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                        {paginatedArtists.map((artist, i) => (
                            <div
                                key={artist.name}
                                onClick={() => onArtistClick(artist.name)}
                                className="flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 border border-transparent hover:border-neon-cyan/30 cursor-pointer group transition-all"
                            >
                                <div className="w-12 h-12 rounded bg-black/40 overflow-hidden shrink-0">
                                    {artist.img ? (
                                        <img src={artist.img} loading="lazy" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-xs font-bold text-gray-700">
                                            {artist.name.slice(0, 2).toUpperCase()}
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-bold text-gray-200 truncate group-hover:text-neon-cyan transition-colors">
                                        {artist.name}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                        {(page - 1) * ITEMS_PER_PAGE + i + 1}. • {artist.year} yrs
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="font-bold text-white text-sm">{artist.plays.toLocaleString()}</div>
                                    <div className="text-[10px] text-gray-600">plays</div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Footer Pagination (Easier access at bottom) */}
                {totalPages > 1 && (
                    <div className="flex justify-center py-8 gap-4">
                        <button
                            disabled={page === 1}
                            onClick={() => setPage(p => p - 1)}
                            className="px-4 py-2 bg-white/5 rounded-full hover:bg-white/10 disabled:opacity-30"
                        >
                            Previous
                        </button>
                        <button
                            disabled={page === totalPages}
                            onClick={() => setPage(p => p + 1)}
                            className="px-4 py-2 bg-white/5 rounded-full hover:bg-white/10 disabled:opacity-30"
                        >
                            Next
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Library;
