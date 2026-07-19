import React, { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { stations as mockStations, connections as mockConnections, stationMap as mockStationMap } from './data/metroData';
import MetroMap from './components/MetroMap';
import { fuzzyMatch } from './lib/searchUtils';

const API_BASE = import.meta.env.VITE_API_BASE || (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? 'http://localhost:3001/api' : 'https://metro-route-finder.onrender.com/api');

const navItems = [
  { to: '/', label: 'Home', labelHi: 'होम' },
  { to: '/search', label: 'Search Station', labelHi: 'स्टेशन खोज' },
  { to: '/route', label: 'Route Planner', labelHi: 'मार्ग योजना' },
  { to: '/map', label: 'Interactive Map', labelHi: 'इंटरैक्टिव मानचित्र' },
  { to: '/algorithms', label: 'Algorithms', labelHi: 'एल्गोरिदम' },
  { to: '/stats', label: 'Network Analytics', labelHi: 'नेटवर्क विश्लेषण' },
  { to: '/history', label: 'History', labelHi: 'इतिहास' },
  { to: '/admin', label: 'Admin Panel', labelHi: 'प्रशासन पैनल' },
  { to: '/settings', label: 'Settings', labelHi: 'सेटिंग्स' },
];

const lineColors = {
  Red: '#ff7a59',
  Blue: '#38bdf8',
  Green: '#22c55e',
  Yellow: '#f59e0b',
  Purple: '#a855f7',
};

// State helper
function useLocalStorageState(key, initialValue) {
  const [value, setValue] = useState(() => {
    const stored = window.localStorage.getItem(key);
    return stored ? JSON.parse(stored) : initialValue;
  });
  useEffect(() => {
    window.localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);
  return [value, setValue];
}

// Translations dictionary
const translations = {
  en: {
    title: "Metro Route Finder",
    subtitle: "Enterprise Graph Optimization & Route Analytics",
    planJourney: "Plan Journey",
    findRoute: "Find Route",
    source: "Source Station",
    destination: "Destination Station",
    distance: "Distance",
    time: "Travel Time",
    fare: "Ticket Fare",
    stations: "Stations",
    interchanges: "Interchanges",
    mode: "Optimization Mode",
    options: "Alternative Suggestions",
    stats: "Network Diagnostics",
    clearHistory: "Clear History",
    historyTitle: "Journey History",
    voiceSearch: "Voice Search",
    speakNow: "Speak station name...",
    peakHour: "Peak Hour Surcharge",
    delaySim: "Simulate Delay",
    co2Title: "Green Journey",
    wheelchair: "Wheelchair Access Mode",
    activeDelay: "Active Train Delay",
    baseFare: "Base Fare",
    distFare: "Distance Fare",
    surcharge: "Peak Surcharge",
    ticketTitle: "Digital Boarding Ticket",
    ticketScan: "Scan QR Code at Gates",
    loading: "Computing optimal routes via C++ engine...",
  },
  hi: {
    title: "मेट्रो मार्ग खोजक",
    subtitle: "एंटरप्राइज ग्राफ ऑप्टिमाइज़ेशन और रूट एनालिटिक्स",
    planJourney: "यात्रा की योजना",
    findRoute: "मार्ग खोजें",
    source: "प्रस्थान स्टेशन",
    destination: "गंतव्य स्टेशन",
    distance: "दूरी",
    time: "यात्रा समय",
    fare: "यात्रा किराया",
    stations: "स्टेशन गणना",
    interchanges: "इंटरचेंज",
    mode: "ऑप्टिमाइज़ेशन मोड",
    options: "वैकल्पिक मार्ग सुझाव",
    stats: "नेटवर्क निदान",
    clearHistory: "इतिहास साफ़ करें",
    historyTitle: "यात्रा का इतिहास",
    voiceSearch: "आवाज खोज",
    speakNow: "स्टेशन का नाम बोलें...",
    peakHour: "पीक आवर अधिभार",
    delaySim: "विलंब सिमुलेशन",
    co2Title: "हरित यात्रा",
    wheelchair: "व्हीलचेयर अनुकूल मोड",
    activeDelay: "सक्रिय ट्रेन विलंब",
    baseFare: "मूल किराया",
    distFare: "दूरी किराया",
    surcharge: "पीक अधिभार",
    ticketTitle: "डिजिटल बोर्डिंग टिकट",
    ticketScan: "गेट पर क्यूआर कोड स्कैन करें",
    loading: "सी++ इंजन के माध्यम से मार्गों की गणना की जा रही है...",
  }
};

function AppLayout({ children, language, setLanguage, toast, setToast }) {
  const location = useLocation();
  const [darkMode, setDarkMode] = useLocalStorageState('metro-dark-mode', true);

  useEffect(() => {
    document.documentElement.className = darkMode ? 'dark' : 'light';
  }, [darkMode]);

  return (
    <div className={`min-h-screen transition-all ${darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      {/* Toast Alert overlay */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-3 rounded-2xl bg-slate-900 text-white px-5 py-3 shadow-2xl border border-white/10 animate-bounce">
          <span className="text-orange-400">💡</span>
          <span className="text-sm font-semibold">{toast}</span>
          <button onClick={() => setToast(null)} className="text-xs text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      <div className="relative mx-auto flex min-h-screen max-w-[1600px] gap-6 p-4 lg:p-6">
        <aside className="glass hidden w-[300px] shrink-0 rounded-[32px] p-5 shadow-glow xl:block border border-white/5 bg-slate-950/20 backdrop-blur-xl">
          <div className="mb-6 rounded-[24px] bg-gradient-to-br from-orange-500 via-orange-400 to-amber-300 p-5 text-slate-950 shadow-2xl">
            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-900/60">Final Year Project</p>
            <h1 className="mt-3 text-2xl font-black leading-tight tracking-tight">Metro System Optimization</h1>
            <p className="mt-3 text-xs leading-relaxed text-slate-900/80">Premium full-stack application leveraging C++17 Graph algorithm CLI and Express REST API.</p>
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition ${
                  location.pathname === item.to
                    ? 'bg-orange-500/10 border border-orange-500/20 text-orange-400'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white border border-transparent'
                }`}
              >
                <span>{language === 'en' ? item.label : item.labelHi}</span>
              </Link>
            ))}
          </nav>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col gap-6">
          <header className="glass rounded-[32px] p-5 shadow-glow border border-white/5 bg-slate-950/20 backdrop-blur-xl flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-orange-400">{translations[language].subtitle}</p>
              <h2 className="mt-1 text-2xl font-extrabold tracking-tight">{translations[language].title}</h2>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={() => setLanguage(l => l === 'en' ? 'hi' : 'en')}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-semibold hover:bg-white/10 transition"
              >
                {language === 'en' ? 'हिन्दी (Hindi)' : 'English'}
              </button>
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-semibold hover:bg-white/10 transition"
              >
                {darkMode ? '🌙 Dark Mode' : '☀️ Light Mode'}
              </button>
            </div>

            <nav className="mt-2 flex gap-1 overflow-x-auto pb-1 xl:hidden">
              {navItems.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`whitespace-nowrap rounded-full border px-3.5 py-2 text-xs font-bold transition ${
                    location.pathname === item.to
                      ? 'border-orange-400/40 bg-orange-500/15 text-orange-400'
                      : 'border-white/10 bg-white/5 text-slate-400 hover:text-white'
                  }`}
                >
                  {language === 'en' ? item.label : item.labelHi}
                </Link>
              ))}
            </nav>
          </header>

          <section className="min-h-0 flex-1 animate-fade-in">{children}</section>
        </main>
      </div>
    </div>
  );
}

