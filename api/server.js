import express from 'express';
import cors from 'cors';
import fs, { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { execFile } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ limit: '10kb', extended: true }));

// Request Logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// In-Memory Rate Limiter (Phase 14 & 17)
const rateLimits = new Map();
const RATE_WINDOW = 60 * 1000;
const RATE_MAX = 120;
app.use((req, res, next) => {
  const ip = req.ip || req.socket.remoteAddress;
  const now = Date.now();
  if (!rateLimits.has(ip)) {
    rateLimits.set(ip, []);
  }
  const history = rateLimits.get(ip).filter(t => now - t < RATE_WINDOW);
  history.push(now);
  rateLimits.set(ip, history);
  if (history.length > RATE_MAX) {
    return res.status(429).json({ error: 'Too many requests. Rate limit exceeded.' });
  }
  next();
});

// Path helper for C++ binary
const getBinaryPath = () => {
  const candidates = [
    join(__dirname, '../backend/build_mingw/MetroRouteFinder.exe'),
    join(__dirname, '../backend/build/MetroRouteFinder.exe'),
    join(__dirname, '../backend/MetroRouteFinder.exe'),
    join(__dirname, '../backend/build_mingw/MetroRouteFinder'),
    join(__dirname, '../backend/build/MetroRouteFinder'),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }
  throw new Error('C++ Backend binary not found. Please compile it first.');
};

// Database paths
const stationsPath = join(__dirname, '../database/stations.json');
const connectionsPath = join(__dirname, '../database/connections.json');
const historyPath = join(__dirname, '../database/history.json');

// Safe Atomic Write helper (Phase 15)
const safeWriteFileSync = (filePath, content) => {
  const tmpPath = `${filePath}.tmp`;
  try {
    writeFileSync(tmpPath, content, 'utf-8');
    fs.renameSync(tmpPath, filePath);
  } catch (error) {
    try {
      if (fs.existsSync(tmpPath)) {
        fs.unlinkSync(tmpPath);
      }
    } catch (_) {}
    throw error;
  }
};

