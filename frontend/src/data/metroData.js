export const stations = [
  { id: 'A', name: 'Alpha', line: 'Red', x: 120, y: 120, interchange: false },
  { id: 'B', name: 'Bravo', line: 'Red', x: 240, y: 120, interchange: false },
  { id: 'C', name: 'Central', line: 'Red', x: 360, y: 120, interchange: true },
  { id: 'D', name: 'Delta', line: 'Blue', x: 360, y: 240, interchange: false },
  { id: 'E', name: 'Echo', line: 'Blue', x: 480, y: 240, interchange: false },
  { id: 'F', name: 'Foxtrot', line: 'Green', x: 600, y: 240, interchange: true },
  { id: 'G', name: 'Garden', line: 'Green', x: 720, y: 240, interchange: false },
  { id: 'H', name: 'Harbor', line: 'Yellow', x: 720, y: 120, interchange: true },
];

export const connections = [
  { from: 'A', to: 'B', distance: 5, time: 7, fare: 8, line: 'Red' },
  { from: 'B', to: 'C', distance: 4, time: 6, fare: 7, line: 'Red' },
  { from: 'C', to: 'D', distance: 6, time: 8, fare: 9, line: 'Blue' },
  { from: 'D', to: 'E', distance: 4, time: 5, fare: 6, line: 'Blue' },
  { from: 'E', to: 'F', distance: 3, time: 4, fare: 5, line: 'Green' },
  { from: 'F', to: 'G', distance: 2, time: 3, fare: 4, line: 'Green' },
  { from: 'C', to: 'H', distance: 7, time: 9, fare: 10, line: 'Yellow' },
  { from: 'H', to: 'F', distance: 5, time: 6, fare: 7, line: 'Yellow' },
  { from: 'B', to: 'D', distance: 8, time: 10, fare: 11, line: 'Blue' },
];

export const stationMap = Object.fromEntries(stations.map((station) => [station.id, station]));
