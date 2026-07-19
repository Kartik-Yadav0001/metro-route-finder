import { connections, stationMap } from '../data/metroData';

// Cache the graph to avoid rebuilding on every search
let cachedGraph = null;

function buildGraph() {
  if (cachedGraph) return cachedGraph;

  const graph = new Map();

  for (const station of Object.values(stationMap)) {
    graph.set(station.id, []);
  }

  for (const edge of connections) {
    graph.get(edge.from).push({ ...edge, to: edge.to });
    graph.get(edge.to).push({ ...edge, to: edge.from });
  }

  cachedGraph = graph;
  return graph;
}

function getWeight(edge, mode) {
  if (mode === 'fastest') return edge.time;
  if (mode === 'cheapest') return edge.fare;
  return edge.distance;
}

// Priority Queue implementation for O(log V) operations
class PriorityQueue {
  constructor() {
    this.heap = [];
  }

  push(node, priority) {
    this.heap.push({ node, priority });
    this.bubbleUp(this.heap.length - 1);
  }

  pop() {
    if (this.heap.length === 0) return null;
    const min = this.heap[0];
    const end = this.heap.pop();
    if (this.heap.length > 0) {
      this.heap[0] = end;
      this.bubbleDown(0);
    }
    return min;
  }

  isEmpty() {
    return this.heap.length === 0;
  }

  bubbleUp(index) {
    const element = this.heap[index];
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      const parent = this.heap[parentIndex];
      if (element.priority >= parent.priority) break;
      this.heap[index] = parent;
      this.heap[parentIndex] = element;
      index = parentIndex;
    }
  }

  bubbleDown(index) {
    const length = this.heap.length;
    const element = this.heap[index];
    while (true) {
      let leftChildIndex = 2 * index + 1;
      let rightChildIndex = 2 * index + 2;
      let swapIndex = null;

      if (leftChildIndex < length) {
        const leftChild = this.heap[leftChildIndex];
        if (leftChild.priority < element.priority) {
          swapIndex = leftChildIndex;
        }
      }

      if (rightChildIndex < length) {
        const rightChild = this.heap[rightChildIndex];
        if (
          (swapIndex === null && rightChild.priority < element.priority) ||
          (swapIndex !== null && rightChild.priority < this.heap[swapIndex].priority)
        ) {
          swapIndex = rightChildIndex;
        }
      }

      if (swapIndex === null) break;
      this.heap[index] = this.heap[swapIndex];
      this.heap[swapIndex] = element;
      index = swapIndex;
    }
  }
}

export function findRoute(startId, endId, mode = 'shortest') {
  // Input validation and sanitization
  if (!startId || !endId || typeof startId !== 'string' || typeof endId !== 'string') {
    return null;
  }
  
  // Sanitize input - remove any non-alphanumeric characters except hyphens
  const sanitizeId = (id) => id.replace(/[^a-zA-Z0-9-]/g, '').trim();
  const sanitizedStart = sanitizeId(startId);
  const sanitizedEnd = sanitizeId(endId);
  
  if (!sanitizedStart || !sanitizedEnd || sanitizedStart === sanitizedEnd) {
    return null;
  }

  // Validate mode
  const validModes = ['shortest', 'fastest', 'cheapest'];
  if (!validModes.includes(mode)) {
    return null;
  }

  const graph = buildGraph();
  
  // Validate stations exist
  if (!graph.has(sanitizedStart) || !graph.has(sanitizedEnd)) {
    return null;
  }

  const distances = new Map();
  const previous = new Map();
  const visited = new Set();
  const pq = new PriorityQueue();

  for (const key of graph.keys()) {
    distances.set(key, Infinity);
  }
  distances.set(sanitizedStart, 0);
  pq.push(sanitizedStart, 0);

  while (!pq.isEmpty()) {
    const { node: current } = pq.pop();

    if (visited.has(current)) continue;
    visited.add(current);

    if (current === sanitizedEnd) break;

    const neighbors = graph.get(current) || [];
    for (const edge of neighbors) {
      if (visited.has(edge.to)) continue;

      const candidate = distances.get(current) + getWeight(edge, mode);
      if (candidate < distances.get(edge.to)) {
        distances.set(edge.to, candidate);
        previous.set(edge.to, current);
        pq.push(edge.to, candidate);
      }
    }
  }

  if (!previous.has(sanitizedEnd) && sanitizedStart !== sanitizedEnd) {
    return null;
  }

  const route = [];
  let current = sanitizedEnd;
  while (current) {
    route.unshift(current);
    current = previous.get(current);
    if (current === sanitizedStart) {
      route.unshift(sanitizedStart);
      break;
    }
  }

  const legs = [];
  let totalDistance = 0;
  let totalTime = 0;
  let totalFare = 0;

  for (let index = 0; index < route.length - 1; index += 1) {
    const from = route[index];
    const to = route[index + 1];
    const edge = connections.find(
      (item) => (item.from === from && item.to === to) || (item.from === to && item.to === from),
    );

    if (!edge) continue;
    legs.push(edge);
    totalDistance += edge.distance;
    totalTime += edge.time;
    totalFare += edge.fare;
  }

  const interchanges = route.filter((stationId) => stationMap[stationId]?.interchange).length;

  return {
    route,
    stations: route.map((stationId) => stationMap[stationId]),
    legs,
    totalDistance,
    totalTime,
    totalFare,
    stops: Math.max(route.length - 1, 0),
    interchanges,
  };
}

export function getRouteRecommendations(startId, endId) {
  const modes = [
    { key: 'shortest', label: 'Shortest Distance' },
    { key: 'fastest', label: 'Fastest Time' },
    { key: 'cheapest', label: 'Cheapest Fare' },
  ];

  return modes
    .map((mode) => {
      const result = findRoute(startId, endId, mode.key);
      if (!result) return null;

      return {
        ...result,
        mode: mode.key,
        label: mode.label,
      };
    })
    .filter(Boolean);
}

export function getAllStationOptions() {
  return Object.values(stationMap).map((station) => ({ value: station.id, label: `${station.name} (${station.id})` }));
}