function HomePage({ language }) {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    fetch(`${API_BASE}/history`)
      .then(res => res.json())
      .then(data => setHistory(data))
      .catch(err => console.error('Error fetching dashboard history:', err));
  }, []);

  // Compute metrics
  const totalTrips = history.length;
  const totalDistance = history.reduce((sum, item) => sum + (item.distance || 0), 0);
  const totalFare = history.reduce((sum, item) => sum + (item.fare || 0), 0);
  const totalTime = history.reduce((sum, item) => sum + (item.time || 0), 0);

  // Carbon metrics
  const co2Saved = totalDistance * 0.14; // 0.14 kg CO2 saved per km
  const treesEquiv = co2Saved / 22; // 1 tree absorbs 22 kg CO2 per year
  const gasSaved = totalDistance * 0.08; // 0.08 Liters of gasoline per km saved

  // Analyze frequent routes
  const frequentRoutes = useMemo(() => {
    const counts = {};
    history.forEach(item => {
      const key = `${item.start}➔${item.end}`;
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([key, count]) => {
        const [start, end] = key.split('➔');
        return { start, end, count };
      });
  }, [history]);

  // Group trips by day for simple bar chart (last 7 days)
  const chartData = useMemo(() => {
    const dates = {};
    history.forEach(item => {
      const dateStr = new Date(item.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      dates[dateStr] = (dates[dateStr] || 0) + 1;
    });
    return Object.entries(dates).slice(-7); // Last 7 days
  }, [history]);

  const maxTrips = chartData.length > 0 ? Math.max(...chartData.map(d => d[1])) : 1;

  return (
    <div className="space-y-6">
      {/* Welcome header banner */}
      <div className="glass overflow-hidden rounded-[32px] p-6 shadow-glow border border-white/5 bg-slate-950/20 backdrop-blur-xl">
        <h3 className="text-3xl font-black tracking-tight leading-snug">
          Passenger Dashboard
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">
          Welcome back! Here is a summary of your green transit statistics, carbon savings telemetry, and recent journey trends.
        </p>
      </div>

      {/* Basic Metrics Grid */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <MetricCard label="Total Journeys" value={totalTrips} />
        <MetricCard label="Transit Distance" value={`${totalDistance.toFixed(1)} km`} />
        <MetricCard label="Cumulative Spend" value={`₹${totalFare.toFixed(0)}`} />
        <MetricCard label="Transit Time" value={`${totalTime} min`} />
      </div>

      {/* Carbon and Environmental Analytics */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="glass rounded-[32px] p-6 border border-white/5 bg-gradient-to-br from-emerald-950/30 to-slate-950/20 backdrop-blur-xl space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🌱</span>
            <div>
              <h4 className="text-base font-bold text-white">Environmental Footprint Analytics</h4>
              <p className="text-[11px] text-slate-400">Your carbon offsets relative to standard automotive transit.</p>
            </div>
          </div>
          <div className="grid gap-3 grid-cols-3 text-center">
            <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-4">
              <span className="text-xs text-emerald-400 font-bold block mb-1">CO₂ Offset</span>
              <span className="text-lg font-bold text-white">{co2Saved.toFixed(2)} kg</span>
            </div>
            <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-4">
              <span className="text-xs text-emerald-400 font-bold block mb-1">Tree Equiv.</span>
              <span className="text-lg font-bold text-white">{treesEquiv.toFixed(3)} trees/yr</span>
            </div>
            <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-4">
              <span className="text-xs text-emerald-400 font-bold block mb-1">Gasoline Saved</span>
              <span className="text-lg font-bold text-white">{gasSaved.toFixed(1)} L</span>
            </div>
          </div>
        </div>

        {/* Simple Bar Chart */}
        <div className="glass rounded-[32px] p-6 border border-white/5 space-y-4 bg-slate-950/10">
          <div>
            <h4 className="text-base font-bold text-white">Weekly Transit Activity</h4>
            <p className="text-[11px] text-slate-400">Total trips completed per day.</p>
          </div>
          {chartData.length === 0 ? (
            <div className="h-28 flex items-center justify-center text-xs text-slate-500">No recent trip data available to plot.</div>
          ) : (
            <div className="flex items-end justify-between gap-2 h-28 pt-2">
              {chartData.map(([date, count]) => {
                const percentage = (count / maxTrips) * 100;
                return (
                  <div key={date} className="flex-1 flex flex-col items-center gap-2">
                    <div className="w-full bg-white/5 rounded-t-lg relative overflow-hidden" style={{ height: '70px' }}>
                      <div 
                        className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-orange-500 to-amber-300 rounded-t-lg transition-all duration-500"
                        style={{ height: `${percentage}%` }}
                        title={`${count} trips`}
                      />
                    </div>
                    <span className="text-[9px] text-slate-400 font-bold tracking-tight">{date}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Saved / Frequent routes & Quick Actions */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="glass rounded-[32px] p-6 border border-white/5 space-y-4">
          <h4 className="text-sm font-bold text-white">⭐ Saved & Frequent Journeys</h4>
          {frequentRoutes.length === 0 ? (
            <div className="text-xs text-slate-500">Bookmarked and frequent paths will appear here.</div>
          ) : (
            <div className="space-y-2">
              {frequentRoutes.map((route, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/5 text-xs text-slate-300">
                  <div className="font-bold text-white">
                    {route.start} <span className="text-orange-400">➔</span> {route.end}
                  </div>
                  <span className="rounded-full bg-orange-500/10 px-2 py-0.5 text-[9px] font-bold text-orange-400 uppercase tracking-wider">
                    {route.count} travels
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="glass rounded-[32px] p-6 border border-white/5 flex flex-col justify-between">
          <div>
            <h4 className="text-sm font-bold text-white">⚡ Quick Actions</h4>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Launch dynamic pathfinding searches, explore interactive Leaflet network charts, or inspect algorithmic performance.
            </p>
          </div>
          <div className="mt-4 flex gap-2 flex-wrap">
            <Link to="/route" className="rounded-xl bg-orange-500 hover:bg-orange-400 text-slate-950 font-bold px-4 py-2.5 text-xs transition">Route Planner</Link>
            <Link to="/map" className="rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold px-4 py-2.5 text-xs transition">Interactive Map</Link>
          </div>
        </div>
      </div>

      {/* Phase 18 — Weather & Congestion Widget */}
      <WeatherWidget />
    </div>
  );
}

function WeatherWidget() {
  const [data, setData] = useState(null);
  useEffect(() => {
    const load = () => fetch(`${API_BASE}/weather`).then(r => r.json()).then(setData).catch(() => {});
    load();
    const id = setInterval(load, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, []);
  if (!data) return null;
  const congestionColor = { Low: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', Moderate: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20', High: 'text-orange-400 bg-orange-500/10 border-orange-500/20', Peak: 'text-red-400 bg-red-500/10 border-red-500/20' };
  return (
    <div className="glass rounded-[32px] p-6 border border-white/5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{data.weather.icon}</span>
          <div>
            <h4 className="text-base font-bold text-white">Live Transit Conditions</h4>
            <p className="text-xs text-slate-400">{data.weather.label} — Visibility: {data.weather.visibility}</p>
          </div>
        </div>
        <div className="text-right">
          <span className={`rounded-full border px-3 py-1 text-xs font-bold ${congestionColor[data.overallCongestion] || 'text-slate-400 bg-white/5 border-white/10'}`}>
            {data.isPeakHour ? '🔴 Peak Hour' : '🟢 Off-Peak'} · {data.overallCongestion} Congestion
          </span>
        </div>
      </div>
      <p className="text-xs text-slate-300 bg-white/5 px-4 py-2.5 rounded-2xl border border-white/5">
        ℹ️ {data.weather.advisory}
      </p>
      <div className="grid gap-2 grid-cols-2 sm:grid-cols-5">
        {data.lines.map(line => (
          <div key={line.name} className="rounded-2xl bg-white/5 border border-white/5 p-3 text-center space-y-1">
            <span className="text-[10px] font-bold text-slate-400 block">{line.name}</span>
            <span className={`rounded-full border text-[9px] font-bold px-2 py-0.5 ${congestionColor[line.congestion] || 'text-slate-400 bg-white/5 border-white/10'}`}>{line.congestion}</span>
            {line.delayMin > 0 && <span className="block text-[9px] text-orange-400">+{line.delayMin} min delay</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

function StationSearchPage({ language, stations, setToast }) {
  const [query, setQuery] = useState('');
  const [recent, setRecent] = useLocalStorageState('metro-recent-searches', []);
  const [favorites, setFavorites] = useLocalStorageState('metro-favorites', []);

  const handleVoiceSearch = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setToast('Speech Recognition not supported in this browser.');
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    setToast(translations[language].speakNow);
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setQuery(transcript);
      setToast(`Searched for: "${transcript}"`);
    };
    recognition.start();
  };

  const filtered = useMemo(() => {
    if (!query) {
      // Sort favorites to the top, then alphabetically
      return [...stations].sort((a, b) => {
        const favA = favorites.includes(a.id);
        const favB = favorites.includes(b.id);
        if (favA !== favB) return favA ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
    }

    return stations
      .map(s => {
        const nameScore = fuzzyMatch(s.name, query);
        const idScore = fuzzyMatch(s.id, query);
        const lineScore = fuzzyMatch(s.line, query);
        const score = Math.max(nameScore, idScore, lineScore);
        return { ...s, score };
      })
      .filter(s => s.score > 0.35)
      .sort((a, b) => {
        if (Math.abs(a.score - b.score) > 0.01) {
          return b.score - a.score;
        }
        const favA = favorites.includes(a.id);
        const favB = favorites.includes(b.id);
        if (favA !== favB) return favA ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
  }, [query, stations, favorites]);

  const selectSuggested = (name) => {
    setQuery(name);
    if (!recent.includes(name)) {
      setRecent([name, ...recent].slice(0, 5));
    }
  };

  const toggleFavorite = (e, id) => {
    e.stopPropagation();
    if (favorites.includes(id)) {
      setFavorites(favorites.filter(fid => fid !== id));
      setToast('Removed station from favorites.');
    } else {
      setFavorites([...favorites, id]);
      setToast('Added station to favorites! ⭐');
    }
  };

  return (
    <div className="glass rounded-[32px] p-6 border border-white/5 space-y-5">
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-xl font-bold">{translations[language].speakNow}</h3>
        <button
          onClick={handleVoiceSearch}
          className="rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-400 px-4 py-2 text-xs font-bold hover:bg-orange-500/20 transition flex items-center gap-2"
        >
          🎙️ {translations[language].voiceSearch}
        </button>
      </div>

      <div className="relative">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Type station name, ID, or line color..."
          className="w-full rounded-2xl border border-white/10 bg-slate-950/50 px-5 py-4 text-sm outline-none placeholder:text-slate-600 focus:border-orange-500/40 text-white"
        />
        {query && (
          <button onClick={() => setQuery('')} className="absolute right-4 top-4 text-slate-500 hover:text-white">✕</button>
        )}
      </div>

      {recent.length > 0 && (
        <div className="text-xs text-slate-400 flex flex-wrap gap-2 items-center">
          <span>Recent:</span>
          {recent.map(r => (
            <button key={r} onClick={() => setQuery(r)} className="rounded-lg bg-white/5 px-2 py-1 hover:bg-white/10 transition">{r}</button>
          ))}
          <button onClick={() => setRecent([])} className="text-red-400 font-bold ml-2">Clear</button>
        </div>
      )}

      {recent.length === 0 && favorites.length > 0 && !query && (
        <div className="text-xs text-slate-400 flex flex-wrap gap-2 items-center">
          <span>⭐ Favorites:</span>
          {favorites.map(fid => {
            const s = stations.find(st => st.id === fid);
            if (!s) return null;
            return (
              <button key={fid} onClick={() => setQuery(s.name)} className="rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400 px-2.5 py-1 hover:bg-orange-500/20 transition">
                {s.name}
              </button>
            );
          })}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map(station => (
          <button
            key={station.id}
            onClick={() => selectSuggested(station.name)}
            className="rounded-[20px] bg-white/5 p-4 border border-white/5 text-left hover:bg-white/10 hover:border-white/10 transition flex flex-col justify-between h-28 relative group"
          >
            <div className="w-full flex items-start justify-between">
              <div className="font-bold text-white flex flex-col gap-1">
                <span>{station.name}</span>
                {query && station.score < 0.9 && (
                  <span className="text-[9px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-medium w-max">
                    Fuzzy ({(station.score * 100).toFixed(0)}%)
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => toggleFavorite(e, station.id)}
                  className="text-slate-500 hover:text-orange-400 transition hover:scale-125 focus:outline-none p-1 text-sm leading-none"
                >
                  {favorites.includes(station.id) ? '⭐' : '☆'}
                </button>
                <span className="text-xs px-2.5 py-1 rounded-full text-slate-950 font-bold" style={{ backgroundColor: lineColors[station.line] || '#fff' }}>
                  {station.id}
                </span>
              </div>
            </div>
            <div className="mt-2 text-xs text-slate-400 flex items-center justify-between w-full">
              <span>{station.line} Line</span>
              {station.interchange && <span className="text-orange-400 font-black">🔄 Interchange</span>}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function RouteFinderPage({ language, stations, setToast }) {
  const [start, setStart] = useState('A');
  const [end, setEnd] = useState('G');
  const [mode, setMode] = useState('shortest');
  const [isPeakHour, setIsPeakHour] = useState(false);
  const [delay, setDelay] = useState(0);
  const [wheelchair, setWheelchair] = useState(false);
  const [passengerType, setPassengerType] = useState('regular');
  const [travelHour, setTravelHour] = useState(new Date().getHours());

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const fetchRoute = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE}/route`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          start, 
          end, 
          mode, 
          isPeakHour, 
          wheelchair, 
          delay: delay > 0,
          passengerType,
          travelHour
        })
      });
      const data = await response.json();
      if (data.error) {
        setError(data.error);
        setResult(null);
      } else {
        setResult(data);
        // Persist locally as backup
        fetch(`${API_BASE}/history`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            start,
            end,
            mode,
            route: data.route || data.routes?.[0]?.route,
            fare: data.fareBreakdown?.totalFare || data.routes?.[0]?.fareBreakdown?.totalFare,
            distance: data.distance || data.routes?.[0]?.distance,
            time: data.time || data.routes?.[0]?.time
          })
        }).catch(err => console.error('Failed to log route to history:', err));
      }
    } catch (err) {
      setError('Express REST API is offline. Loading offline routing logic...');
      // Static fallback
      import('./lib/routeEngine').then(({ findRoute }) => {
        const fallbackRes = findRoute(start, end, mode);
        if (fallbackRes) {
          setResult({
            ...fallbackRes,
            stats: { algorithmName: 'Client JS fallback', executionTimeMs: 0.1, nodesVisited: 0, memoryUsageBytes: 0 }
          });
        } else {
          setError('Route connection not found.');
        }
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoute();
  }, [start, end, mode, isPeakHour, wheelchair, delay, passengerType, travelHour]);

  const activeResult = useMemo(() => {
    if (!result) return null;
    if (result.routes) {
      // Yen's alternative results
      return result.routes[0];
    }
    return result;
  }, [result]);

  return (
    <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <div className="glass rounded-[32px] p-6 border border-white/5 space-y-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="text-xs uppercase tracking-[0.25em] text-slate-500 font-bold">{translations[language].source}</label>
            <select value={start} onChange={e => setStart(e.target.value)} className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 p-3.5 text-sm text-white">
              {stations.map(s => <option key={s.id} value={s.id}>{s.name} ({s.id})</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.25em] text-slate-500 font-bold">{translations[language].destination}</label>
            <select value={end} onChange={e => setEnd(e.target.value)} className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 p-3.5 text-sm text-white">
              {stations.map(s => <option key={s.id} value={s.id}>{s.name} ({s.id})</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.25em] text-slate-500 font-bold">{translations[language].mode}</label>
            <select value={mode} onChange={e => setMode(e.target.value)} className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 p-3.5 text-sm text-white">
              <option value="shortest">Shortest Distance</option>
              <option value="fastest">Fastest Time</option>
              <option value="cheapest">Cheapest Fare</option>
              <option value="fewest_stops">Fewest Stops (BFS)</option>
              <option value="fewest_transfers">Fewest Transfers (Interchanges)</option>
              <option value="astar">A* Search Heuristic</option>
              <option value="bidirectional_bfs">Bidirectional BFS</option>
              <option value="bidirectional_dijkstra">Bidirectional Dijkstra</option>
              <option value="floyd_warshall">Floyd-Warshall All-Pairs</option>
              <option value="k_shortest">Yen's K-Shortest Paths</option>
              <option value="ranked">Ranked Recommendation</option>
            </select>
          </div>
        </div>

        {/* Simulation & Fare Config */}
        <div className="rounded-[24px] bg-white/5 p-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-xs">
          <label className="flex items-center gap-3 text-slate-300 font-semibold cursor-pointer self-end pb-2.5">
            <input type="checkbox" checked={isPeakHour} onChange={e => setIsPeakHour(e.target.checked)} />
            <span>⏱️ {translations[language].peakHour}</span>
          </label>
          <label className="flex items-center gap-3 text-slate-300 font-semibold cursor-pointer self-end pb-2.5">
            <input type="checkbox" checked={wheelchair} onChange={e => setWheelchair(e.target.checked)} />
            <span>♿ {translations[language].wheelchair}</span>
          </label>
          <div className="flex flex-col gap-1">
            <span className="text-slate-400 font-bold">👤 Passenger Type</span>
            <select value={passengerType} onChange={e => setPassengerType(e.target.value)} className="rounded-xl border border-white/10 bg-slate-950/70 p-2 text-white outline-none">
              <option value="regular">Regular</option>
              <option value="student">Student (25% off)</option>
              <option value="senior">Senior (40% off)</option>
            </select>
          </div>
          <div className="flex flex-col gap-1 font-mono">
            <span className="text-slate-400 font-bold font-sans">⏰ Travel Hour ({travelHour.toString().padStart(2, '0')}:00)</span>
            <select value={travelHour} onChange={e => setTravelHour(Number(e.target.value))} className="rounded-xl border border-white/10 bg-slate-950/70 p-2 text-white outline-none">
              {Array.from({ length: 24 }).map((_, h) => (
                <option key={h} value={h}>{h.toString().padStart(2, '0')}:00 {(h >= 8 && h <= 10) || (h >= 17 && h <= 20) ? '🔥 Peak' : '🍃 Off-Peak'}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1 sm:col-span-2 lg:col-span-4 mt-2">
            <span className="text-slate-400 font-bold">🚧 Delay Sim: {delay} min</span>
            <input type="range" min="0" max="15" value={delay} onChange={e => setDelay(Number(e.target.value))} className="w-full accent-orange-500" />
          </div>
        </div>

        {loading ? (
          <div className="py-10 text-center text-slate-400 flex flex-col items-center gap-4">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
            <p>{translations[language].loading}</p>
          </div>
        ) : error ? (
          <div className="rounded-2xl bg-orange-500/10 border border-orange-500/20 p-4 text-sm text-orange-200">{error}</div>
        ) : activeResult ? (
          <div className="space-y-5">
            {/* Visual metrics card */}
            <div className="rounded-[28px] bg-gradient-to-br from-white/10 to-white/5 p-5 border border-white/5 space-y-4">
              <div className="grid gap-3 sm:grid-cols-4">
                <MetricCard label={translations[language].distance} value={`${activeResult.distance.toFixed(1)} km`} />
                <MetricCard label={translations[language].time} value={`${(activeResult.time + delay).toFixed(0)} min`} />
                <MetricCard label={translations[language].fare} value={`₹${activeResult.fareBreakdown?.totalFare.toFixed(0) || activeResult.fare.toFixed(0)}`} />
                <MetricCard label={translations[language].interchanges} value={activeResult.interchanges} />
              </div>
              <div className="text-xs text-slate-400 flex items-center justify-between border-t border-white/10 pt-3">
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400 font-black">🍃 {translations[language].co2Title}:</span>
                  <span className="text-emerald-300 font-bold">{(activeResult.distance * 0.14).toFixed(2)} kg CO₂ saved</span>
                </div>
                {activeResult.stats && (
                  <div className="text-[10px] text-slate-500 font-mono">
                    {activeResult.stats.algorithmName} | {activeResult.stats.executionTimeMs.toFixed(3)}ms | Visited: {activeResult.stats.nodesVisited}
                  </div>
                )}
              </div>
            </div>

            {/* Intermediate Station list */}
            <div className="rounded-[24px] bg-white/5 p-5 border border-white/5 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-[0.25em] text-slate-400">{translations[language].stations} ({activeResult.stations})</h4>
              <div className="flex flex-wrap gap-2 text-xs">
                {activeResult.route.map((nodeId, idx) => (
                  <div key={nodeId} className="flex items-center gap-2">
                    <span className="rounded-xl bg-white/10 px-3.5 py-2 font-bold text-white border border-white/5 flex items-center gap-1.5">
                      {wheelchair && <span>♿</span>}
                      {nodeId}
                    </span>
                    {idx < activeResult.route.length - 1 && <span className="text-slate-600 font-bold">→</span>}
                  </div>
                ))}
              </div>
            </div>

            {/* Yen's Alternative options lists */}
            {result.routes && result.routes.length > 1 && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-[0.25em] text-slate-400">{translations[language].options}</h4>
                <div className="grid gap-3 sm:grid-cols-2">
                  {result.routes.slice(1).map((alternative, index) => (
                    <div key={index} className="rounded-2xl border border-white/5 bg-slate-950/40 p-4 text-xs space-y-2">
                      <div className="font-bold text-slate-300 flex items-center justify-between">
                        <span>Alternative Route {index + 1}</span>
                        <span className="text-[10px] text-slate-500 font-mono">{alternative.route.length} stops</span>
                      </div>
                      <p className="text-slate-400 overflow-hidden text-ellipsis whitespace-nowrap">{alternative.route.join(' → ')}</p>
                      <div className="flex items-center gap-4 text-slate-400 font-semibold">
                        <span>{alternative.distance} km</span>
                        <span>₹{alternative.fare}</span>
                        <span>{alternative.time} min</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* Ticket Generator column */}
      <div className="space-y-6">
        {activeResult && activeResult.ticket && (
          <div className="glass rounded-[32px] p-6 border-2 border-dashed border-orange-500/20 bg-slate-950/40 flex flex-col items-center text-center space-y-4">
            <div>
              <span className="rounded-full bg-orange-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-orange-400">
                {translations[language].ticketTitle}
              </span>
              <h4 className="mt-2 text-sm font-bold text-slate-500">{activeResult.ticket.ticketId}</h4>
            </div>

            <div className="rounded-2xl bg-white p-3 shadow-glow" dangerouslySetInnerHTML={{ __html: activeResult.ticket.qrCodeSvg }} />

            <p className="text-xs text-slate-400 max-w-xs">{translations[language].ticketScan}</p>

            <div className="w-full border-t border-dashed border-white/10 pt-4 text-left text-xs space-y-2 font-mono">
              <div className="flex justify-between"><span>Transaction ID:</span><span className="text-slate-300">{activeResult.ticket.transactionId}</span></div>
              <div className="flex justify-between"><span>Passenger:</span><span className="text-orange-400 uppercase font-bold">{activeResult.ticket.passengerType}</span></div>
              <div className="flex justify-between"><span>{translations[language].source}:</span><span className="font-bold text-white">{start}</span></div>
              <div className="flex justify-between"><span>{translations[language].destination}:</span><span className="font-bold text-white">{end}</span></div>
              <div className="flex justify-between"><span>{translations[language].baseFare}:</span><span>₹{activeResult.fareBreakdown?.baseFare || 10}</span></div>
              <div className="flex justify-between"><span>{translations[language].distFare}:</span><span>₹{activeResult.fareBreakdown?.distanceFare || 0}</span></div>
              
              {activeResult.fareBreakdown?.peakSurcharge > 0 && (
                <div className="flex justify-between text-orange-400"><span>Peak Surcharge (+25%):</span><span>+₹{activeResult.fareBreakdown.peakSurcharge.toFixed(0)}</span></div>
              )}
              {activeResult.fareBreakdown?.offPeakDiscount > 0 && (
                <div className="flex justify-between text-emerald-400"><span>Off-Peak Discount (-10%):</span><span>-₹{activeResult.fareBreakdown.offPeakDiscount.toFixed(0)}</span></div>
              )}
              {activeResult.fareBreakdown?.passengerDiscount > 0 && (
                <div className="flex justify-between text-yellow-400"><span>Passenger Discount:</span><span>-₹{activeResult.fareBreakdown.passengerDiscount.toFixed(0)}</span></div>
              )}

              <div className="flex justify-between border-t border-white/5 pt-2 text-sm text-orange-400 font-bold">
                <span>Total Fare:</span><span>₹{activeResult.fareBreakdown?.totalFare.toFixed(0) || activeResult.fare.toFixed(0)}</span>
              </div>
            </div>

            <button 
              onClick={() => {
                const printWindow = window.open('', '_blank');
                printWindow.document.write(`
                  <html>
                    <head>
                      <title>Metro Receipt - ${activeResult.ticket.ticketId}</title>
                      <style>
                        body { font-family: monospace; padding: 25px; background: #ffffff; color: #000000; text-align: left; }
                        .receipt { border: 2px dashed #000; padding: 25px; max-width: 320px; margin: auto; }
                        .header { text-align: center; margin-bottom: 20px; }
                        .row { display: flex; justify-content: space-between; margin: 6px 0; font-size: 13px; }
                        .total { border-top: 1px dashed #000; margin-top: 12px; padding-top: 12px; font-weight: bold; font-size: 15px; }
                        .center { text-align: center; font-size: 11px; margin-top: 20px; }
                      </style>
                    </head>
                    <body>
                      <div class="receipt">
                        <div class="header">
                          <h2 style="margin: 0 0 5px 0;">METRO PASS</h2>
                          <h4 style="margin: 0 0 10px 0; color: #555;">${activeResult.ticket.ticketId}</h4>
                          <p style="margin:0; font-size:11px;">TXN: ${activeResult.ticket.transactionId}</p>
                          <p style="margin:0; font-size:11px;">Date: ${new Date(activeResult.ticket.timestamp).toLocaleString()}</p>
                        </div>
                        <div class="row"><span>From Station:</span><span>${start}</span></div>
                        <div class="row"><span>To Station:</span><span>${end}</span></div>
                        <div class="row"><span>Type:</span><span style="text-transform: uppercase;">${activeResult.ticket.passengerType}</span></div>
                        <div class="row"><span>Travel Hour:</span><span>${activeResult.ticket.travelHour.toString().padStart(2, '0')}:00</span></div>
                        <hr style="border: none; border-top: 1px dashed #000; margin: 12px 0;" />
                        <div class="row"><span>Base Fare:</span><span>₹${activeResult.fareBreakdown.baseFare}</span></div>
                        <div class="row"><span>Distance Fare:</span><span>₹${activeResult.fareBreakdown.distanceFare}</span></div>
                        \${activeResult.fareBreakdown.peakSurcharge > 0 ? \`<div class="row" style="color:#e65100;"><span>Peak Hour:</span><span>+₹\${activeResult.fareBreakdown.peakSurcharge.toFixed(0)}</span></div>\` : ''}
                        \${activeResult.fareBreakdown.offPeakDiscount > 0 ? \`<div class="row" style="color:#2e7d32;"><span>Off-Peak Disc:</span><span>-₹\${activeResult.fareBreakdown.offPeakDiscount.toFixed(0)}</span></div>\` : ''}
                        \${activeResult.fareBreakdown.passengerDiscount > 0 ? \`<div class="row" style="color:#2e7d32;"><span>Passenger Disc:</span><span>-₹\${activeResult.fareBreakdown.passengerDiscount.toFixed(0)}</span></div>\` : ''}
                        <div class="row total"><span>TOTAL PAID:</span><span>₹\${activeResult.fareBreakdown.totalFare.toFixed(0)}</span></div>
                        <div class="center">
                          <p style="margin: 0;">Scan QR Code at Smart Gates</p>
                          <p style="margin: 5px 0 0 0; font-weight: bold;">Enjoy your green journey!</p>
                        </div>
                      </div>
                      <script>window.onload = function() { window.print(); }</script>
                    </body>
                  </html>
                `);
                printWindow.document.close();
              }}
              className="w-full rounded-xl bg-orange-500 hover:bg-orange-400 text-slate-950 font-bold py-2.5 text-xs transition duration-150"
            >
              📥 Download PDF Receipt
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function MetricCard({ label, value }) {
  return (
    <div className="rounded-2xl bg-slate-950/70 p-4 border border-white/5 text-center">
      <div className="text-[10px] uppercase tracking-[0.25em] text-slate-500 font-black">{label}</div>
      <div className="mt-2 text-lg font-bold text-white leading-none">{value}</div>
    </div>
  );
}

function InteractiveMapPage({ language, stations, connections }) {
  const [activeRoute, setActiveRoute] = useState([]);
  const [activeRoutePath, setActiveRoutePath] = useState([]);
  const [mode, setMode] = useState('shortest');
  const [wheelchair, setWheelchair] = useState(false);
  const [isPeakHour, setIsPeakHour] = useState(false);
  const [delay, setDelay] = useState(false);
  const [routeInfo, setRouteInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const selectStationForRoute = (stationId) => {
    if (activeRoute.length === 0 || activeRoute.length >= 2) {
      setActiveRoute([stationId]);
    } else {
      if (activeRoute[0] !== stationId) {
        setActiveRoute([...activeRoute, stationId]);
      }
    }
  };

  useEffect(() => {
    if (activeRoute.length === 2) {
      setIsLoading(true);
      fetch(`${API_BASE}/route`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start: activeRoute[0],
          end: activeRoute[1],
          mode,
          wheelchair,
          isPeakHour,
          delay
        })
      })
        .then(res => res.json())
        .then(data => {
          setIsLoading(false);
          if (data.route) {
            setActiveRoutePath(data.route);
            setRouteInfo(data);
          } else if (data.error) {
            setActiveRoutePath([]);
            setRouteInfo({ error: data.error });
          }
        })
        .catch(err => {
          setIsLoading(false);
          setActiveRoutePath([]);
          setRouteInfo({ error: 'Server offline' });
        });
    } else {
      setActiveRoutePath([]);
      setRouteInfo(null);
    }
  }, [activeRoute, mode, wheelchair, isPeakHour, delay]);

  const activeResult = routeInfo && !routeInfo.error ? routeInfo : null;

  return (
    <div className="glass rounded-[32px] p-6 border border-white/5 space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h3 className="text-xl font-bold">Geographic System Visualizer</h3>
          <p className="text-xs text-slate-400">Click any two stations to calculate routes. Configure simulation parameters below.</p>
        </div>
        {activeRoute.length > 0 && (
          <div className="text-xs bg-white/5 px-3 py-2 rounded-xl flex items-center gap-2 border border-white/10">
            <span>Points Selected:</span>
            <span className="font-bold text-orange-400">{activeRoute[0]}</span>
            {activeRoute[1] && <span className="font-bold text-green-400">→ {activeRoute[1]}</span>}
            <button onClick={() => { setActiveRoute([]); setActiveRoutePath([]); setRouteInfo(null); }} className="text-red-400 font-bold ml-2 hover:scale-125 transition">✕ Clear Selection</button>
          </div>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-4 p-4 rounded-2xl bg-slate-950/40 border border-white/5 text-xs">
        <div>
          <span className="text-[10px] font-bold text-slate-500 uppercase">Routing Priority</span>
          <select value={mode} onChange={e => setMode(e.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/70 p-2 text-white outline-none">
            <option value="shortest">Shortest Distance</option>
            <option value="fastest">Fastest Time</option>
            <option value="cheapest">Cheapest Fare</option>
            <option value="fewest_stops">Fewest Stops (BFS)</option>
            <option value="fewest_transfers">Fewest Transfers (Interchanges)</option>
            <option value="astar">A* Heuristic</option>
            <option value="bidirectional_dijkstra">Bidirectional Dijkstra</option>
          </select>
        </div>
        <label className="flex items-center gap-2 font-semibold text-slate-300 cursor-pointer select-none self-end pb-2.5">
          <input type="checkbox" checked={wheelchair} onChange={e => setWheelchair(e.target.checked)} className="accent-orange-500 rounded" />
          <span>♿ Wheelchair Mode</span>
        </label>
        <label className="flex items-center gap-2 font-semibold text-slate-300 cursor-pointer select-none self-end pb-2.5">
          <input type="checkbox" checked={isPeakHour} onChange={e => setIsPeakHour(e.target.checked)} className="accent-orange-500 rounded" />
          <span>⏱️ Peak Hour (Surcharge)</span>
        </label>
        <label className="flex items-center gap-2 font-semibold text-slate-300 cursor-pointer select-none self-end pb-2.5">
          <input type="checkbox" checked={delay} onChange={e => setDelay(e.target.checked)} className="accent-orange-500 rounded" />
          <span>🚧 Active Line Delays</span>
        </label>
      </div>

      <div className="relative h-[480px] w-full overflow-hidden rounded-[24px]">
        {isLoading && (
          <div className="absolute inset-0 z-[1000] flex items-center justify-center bg-slate-950/75 backdrop-blur-sm transition-all duration-300">
            <div className="text-center text-slate-300 flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
              <div className="text-xs font-semibold">Running C++ Traversal...</div>
            </div>
          </div>
        )}
        
        <div className="absolute right-4 top-4 z-[900] bg-slate-900/90 border border-white/10 rounded-2xl p-4 shadow-2xl backdrop-blur-md text-[10px] w-[180px] space-y-2 pointer-events-auto">
          <div className="font-bold text-slate-300 uppercase tracking-wider mb-2 border-b border-white/5 pb-1">System Legend</div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-[#ff7a59]"></span>Red Line</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-[#38bdf8]"></span>Blue Line</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-[#22c55e]"></span>Green Line</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-[#f59e0b]"></span>Yellow Line</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-[#a855f7]"></span>Purple Line</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full border-2 border-white bg-slate-800"></span>Interchange</span>
          </div>
          {wheelchair && (
            <div className="text-[9px] text-emerald-400 font-bold border-t border-white/5 pt-1.5 flex items-center gap-1">
              <span>♿</span> Filtering Wheelchair Access
            </div>
          )}
          {delay && (
            <div className="text-[9px] text-orange-400 font-bold border-t border-white/5 pt-1.5 flex items-center gap-1">
              <span>🚧</span> Delay Penalty Active
            </div>
          )}
        </div>

        {activeResult && (
          <div className="absolute left-4 bottom-4 z-[900] bg-slate-900/90 border border-white/10 rounded-2xl p-4 shadow-2xl backdrop-blur-md text-xs w-[240px] space-y-2 pointer-events-auto">
            <div className="font-bold text-orange-400 uppercase tracking-wider mb-1">Route Computed</div>
            <div className="flex justify-between"><span>Distance:</span><span className="font-bold text-white">{activeResult.distance} km</span></div>
            <div className="flex justify-between"><span>Travel Time:</span><span className="font-bold text-white">{activeResult.time} min</span></div>
            <div className="flex justify-between"><span>Stops count:</span><span className="font-bold text-white">{activeResult.stations} stations</span></div>
            <div className="flex justify-between border-t border-white/5 pt-2 text-sm text-emerald-400 font-bold">
              <span>Total Fare:</span><span>₹{activeResult.fareBreakdown?.totalFare || activeResult.fare}</span>
            </div>
            {activeResult.stats && (
              <div className="text-[9px] text-slate-500 pt-1 text-right">
                via {activeResult.stats.algorithmName} ({activeResult.stats.executionTimeMs?.toFixed(2)}ms)
              </div>
            )}
          </div>
        )}

        {routeInfo?.error && (
          <div className="absolute left-4 bottom-4 z-[900] bg-red-900/90 border border-red-500/20 rounded-2xl p-4 shadow-2xl backdrop-blur-md text-xs w-[240px] text-red-200">
            <div className="font-bold text-red-400 uppercase tracking-wider mb-1">Routing Error</div>
            <div>{routeInfo.error}</div>
          </div>
        )}

        <MetroMap
          stations={stations}
          connections={connections}
          activeRoute={activeRoutePath}
          onSelectStation={selectStationForRoute}
          isAccessibilityMode={wheelchair}
          isDelayMode={delay}
        />
      </div>
    </div>
  );
}

function AlgorithmsPage({ language, stations }) {
  const [activeTab, setActiveTab] = useState('simulator');
  const [start, setStart] = useState('A');
  const [end, setEnd] = useState('G');
  const [comparison, setComparison] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const runComparison = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE}/compare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ start, end })
      });
      const data = await response.json();
      if (data.error) {
        setError(data.error);
        setComparison(null);
      } else {
        setComparison(data.comparison);
      }
    } catch (err) {
      setError('Express API offline. Algorithmic simulator unavailable.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (stations && stations.length > 0) {
      runComparison();
    }
  }, [start, end, stations]);

  const list = [
    { name: 'Dijkstra', desc: 'Finds optimal route by distance, travel time, or fare weights using min-priority queue.', complexity: 'O((V + E) log V)' },
    { name: 'BFS', desc: 'Breadth-First Search traverses level-by-level to calculate route with fewest stops.', complexity: 'O(V + E)' },
    { name: 'DFS', desc: 'Depth-First Search explores deeply to determine node reachability and network connection.', complexity: 'O(V + E)' },
    { name: 'A* Search', desc: 'Incorporate Euclidean coordinate distance heuristics to guide route discovery faster.', complexity: 'O((V + E) log V)' },
    { name: 'Bidirectional BFS', desc: 'Spins up dual-direction search pools simultaneously, meeting in the middle.', complexity: 'O(b^(d/2))' },
    { name: 'Bidirectional Dijkstra', desc: 'Finds shortest path by executing Dijkstra forwards and backwards concurrently.', complexity: 'O((V + E) log V)' },
    { name: 'Floyd Warshall', desc: 'All-Pairs Shortest Path dynamic programming solver with predecessor paths.', complexity: 'O(V^3)' },
    { name: 'Yen\'s K-Shortest', desc: 'Finds K loopless alternative shortest paths by virtual node/edge blocking.', complexity: 'O(K·V(E + V log V))' },
  ];

  const fastestVal = comparison ? Math.min(...comparison.map(c => c.stats.executionTimeMs)) : 0;
  const leastNodesVal = comparison ? Math.min(...comparison.map(c => c.stats.nodesVisited)) : 0;
  const leastMemoryVal = comparison ? Math.min(...comparison.map(c => c.stats.memoryUsageBytes)) : 0;

  return (
    <div className="glass rounded-[32px] p-6 border border-white/5 space-y-6">
      <div className="flex items-center justify-between border-b border-white/10 pb-4 flex-wrap gap-4">
        <div>
          <h3 className="text-xl font-bold">Algorithmic Performance Hub</h3>
          <p className="text-xs text-slate-400">Live benchmark analysis comparing search heuristics and complexities.</p>
        </div>
        <div className="flex gap-1.5 bg-slate-950/60 p-1 rounded-xl border border-white/5 text-xs font-semibold">
          <button 
            onClick={() => setActiveTab('simulator')} 
            className={`px-3 py-1.5 rounded-lg transition ${activeTab === 'simulator' ? 'bg-orange-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
          >
            📊 Live Benchmark
          </button>
          <button 
            onClick={() => setActiveTab('library')} 
            className={`px-3 py-1.5 rounded-lg transition ${activeTab === 'library' ? 'bg-orange-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
          >
            📚 Reference Library
          </button>
        </div>
      </div>

      {activeTab === 'library' ? (
        <div className="grid gap-4 md:grid-cols-2">
          {list.map(algo => (
            <div key={algo.name} className="rounded-2xl bg-white/5 p-5 border border-white/5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-4">
                  <span className="font-bold text-white text-base">{algo.name}</span>
                  <span className="rounded-full bg-orange-500/10 text-orange-400 px-2.5 py-1 text-[10px] font-bold font-mono">{algo.complexity}</span>
                </div>
                <p className="mt-3 text-xs leading-relaxed text-slate-400">{algo.desc}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 bg-white/5 p-4 rounded-[24px]">
            <div>
              <label className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Benchmark Start</label>
              <select value={start} onChange={e => setStart(e.target.value)} className="mt-1.5 w-full rounded-xl border border-white/10 bg-slate-950/70 p-2 text-xs text-white outline-none">
                {stations.map(s => <option key={s.id} value={s.id}>{s.name} ({s.id})</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Benchmark End</label>
              <select value={end} onChange={e => setEnd(e.target.value)} className="mt-1.5 w-full rounded-xl border border-white/10 bg-slate-950/70 p-2 text-xs text-white outline-none">
                {stations.map(s => <option key={s.id} value={s.id}>{s.name} ({s.id})</option>)}
              </select>
            </div>
          </div>

          {error && <div className="text-xs text-orange-200 bg-orange-500/10 border border-orange-500/20 p-3 rounded-xl">{error}</div>}

          {loading ? (
            <div className="py-12 text-center text-slate-500 text-xs">Simulating C++ route benchmarks...</div>
          ) : comparison ? (
            <div className="space-y-6">
              <div className="overflow-x-auto rounded-2xl border border-white/5 bg-slate-950/40">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/5 text-slate-400 font-bold">
                      <th className="p-3">Algorithm</th>
                      <th className="p-3 text-right">Time (ms)</th>
                      <th className="p-3 text-right">Nodes Visited</th>
                      <th className="p-3 text-right">RAM (Bytes)</th>
                      <th className="p-3 text-right">Distance (km)</th>
                      <th className="p-3 text-right">Interchanges</th>
                      <th className="p-3">Path Output</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparison.map((c, i) => {
                      const isFastest = c.stats.executionTimeMs === fastestVal && fastestVal > 0;
                      const isLeastNodes = c.stats.nodesVisited === leastNodesVal;
                      const isLeastMemory = c.stats.memoryUsageBytes === leastMemoryVal;
                      
                      return (
                        <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition">
                          <td className="p-3 font-bold text-white flex items-center gap-1.5">
                            {c.stats.algorithmName}
                            {isFastest && <span className="text-[9px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded font-bold">⚡ Fast</span>}
                          </td>
                          <td className={`p-3 text-right font-mono ${isFastest ? 'text-emerald-400 font-bold' : ''}`}>{c.stats.executionTimeMs.toFixed(3)} ms</td>
                          <td className={`p-3 text-right font-mono ${isLeastNodes ? 'text-orange-400 font-bold' : ''}`}>{c.stats.nodesVisited} nodes</td>
                          <td className={`p-3 text-right font-mono ${isLeastMemory ? 'text-yellow-400 font-bold' : ''}`}>{c.stats.memoryUsageBytes} B</td>
                          <td className="p-3 text-right font-mono">{c.distance} km</td>
                          <td className="p-3 text-right font-mono">{c.interchanges}</td>
                          <td className="p-3 font-mono text-[10px] text-slate-400 truncate max-w-[200px]" title={c.route.join(' ➔ ')}>
                            {c.route.join('➔')}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="glass rounded-[24px] p-5 border border-white/5 space-y-3 bg-slate-950/10">
                  <h4 className="text-xs font-bold text-slate-300">Complexity Search Depth (Nodes Visited)</h4>
                  <div className="space-y-2">
                    {comparison.map((c, i) => {
                      const maxNodes = Math.max(...comparison.map(comp => comp.stats.nodesVisited)) || 1;
                      const ratio = (c.stats.nodesVisited / maxNodes) * 100;
                      return (
                        <div key={i} className="space-y-1">
                          <div className="flex justify-between text-[10px] font-mono text-slate-400">
                            <span>{c.stats.algorithmName}</span>
                            <span className="font-bold text-slate-200">{c.stats.nodesVisited} nodes</span>
                          </div>
                          <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                            <div className="bg-gradient-to-r from-orange-500 to-amber-300 h-full rounded-full transition-all duration-500" style={{ width: `${ratio}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="glass rounded-[24px] p-5 border border-white/5 space-y-3 bg-slate-950/10">
                  <h4 className="text-xs font-bold text-slate-300">Heap Allocation Footprint (Bytes)</h4>
                  <div className="space-y-2">
                    {comparison.map((c, i) => {
                      const maxMem = Math.max(...comparison.map(comp => comp.stats.memoryUsageBytes)) || 1;
                      const ratio = (c.stats.memoryUsageBytes / maxMem) * 100;
                      return (
                        <div key={i} className="space-y-1">
                          <div className="flex justify-between text-[10px] font-mono text-slate-400">
                            <span>{c.stats.algorithmName}</span>
                            <span className="font-bold text-slate-200">{c.stats.memoryUsageBytes} Bytes</span>
                          </div>
                          <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                            <div className="bg-gradient-to-r from-yellow-500 to-amber-400 h-full rounded-full transition-all duration-500" style={{ width: `${ratio}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-500 py-10 text-center">No comparison data available.</div>
          )}
        </div>
      )}
    </div>
  );
}

function NetworkAnalyticsPage({ language }) {
  const [stats, setStats] = useState(null);
  const [mst, setMst] = useState(null);
  const [cycles, setCycles] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`${API_BASE}/stats`)
      .then(res => res.json())
      .then(data => setStats(data))
      .catch(err => {
        setError('Express API offline. Analytics dashboard unavailable.');
        console.error(err);
      });

    fetch(`${API_BASE}/stats/mst`)
      .then(res => res.json())
      .then(data => setMst(data))
      .catch(err => console.error('Failed to load MST:', err));

    fetch(`${API_BASE}/stats/cycles`)
      .then(res => res.json())
      .then(data => setCycles(data))
      .catch(err => console.error('Failed to load cycles:', err));
  }, []);

  if (error) {
    return <div className="glass rounded-[32px] p-6 border border-white/5 text-orange-200 text-sm">{error}</div>;
  }

  if (!stats) {
    return <div className="py-20 text-center text-slate-400">Loading live analytics...</div>;
  }

  return (
    <div className="glass rounded-[32px] p-6 border border-white/5 space-y-6">
      <div>
        <h3 className="text-xl font-bold">Network Graph Analytics</h3>
        <p className="text-xs text-slate-400">Calculated dynamically by Floyd-Warshall and degree counters in C++.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard label="Total Stations" value={stats.totalStations} />
        <MetricCard label="Total Tracks" value={stats.totalConnections} />
        <MetricCard label="Total Lines" value={stats.totalLines} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3 text-xs">
        <div className="rounded-2xl bg-white/5 p-4 border border-white/5">
          <span className="text-slate-500 uppercase tracking-wider font-bold">Connected Components</span>
          <div className="mt-2 text-xl font-bold text-white">{stats.connectedComponents}</div>
        </div>
        <div className="rounded-2xl bg-white/5 p-4 border border-white/5">
          <span className="text-slate-500 uppercase tracking-wider font-bold">Average Degree</span>
          <div className="mt-2 text-xl font-bold text-white">{stats.averageDegree.toFixed(2)}</div>
        </div>
        <div className="rounded-2xl bg-white/5 p-4 border border-white/5">
          <span className="text-slate-500 uppercase tracking-wider font-bold">Graph Density</span>
          <div className="mt-2 text-xl font-bold text-white">{stats.graphDensity.toFixed(3)}</div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3 text-xs">
        <div className="rounded-2xl bg-white/5 p-4 border border-white/5">
          <span className="text-slate-500 uppercase tracking-wider font-bold">Diameter (Longest Path)</span>
          <div className="mt-2 font-bold text-white text-sm">{stats.longestRoute?.from} ➔ {stats.longestRoute?.to}</div>
          <div className="mt-1 text-slate-400">{stats.longestRoute?.distance} km</div>
        </div>
        <div className="rounded-2xl bg-white/5 p-4 border border-white/5">
          <span className="text-slate-500 uppercase tracking-wider font-bold">Shortest Route Link</span>
          <div className="mt-2 font-bold text-white text-sm">{stats.shortestRoute?.from} ➔ {stats.shortestRoute?.to}</div>
          <div className="mt-1 text-slate-400">{stats.shortestRoute?.distance} km</div>
        </div>
        <div className="rounded-2xl bg-white/5 p-4 border border-white/5">
          <span className="text-slate-500 uppercase tracking-wider font-bold">Most Connected Hub</span>
          <div className="mt-2 font-bold text-white text-sm">Station ID: {stats.mostConnectedStation?.id}</div>
          <div className="mt-1 text-slate-400">{stats.mostConnectedStation?.degree} connections</div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* MST Panel */}
        <div className="rounded-[24px] bg-white/5 p-5 border border-white/5 space-y-4">
          <div>
            <h4 className="text-sm font-bold text-white">🌲 Minimum Spanning Tree (MST)</h4>
            <p className="text-[11px] text-slate-400">Optimal sub-network calculated using Kruskal's Algorithm.</p>
          </div>
          {mst ? (
            <div className="space-y-2">
              <div className="flex justify-between items-center bg-slate-950/40 p-3 rounded-xl border border-white/5 text-xs">
                <span className="text-slate-400">Total MST Distance:</span>
                <span className="font-bold text-emerald-400">{mst.totalDistance} km</span>
              </div>
              <div className="max-h-[180px] overflow-y-auto space-y-1 pr-1 font-mono text-[11px]">
                {mst.edges.map((e, idx) => (
                  <div key={idx} className="flex justify-between p-2 rounded bg-white/5 border border-white/5">
                    <span>{e.from} ➔ {e.to}</span>
                    <span className="text-slate-400">{e.distance} km • {e.line} Line</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-500 py-6 text-center">Loading MST...</div>
          )}
        </div>

        {/* Cycle Detection Panel */}
        <div className="rounded-[24px] bg-white/5 p-5 border border-white/5 space-y-4">
          <div>
            <h4 className="text-sm font-bold text-white">🔄 Redundancy & Cycle Loops</h4>
            <p className="text-[11px] text-slate-400">Identifies closed paths to verify network redundancy.</p>
          </div>
          {cycles ? (
            <div className="space-y-3">
              <div className="flex justify-between items-center bg-slate-950/40 p-3 rounded-xl border border-white/5 text-xs">
                <span className="text-slate-400">Contains Cycle Loops:</span>
                <span className={`font-bold uppercase ${cycles.hasCycle ? 'text-orange-400' : 'text-slate-400'}`}>
                  {cycles.hasCycle ? '⚠️ Yes' : 'No'}
                </span>
              </div>
              {cycles.hasCycle && cycles.cyclePath && (
                <div className="bg-orange-500/5 border border-orange-500/10 p-3.5 rounded-xl text-xs space-y-2">
                  <div className="text-slate-300 font-semibold">Detected Cycle Path:</div>
                  <div className="font-mono text-orange-400 font-bold tracking-wider">
                    {cycles.cyclePath.join(' ➔ ')}
                  </div>
                  <div className="text-[10px] text-slate-500 leading-normal">
                    Redundant tracks are useful for backup routing during disruptions or delays.
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-xs text-slate-500 py-6 text-center">Detecting cycles...</div>
          )}
        </div>
      </div>
    </div>
  );
}

function HistoryPage({ language, setToast }) {
  const [history, setHistory] = useState([]);

  const fetchHistory = () => {
    fetch(`${API_BASE}/history`)
      .then(res => res.json())
      .then(data => setHistory(data))
      .catch(err => console.error(err));
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const clearHistory = async () => {
    try {
      await fetch(`${API_BASE}/history`, { method: 'DELETE' });
      setHistory([]);
      setToast('History cleared.');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="glass rounded-[32px] p-6 border border-white/5 space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h3 className="text-xl font-bold">{translations[language].historyTitle}</h3>
        {history.length > 0 && (
          <button onClick={clearHistory} className="text-xs text-red-400 font-bold hover:underline">
            {translations[language].clearHistory}
          </button>
        )}
      </div>

      <div className="space-y-3">
        {history.length === 0 ? (
          <div className="rounded-2xl bg-white/5 p-5 text-sm text-slate-500 text-center">No journey history found.</div>
        ) : (
          history.map(item => (
            <div key={item.id} className="rounded-2xl bg-white/5 p-4 border border-white/5 flex items-center justify-between gap-4 flex-wrap">
              <div className="text-sm">
                <div className="font-bold text-white">{item.start} ➔ {item.end} <span className="text-xs text-slate-500">({item.mode})</span></div>
                <div className="text-xs text-slate-400 mt-1">{item.distance} km • {item.time} min • ₹{item.fare}</div>
              </div>
              <span className="text-[10px] text-slate-500">{new Date(item.timestamp).toLocaleString()}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function AdminPage({ language, stations, connections, refreshData, setToast }) {
  const [token, setToken] = useState(localStorage.getItem('admin_token') || '');
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');

  const [stationForm, setStationForm] = useState({ id: 'I', name: 'India Gate', line: 'Purple', x: 800, y: 220, interchange: false });
  const [connectionForm, setConnectionForm] = useState({ from: 'A', to: 'B', distance: 5, time: 7, fare: 8, line: 'Red' });
  const [backups, setBackups] = useState([]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    try {
      const response = await fetch(`${API_BASE}/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm)
      });
      const data = await response.json();
      if (response.ok && data.token) {
        localStorage.setItem('admin_token', data.token);
        setToken(data.token);
        setToast('Admin logged in successfully.');
      } else {
        setLoginError(data.error || 'Failed to authenticate');
      }
    } catch (err) {
      setLoginError('Authentication server offline.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    setToken('');
    setToast('Logged out of Admin workspace.');
  };

  const fetchBackups = async () => {
    if (!token) return;
    try {
      const response = await fetch(`${API_BASE}/admin/backups`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        if (data.backups) {
          setBackups(data.backups);
        }
      }
    } catch (err) {
      console.error('Failed to load database backups:', err);
    }
  };

  useEffect(() => {
    fetchBackups();
  }, [token]);

  const createBackup = async () => {
    try {
      const response = await fetch(`${API_BASE}/admin/backup`, { 
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        setToast('Database backup created successfully on server.');
        fetchBackups();
      } else {
        setToast('Failed to create backup.');
      }
    } catch (err) {
      setToast('API offline.');
    }
  };

  const restoreBackup = async (timestamp) => {
    try {
      const response = await fetch(`${API_BASE}/admin/restore/${timestamp}`, { 
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        setToast('Database restored successfully from backup.');
        refreshData();
      } else {
        setToast('Failed to restore backup.');
      }
    } catch (err) {
      setToast('API offline.');
    }
  };

  const addStation = async () => {
    try {
      const response = await fetch(`${API_BASE}/admin/stations`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(stationForm)
      });
      if (response.ok) {
        setToast('Station added successfully.');
        refreshData();
      } else {
        const errorData = await response.json();
        setToast(errorData.error);
      }
    } catch (err) {
      setToast('API offline. Local admin mutations blocked.');
    }
  };

  const updateStation = async () => {
    try {
      const response = await fetch(`${API_BASE}/admin/stations/${stationForm.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(stationForm)
      });
      if (response.ok) {
        setToast('Station updated successfully.');
        refreshData();
      } else {
        const errorData = await response.json();
        setToast(errorData.error);
      }
    } catch (err) {
      setToast('API offline.');
    }
  };

  const deleteStation = async (id) => {
    try {
      const response = await fetch(`${API_BASE}/admin/stations/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        setToast('Station deleted.');
        refreshData();
      }
    } catch (err) {
      setToast('API offline.');
    }
  };

  const addConnection = async () => {
    try {
      const response = await fetch(`${API_BASE}/admin/connections`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(connectionForm)
      });
      if (response.ok) {
        setToast('Track connected.');
        refreshData();
      } else {
        const err = await response.json();
        setToast(err.error);
      }
    } catch (err) {
      setToast('API offline.');
    }
  };

  const deleteConnection = async (from, to) => {
    try {
      const response = await fetch(`${API_BASE}/admin/connections`, {
        method: 'DELETE',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ from, to })
      });
      if (response.ok) {
        setToast('Connection deleted.');
        refreshData();
      }
    } catch (err) {
      setToast('API offline.');
    }
  };

  if (!token) {
    return (
      <div className="mx-auto max-w-md glass rounded-[32px] p-8 border border-white/5 bg-slate-950/40 mt-10 space-y-6">
        <div className="text-center">
          <span className="text-3xl">🔐</span>
          <h3 className="mt-3 text-xl font-bold text-white">Admin Authentication</h3>
          <p className="mt-1 text-xs text-slate-400">Please enter credentials to mutate database and manage backups.</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          <InputField label="Username" value={loginForm.username} onChange={val => setLoginForm({ ...loginForm, username: val })} />
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Password</span>
            <input
              type="password"
              value={loginForm.password}
              onChange={e => setLoginForm({ ...loginForm, password: e.target.value })}
              className="w-full rounded-2xl border border-white/10 bg-slate-950/70 p-3 text-xs outline-none text-white focus:border-orange-500/40"
            />
          </div>
          {loginError && <p className="text-xs text-red-400 font-semibold">{loginError}</p>}
          <button type="submit" className="w-full rounded-2xl bg-orange-500 hover:bg-orange-400 text-slate-950 font-bold py-3 text-xs transition duration-150">
            Log In Securely
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between bg-white/5 p-4 rounded-[24px] border border-white/5">
        <div>
          <h3 className="text-base font-bold text-white">Signed in as Admin</h3>
          <p className="text-[10px] text-slate-400">Mutates data directly on the Express disk storage.</p>
        </div>
        <button onClick={handleLogout} className="rounded-xl border border-red-500/20 text-red-400 bg-red-500/10 hover:bg-red-500/20 px-3.5 py-2 text-xs font-bold transition">
          🚪 Sign Out
        </button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="glass rounded-[32px] p-6 border border-white/5 space-y-6">
          <div>
            <h3 className="text-xl font-bold">Admin Panel Dashboard</h3>
            <p className="text-xs text-slate-400">Mutates data directly on the Express disk storage.</p>
          </div>

          {/* Station form */}
          <div className="rounded-2xl bg-white/5 p-4 border border-white/5 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Station Editor</h4>
            <div className="grid gap-3 sm:grid-cols-2">
              <InputField label="ID" value={stationForm.id} onChange={val => setStationForm({ ...stationForm, id: val })} />
              <InputField label="Name" value={stationForm.name} onChange={val => setStationForm({ ...stationForm, name: val })} />
              <InputField label="Line" value={stationForm.line} onChange={val => setStationForm({ ...stationForm, line: val })} />
              <InputField label="X Grid" value={stationForm.x} onChange={val => setStationForm({ ...stationForm, x: Number(val) })} />
              <InputField label="Y Grid" value={stationForm.y} onChange={val => setStationForm({ ...stationForm, y: Number(val) })} />
              <label className="flex items-center gap-3 text-xs text-slate-300 font-bold bg-slate-950/40 px-3.5 py-3.5 rounded-2xl sm:col-span-2 cursor-pointer">
                <input type="checkbox" checked={stationForm.interchange} onChange={e => setStationForm({ ...stationForm, interchange: e.target.checked })} />
                🔄 Interchange Station
              </label>
            </div>
            <div className="flex gap-2 flex-wrap text-xs">
              <button onClick={addStation} className="rounded-xl bg-orange-500 text-slate-950 font-bold px-4 py-2 hover:bg-orange-400 transition">Add Station</button>
              <button onClick={updateStation} className="rounded-xl border border-white/10 bg-white/5 text-white font-bold px-4 py-2 hover:bg-white/10 transition">Update Station</button>
            </div>
          </div>

          {/* Connection form */}
          <div className="rounded-2xl bg-white/5 p-4 border border-white/5 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Track Editor</h4>
            <div className="grid gap-3 sm:grid-cols-2">
              <InputField label="From ID" value={connectionForm.from} onChange={val => setConnectionForm({ ...connectionForm, from: val })} />
              <InputField label="To ID" value={connectionForm.to} onChange={val => setConnectionForm({ ...connectionForm, to: val })} />
              <InputField label="Distance (km)" value={connectionForm.distance} onChange={val => setConnectionForm({ ...connectionForm, distance: Number(val) })} />
              <InputField label="Time (min)" value={connectionForm.time} onChange={val => setConnectionForm({ ...connectionForm, time: Number(val) })} />
              <InputField label="Fare (₹)" value={connectionForm.fare} onChange={val => setConnectionForm({ ...connectionForm, fare: Number(val) })} />
              <InputField label="Line Track" value={connectionForm.line} onChange={val => setConnectionForm({ ...connectionForm, line: val })} />
            </div>
            <button onClick={addConnection} className="rounded-xl bg-orange-500 text-slate-950 font-bold px-4 py-2 hover:bg-orange-400 transition text-xs">Connect Track</button>
          </div>

          {/* Backups card */}
          <div className="rounded-2xl bg-white/5 p-4 border border-white/5 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Backups & Recovery</h4>
              <button onClick={createBackup} className="rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1.5 text-xs transition">
                💾 Create Backup
              </button>
            </div>
            <div className="space-y-2 max-h-[160px] overflow-y-auto">
              {backups.length === 0 ? (
                <div className="text-xs text-slate-500 text-center py-4">No backups found on disk.</div>
              ) : (
                [...backups].reverse().map(ts => (
                  <div key={ts} className="flex items-center justify-between p-2 rounded-xl bg-slate-950/40 border border-white/5 text-xs font-mono">
                    <span className="text-slate-300 text-[10px]">{ts.replace(/T/, ' ').replace(/-/g, '/').slice(0, 19)}</span>
                    <button onClick={() => restoreBackup(ts)} className="rounded bg-orange-500/10 border border-orange-500/20 text-orange-400 hover:bg-orange-500/20 px-2 py-1 font-bold text-[10px] transition">
                      🔄 Restore
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass rounded-[32px] p-6 border border-white/5 space-y-4 max-h-[600px] overflow-y-auto">
            <h3 className="text-lg font-bold">Network List</h3>
            <div className="space-y-3">
              {stations.map(s => (
                <div key={s.id} className="rounded-2xl bg-white/5 p-4 border border-white/5 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-white">{s.name} ({s.id})</div>
                    <div className="text-slate-400 mt-1">{s.line} Line {s.interchange ? '• Interchange' : ''}</div>
                  </div>
                  <button onClick={() => deleteStation(s.id)} className="rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 px-3 py-1 font-bold hover:bg-red-500/20 transition">Delete</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InputField({ label, value, onChange }) {
  return (
    <div>
      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">{label}</span>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full rounded-2xl border border-white/10 bg-slate-950/70 p-3 text-xs outline-none text-white focus:border-orange-500/40"
      />
    </div>
  );
}

function SettingsPage({ language, setToast }) {
  const toggles = [
    { id: 'wheelchair', label: '♿ Wheelchair Accessible Routing', desc: 'Prioritizes elevator and assistance availability.' },
    { id: 'delaySim', label: '🚧 Simulation Tools Enabled', desc: 'Allows injecting virtual delays and schedules.' },
    { id: 'voiceSearch', label: '🎙️ Speech Engine Active', desc: 'Allows hands-free station searching.' },
    { id: 'offlineBackup', label: '💾 Offline database fallbacks', desc: 'Ensures routing functionality is preserved.' }
  ];

  return (
    <div className="glass rounded-[32px] p-6 border border-white/5 space-y-6">
      <div>
        <h3 className="text-xl font-bold">System Preferences</h3>
        <p className="text-xs text-slate-400">Configure global triggers and local storage options.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {toggles.map(t => (
          <div key={t.id} className="rounded-2xl bg-white/5 p-4 border border-white/5 flex items-start justify-between gap-4">
            <div>
              <div className="font-bold text-white text-sm">{t.label}</div>
              <div className="text-xs text-slate-400 mt-1 leading-relaxed">{t.desc}</div>
            </div>
            <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Active</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  const [language, setLanguage] = useLocalStorageState('metro-language', 'en');
  const [toast, setToast] = useState(null);
  
  // Cache live graph data
  const [stations, setStations] = useState(mockStations);
  const [connections, setConnections] = useState(mockConnections);

  const refreshData = () => {
    fetch(`${API_BASE}/graph`)
      .then(res => res.json())
      .then(data => {
        if (data.stations && data.connections) {
          setStations(data.stations);
          setConnections(data.connections);
        }
      })
      .catch(err => {
        console.warn('Backend offline. Loaded static mocks.');
        setStations(mockStations);
        setConnections(mockConnections);
      });
  };

  useEffect(() => {
    refreshData();
  }, []);

  return (
    <AppLayout language={language} setLanguage={setLanguage} toast={toast} setToast={setToast}>
      <Routes>
        <Route path="/" element={<HomePage language={language} />} />
        <Route path="/search" element={<StationSearchPage language={language} stations={stations} setToast={setToast} />} />
        <Route path="/route" element={<RouteFinderPage language={language} stations={stations} setToast={setToast} />} />
        <Route path="/map" element={<InteractiveMapPage language={language} stations={stations} connections={connections} />} />
        <Route path="/algorithms" element={<AlgorithmsPage language={language} stations={stations} />} />
        <Route path="/stats" element={<NetworkAnalyticsPage language={language} />} />
        <Route path="/history" element={<HistoryPage language={language} setToast={setToast} />} />
        <Route path="/admin" element={<AdminPage language={language} stations={stations} connections={connections} refreshData={refreshData} setToast={setToast} />} />
        <Route path="/settings" element={<SettingsPage language={language} setToast={setToast} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppLayout>
  );
}