// File Loader helpers
const loadStations = () => {
  try {
    const data = readFileSync(stationsPath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading stations:', error);
    return [];
  }
};

const saveStations = (data) => {
  try {
    safeWriteFileSync(stationsPath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error saving stations:', error);
    throw error;
  }
};

const loadConnections = () => {
  try {
    const data = readFileSync(connectionsPath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading connections:', error);
    return [];
  }
};

const saveConnections = (data) => {
  try {
    safeWriteFileSync(connectionsPath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error saving connections:', error);
    throw error;
  }
};

const loadHistory = () => {
  try {
    const data = readFileSync(historyPath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading history:', error);
    return [];
  }
};

const saveHistory = (data) => {
  try {
    safeWriteFileSync(historyPath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error saving history:', error);
    throw error;
  }
};

// QR Code SVG Generator (Offline / Vector format)
const generateMockQRCodeSVG = (data) => {
  const size = 150;
  const blocks = 21;
  const blockSize = size / blocks;
  let svg = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">`;
  svg += `<rect width="100%" height="100%" fill="#ffffff"/>`;
  const color = "#0f172a";
  const drawBlock = (x, y, w, h) => {
    return `<rect x="${x * blockSize}" y="${y * blockSize}" width="${w * blockSize}" height="${h * blockSize}" fill="${color}"/>`;
  };
  const drawAnchor = (dx, dy) => {
    let anchor = "";
    anchor += drawBlock(dx, dy, 7, 1);
    anchor += drawBlock(dx, dy + 6, 7, 1);
    anchor += drawBlock(dx, dy + 1, 1, 5);
    anchor += drawBlock(dx + 6, dy + 1, 1, 5);
    anchor += drawBlock(dx + 2, dy + 2, 3, 3);
    return anchor;
  };
  svg += drawAnchor(0, 0);
  svg += drawAnchor(blocks - 7, 0);
  svg += drawAnchor(0, blocks - 7);
  let seed = 0;
  for (let i = 0; i < data.length; i++) {
    seed += data.charCodeAt(i);
  }
  const random = () => {
    const x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
  };
  for (let y = 0; y < blocks; y++) {
    for (let x = 0; x < blocks; x++) {
      if (x < 8 && y < 8) continue;
      if (x > blocks - 9 && y < 8) continue;
      if (x < 8 && y > blocks - 9) continue;
      if (random() > 0.5) {
        svg += drawBlock(x, y, 1, 1);
      }
    }
  }
  svg += `</svg>`;
  return svg;
};

// --- API ROUTES ---

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Stations list
app.get('/api/stations', (req, res) => {
  res.json(loadStations());
});

// Connections list
app.get('/api/connections', (req, res) => {
  res.json(loadConnections());
});

// Combined Graph info
app.get('/api/graph', (req, res) => {
  const stations = loadStations();
  const connections = loadConnections();
  const stationMap = Object.fromEntries(stations.map(s => [s.id, s]));
  res.json({ stations, connections, stationMap });
});

// Advanced C++ Route finder
app.post('/api/route', (req, res) => {
  const { 
    start, 
    end, 
    mode = 'shortest', 
    isPeakHour = false, 
    wheelchair = false, 
    delay = false,
    passengerType = 'regular',
    travelHour = new Date().getHours()
  } = req.body;
  
  if (!start || !end) {
    return res.status(400).json({ error: 'Start and end stations are required' });
  }

  // Safety sanitization
  const sanitize = (val) => val.replace(/[^a-zA-Z0-9-]/g, '').trim();
  const cleanStart = sanitize(start);
  const cleanEnd = sanitize(end);

  try {
    const binary = getBinaryPath();
    const args = ['--route', cleanStart, cleanEnd, mode];
    if (wheelchair) {
      args.push('--wheelchair');
    }
    if (delay) {
      args.push('--delay');
    }
    
    execFile(binary, args, { cwd: join(__dirname, '../backend') }, (error, stdout, stderr) => {
      if (error) {
        console.error(`C++ RouteFinder error: ${stderr || error.message}`);
        return res.status(500).json({ error: 'Failed to calculate route via C++ engine' });
      }

      try {
        const data = JSON.parse(stdout);
        if (data.error) {
          return res.status(404).json({ error: data.error });
        }

        // Add peak hour and fare analytics
        const stationsData = loadStations();
        const stationMap = Object.fromEntries(stationsData.map(s => [s.id, s]));

        const enhanceSingleRoute = (routeObj) => {
          if (!routeObj.route || routeObj.route.length === 0) return routeObj;
          
          // Fare calculation
          const dist = routeObj.distance;
          const baseFare = 10;
          const distFare = Math.max(0, dist - 2) * 5;
          let subtotal = baseFare + distFare;
          
          // Peak hour brackets based on travelHour or isPeakHour checkbox
          const hourNum = Number(travelHour);
          const isPeakTime = (hourNum >= 8 && hourNum <= 10) || (hourNum >= 17 && hourNum <= 20) || isPeakHour;
          const peakSurcharge = isPeakTime ? subtotal * 0.25 : 0.0;
          const offPeakDiscount = !isPeakTime ? subtotal * 0.10 : 0.0;
          
          let fareAfterPeak = subtotal + peakSurcharge - offPeakDiscount;
          
          // Passenger Type discounts
          let discountRate = 0.0;
          if (passengerType === 'student') discountRate = 0.25;
          else if (passengerType === 'senior') discountRate = 0.40;
          
          const passengerDiscount = fareAfterPeak * discountRate;
          const totalFare = Math.max(10, fareAfterPeak - passengerDiscount); // minimum fare is ₹10

          // Ticket generation
          const ticketId = `TKT-${Math.floor(100000 + Math.random() * 900000)}`;
          const qrData = `${ticketId}|${start}->${end}|₹${totalFare.toFixed(0)}|${routeObj.time}min`;
          const qrCodeSvg = generateMockQRCodeSVG(qrData);

          routeObj.stationsList = routeObj.route.map(id => stationMap[id] || { id, name: id });
          routeObj.fareBreakdown = {
            baseFare,
            distanceFare: distFare,
            peakSurcharge,
            offPeakDiscount,
            passengerDiscount,
            totalFare
          };
          routeObj.ticket = {
            ticketId,
            qrCodeSvg,
            passengerType,
            travelHour: hourNum,
            timestamp: new Date().toISOString(),
            transactionId: `TXN-${Math.floor(10000000 + Math.random() * 90000000)}`
          };
          return routeObj;
        };

        if (data.routes) {
          data.routes = data.routes.map(enhanceSingleRoute);
        } else {
          enhanceSingleRoute(data);
        }

        res.json(data);
      } catch (parseError) {
        res.status(500).json({ error: 'Invalid response format from C++ engine' });
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Compare algorithms route
app.post('/api/compare', (req, res) => {
  const { start, end } = req.body;
  if (!start || !end) {
    return res.status(400).json({ error: 'Start and end stations are required' });
  }

  try {
    const binary = getBinaryPath();
    execFile(binary, ['--compare', start, end], { cwd: join(__dirname, '../backend') }, (error, stdout, stderr) => {
      if (error) {
        return res.status(500).json({ error: 'Failed to run comparison in C++ engine' });
      }
      try {
        res.json(JSON.parse(stdout));
      } catch (parseError) {
        res.status(500).json({ error: 'Invalid response from comparison engine' });
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Graph Statistics Route
app.get('/api/stats', (req, res) => {
  try {
    const binary = getBinaryPath();
    execFile(binary, ['--stats'], { cwd: join(__dirname, '../backend') }, (error, stdout, stderr) => {
      if (error) {
        return res.status(500).json({ error: 'Failed to run stats in C++ engine' });
      }
      try {
        res.json(JSON.parse(stdout));
      } catch (parseError) {
        res.status(500).json({ error: 'Invalid stats response format' });
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// MST layout route
app.get('/api/stats/mst', (req, res) => {
  try {
    const binary = getBinaryPath();
    execFile(binary, ['--mst'], { cwd: join(__dirname, '../backend') }, (error, stdout, stderr) => {
      if (error) {
        return res.status(500).json({ error: 'Failed to calculate MST in C++ engine' });
      }
      try {
        res.json(JSON.parse(stdout));
      } catch (parseError) {
        res.status(500).json({ error: 'Invalid MST response format' });
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Cycle detection route
app.get('/api/stats/cycles', (req, res) => {
  try {
    const binary = getBinaryPath();
    execFile(binary, ['--cycle'], { cwd: join(__dirname, '../backend') }, (error, stdout, stderr) => {
      if (error) {
        return res.status(500).json({ error: 'Failed to detect cycles in C++ engine' });
      }
      try {
        res.json(JSON.parse(stdout));
      } catch (parseError) {
        res.status(500).json({ error: 'Invalid cycle response format' });
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin validation report route
app.get('/api/admin/validate', (req, res) => {
  try {
    const binary = getBinaryPath();
    execFile(binary, ['--validate'], { cwd: join(__dirname, '../backend') }, (error, stdout, stderr) => {
      if (error) {
        return res.status(500).json({ error: 'Failed to run validate in C++ engine' });
      }
      try {
        res.json(JSON.parse(stdout));
      } catch (parseError) {
        res.status(500).json({ error: 'Invalid validate response format' });
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Journey History Routes (with disk persistence)
app.get('/api/history', (req, res) => {
  res.json(loadHistory());
});

app.post('/api/history', (req, res) => {
  try {
    const { start, end, mode, route, fare, distance, time } = req.body;
    const history = loadHistory();
    const newEntry = {
      id: `HST-${Math.floor(100000 + Math.random() * 900000)}`,
      start,
      end,
      mode,
      route,
      fare,
      distance,
      time,
      timestamp: new Date().toISOString()
    };
    history.unshift(newEntry);
    if (history.length > 50) history.pop();
    saveHistory(history);
    res.json({ success: true, history });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save history' });
  }
});

app.delete('/api/history', (req, res) => {
  try {
    saveHistory([]);
    res.json({ success: true, history: [] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to clear history' });
  }
});

// --- JWT & UTILITY SCHEMAS (PHASE 14) ---
import crypto from 'crypto';

const JWT_SECRET = 'metro-system-secret-key-987654321';

const base64url = (str) => {
  return Buffer.from(str).toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
};

const base64urlDecode = (str) => {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return Buffer.from(base64, 'base64').toString('utf8');
};

const signToken = (payload) => {
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64url(JSON.stringify(payload));
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${header}.${body}`)
    .digest('base64url');
  return `${header}.${body}.${signature}`;
};

const verifyToken = (token) => {
  try {
    const [header, body, signature] = token.split('.');
    if (!header || !body || !signature) return null;
    
    const expectedSig = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(`${header}.${body}`)
      .digest('base64url');
      
    if (signature !== expectedSig) return null;
    return JSON.parse(base64urlDecode(body));
  } catch (e) {
    return null;
  }
};

// Auth middleware
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access denied: authorization token required' });
  }
  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(403).json({ error: 'Access denied: invalid token signature' });
  }
  req.user = decoded;
  next();
};

// Schema Validation Middlewares
const validateStationSchema = (req, res, next) => {
  const { id, name, line, x, y } = req.body;
  if (!id || typeof id !== 'string' || id.trim().length === 0) {
    return res.status(400).json({ error: 'Validation Error: station ID must be a non-empty string' });
  }
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ error: 'Validation Error: station Name must be a non-empty string' });
  }
  if (!line || typeof line !== 'string' || line.trim().length === 0) {
    return res.status(400).json({ error: 'Validation Error: station Line must be a non-empty string' });
  }
  if (x === undefined || typeof x !== 'number' || isNaN(x)) {
    return res.status(400).json({ error: 'Validation Error: station X coordinate must be a valid number' });
  }
  if (y === undefined || typeof y !== 'number' || isNaN(y)) {
    return res.status(400).json({ error: 'Validation Error: station Y coordinate must be a valid number' });
  }
  next();
};

const validateConnectionSchema = (req, res, next) => {
  const { from, to, distance, time, fare, line } = req.body;
  if (!from || typeof from !== 'string' || from.trim().length === 0) {
    return res.status(400).json({ error: 'Validation Error: From ID must be a non-empty string' });
  }
  if (!to || typeof to !== 'string' || to.trim().length === 0) {
    return res.status(400).json({ error: 'Validation Error: To ID must be a non-empty string' });
  }
  if (!line || typeof line !== 'string' || line.trim().length === 0) {
    return res.status(400).json({ error: 'Validation Error: Line attribute must be a non-empty string' });
  }
  if (distance === undefined || typeof distance !== 'number' || distance <= 0) {
    return res.status(400).json({ error: 'Validation Error: Distance must be a positive number' });
  }
  if (time === undefined || typeof time !== 'number' || time <= 0) {
    return res.status(400).json({ error: 'Validation Error: Travel time must be a positive number' });
  }
  if (fare === undefined || typeof fare !== 'number' || fare < 0) {
    return res.status(400).json({ error: 'Validation Error: Fare must be a non-negative number' });
  }
  next();
};

// Admin Login endpoint
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  if (username === 'admin' && password === 'admin123') {
    const token = signToken({ role: 'admin', username });
    res.json({ success: true, token });
  } else {
    res.status(401).json({ error: 'Invalid admin credentials' });
  }
});

// --- ADMIN CONTROLS (PHASE 11 mutations - SECURED) ---

app.post('/api/admin/stations', authMiddleware, validateStationSchema, (req, res) => {
  try {
    const { id, name, line, x, y, interchange } = req.body;
    const stations = loadStations();
    if (stations.some(s => s.id === id)) {
      return res.status(400).json({ error: `Station with ID '${id}' already exists` });
    }

    stations.push({ id, name, line, x: Number(x), y: Number(y), interchange: !!interchange });
    saveStations(stations);
    res.json({ success: true, stations });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add station' });
  }
});

app.put('/api/admin/stations/:id', authMiddleware, (req, res) => {
  try {
    const { id } = req.params;
    const { name, line, x, y, interchange } = req.body;
    const stations = loadStations();
    const index = stations.findIndex(s => s.id === id);

    if (index === -1) {
      return res.status(404).json({ error: 'Station not found' });
    }

    stations[index] = {
      ...stations[index],
      name: name || stations[index].name,
      line: line || stations[index].line,
      x: x !== undefined ? Number(x) : stations[index].x,
      y: y !== undefined ? Number(y) : stations[index].y,
      interchange: interchange !== undefined ? !!interchange : stations[index].interchange
    };

    saveStations(stations);
    res.json({ success: true, stations });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update station' });
  }
});

app.delete('/api/admin/stations/:id', authMiddleware, (req, res) => {
  try {
    const { id } = req.params;
    let stations = loadStations();
    let connections = loadConnections();

    if (!stations.some(s => s.id === id)) {
      return res.status(404).json({ error: 'Station not found' });
    }

    stations = stations.filter(s => s.id !== id);
    connections = connections.filter(c => c.from !== id && c.to !== id);

    saveStations(stations);
    saveConnections(connections);
    res.json({ success: true, stations, connections });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete station' });
  }
});

app.post('/api/admin/connections', authMiddleware, validateConnectionSchema, (req, res) => {
  try {
    const { from, to, distance, time, fare, line } = req.body;
    const stations = loadStations();
    if (!stations.some(s => s.id === from) || !stations.some(s => s.id === to)) {
      return res.status(400).json({ error: 'One or both stations do not exist' });
    }

    const connections = loadConnections();
    if (connections.some(c => (c.from === from && c.to === to) || (c.from === to && c.to === from))) {
      return res.status(400).json({ error: 'Connection already exists' });
    }

    connections.push({
      from,
      to,
      distance: Number(distance),
      time: Number(time),
      fare: Number(fare),
      line
    });

    saveConnections(connections);
    res.json({ success: true, connections });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add connection' });
  }
});

app.delete('/api/admin/connections', authMiddleware, (req, res) => {
  try {
    const { from, to } = req.body;
    if (!from || !to) {
      return res.status(400).json({ error: 'From and to parameters are required' });
    }
    let connections = loadConnections();

    const beforeLength = connections.length;
    connections = connections.filter(
      c => !(c.from === from && c.to === to) && !(c.from === to && c.to === from)
    );

    if (connections.length === beforeLength) {
      return res.status(404).json({ error: 'Connection not found' });
    }

    saveConnections(connections);
    res.json({ success: true, connections });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete connection' });
  }
});

// Disk Backup and Restore Management (Secured)
app.get('/api/admin/backups', authMiddleware, (req, res) => {
  try {
    const backupsDir = join(__dirname, '../database/backups');
    if (!fs.existsSync(backupsDir)) {
      fs.mkdirSync(backupsDir, { recursive: true });
    }
    const files = fs.readdirSync(backupsDir);
    const timestamps = files
      .filter(f => f.startsWith('stations_') && f.endsWith('.json'))
      .map(f => f.replace('stations_', '').replace('.json', ''));
    res.json({ success: true, backups: timestamps });
  } catch (error) {
    res.status(500).json({ error: 'Failed to list backups' });
  }
});

app.post('/api/admin/backup', authMiddleware, (req, res) => {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupsDir = join(__dirname, '../database/backups');
    if (!fs.existsSync(backupsDir)) {
      fs.mkdirSync(backupsDir, { recursive: true });
    }
    
    fs.copyFileSync(join(__dirname, '../database/stations.json'), join(backupsDir, `stations_${timestamp}.json`));
    fs.copyFileSync(join(__dirname, '../database/connections.json'), join(backupsDir, `connections_${timestamp}.json`));
    
    res.json({ success: true, timestamp });
  } catch (error) {
    console.error('Backup creation error:', error);
    res.status(500).json({ error: 'Failed to create backup file on disk', details: error.message });
  }
});

app.post('/api/admin/restore/:timestamp', authMiddleware, (req, res) => {
  try {
    const { timestamp } = req.params;
    const backupsDir = join(__dirname, '../database/backups');
    
    const stationsBackup = join(backupsDir, `stations_${timestamp}.json`);
    const connectionsBackup = join(backupsDir, `connections_${timestamp}.json`);
    
    if (!fs.existsSync(stationsBackup) || !fs.existsSync(connectionsBackup)) {
      return res.status(404).json({ error: 'Backup files not found for the specified timestamp' });
    }
    
    fs.copyFileSync(stationsBackup, join(__dirname, '../database/stations.json'));
    fs.copyFileSync(connectionsBackup, join(__dirname, '../database/connections.json'));
    
    res.json({ success: true, message: 'Database restored successfully from backup' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to restore database backup' });
  }
});

// Phase 18 — Weather & Congestion Widget Endpoint
const WEATHER_CONDITIONS = [
  { icon: '☀️', label: 'Sunny', visibility: 'Excellent', advisory: 'Perfect transit conditions. No delays anticipated.' },
  { icon: '🌤️', label: 'Partly Cloudy', visibility: 'Good', advisory: 'Smooth operations expected.' },
  { icon: '🌧️', label: 'Light Rain', visibility: 'Moderate', advisory: 'Allow 5–10 min extra for station access.' },
  { icon: '⛈️', label: 'Thunderstorm', visibility: 'Poor', advisory: 'Outdoor platforms may experience delays. Use covered interchanges.' },
  { icon: '🌫️', label: 'Foggy', visibility: 'Reduced', advisory: 'Visibility reduced. Expect schedule adjustments.' },
];
const CONGESTION_LEVELS = ['Low', 'Moderate', 'High', 'Peak'];
const LINE_NAMES = ['Red Line', 'Blue Line', 'Green Line', 'Yellow Line', 'Purple Line'];

app.get('/api/weather', (req, res) => {
  const hour = new Date().getHours();
  const isPeak = (hour >= 8 && hour <= 10) || (hour >= 17 && hour <= 20);
  const weatherIndex = Math.floor(Date.now() / 300000) % WEATHER_CONDITIONS.length; // rotates every 5 mins
  const weather = WEATHER_CONDITIONS[weatherIndex];
  const congestionIdx = isPeak ? 3 : Math.floor(Date.now() / 600000) % 3;
  const lines = LINE_NAMES.map(name => ({
    name,
    congestion: CONGESTION_LEVELS[Math.floor(Math.random() * (isPeak ? 4 : 3))],
    delayMin: isPeak ? Math.floor(Math.random() * 6) : Math.floor(Math.random() * 2),
  }));
  res.json({
    weather,
    overallCongestion: CONGESTION_LEVELS[congestionIdx],
    isPeakHour: isPeak,
    lines,
    updatedAt: new Date().toISOString(),
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

app.listen(PORT, () => {
  console.log(`Metro Route Finder API running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});
