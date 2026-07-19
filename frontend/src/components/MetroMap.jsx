import React, { useEffect, useRef } from 'react';

const lineColors = {
  Red: '#ff7a59',
  Blue: '#38bdf8',
  Green: '#22c55e',
  Yellow: '#f59e0b',
  Purple: '#a855f7',
};

export default function MetroMap({ stations = [], connections = [], activeRoute = [], onSelectStation, isAccessibilityMode = false, isDelayMode = false }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const layersGroup = useRef(null);
  const trainMarker = useRef(null);
  const animationInterval = useRef(null);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    // Initialize Leaflet map with flat coordinate system (Simple CRS)
    // We map SVG coordinates directly to flat plane
    const map = window.L.map(mapRef.current, {
      crs: window.L.CRS.Simple,
      minZoom: -2,
      maxZoom: 2,
      zoomDelta: 0.5,
      zoomSnap: 0.5,
      zoomControl: true,
      attributionControl: false
    });

    // Fit view to a safe bounding box encompassing our coordinates (X: ~100 to ~850, Y: ~100 to ~350)
    // Note: Leaflet coordinates are [y, x]
    map.setView([200, 450], -0.5);

    mapInstance.current = map;
    layersGroup.current = window.L.layerGroup().addTo(map);

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  // Update map contents when stations, connections, or activeRoute changes
  useEffect(() => {
    const map = mapInstance.current;
    const layers = layersGroup.current;
    if (!map || !layers) return;

    // Clear previous drawings
    layers.clearLayers();
    if (animationInterval.current) {
      clearInterval(animationInterval.current);
    }
    if (trainMarker.current) {
      trainMarker.current.remove();
      trainMarker.current = null;
    }

    const stationMap = Object.fromEntries(stations.map(s => [s.id, s]));

    // 1. Draw connections (Tracks)
    connections.forEach(edge => {
      const from = stationMap[edge.from];
      const to = stationMap[edge.to];
      if (!from || !to) return;

      const isHighlighted = activeRoute.length > 0 && 
        activeRoute.includes(edge.from) && 
        activeRoute.includes(edge.to) &&
        Math.abs(activeRoute.indexOf(edge.from) - activeRoute.indexOf(edge.to)) === 1;

      const isDelayed = isDelayMode && (edge.status === 'Delayed' || edge.delayMin > 0);
      const color = isDelayed ? '#ef4444' : (lineColors[edge.line] || '#cbd5e1');
      const dashArray = isDelayed ? '5, 5' : (isHighlighted ? '8, 8' : null);

      // Draw shadow/glow for active tracks
      if (isHighlighted) {
        window.L.polyline(
          [[from.y, from.x], [to.y, to.x]],
          { color: isDelayed ? '#f87171' : '#ffffff', weight: 12, opacity: 0.3 }
        ).addTo(layers);
      }

      const trackLine = window.L.polyline(
        [[from.y, from.x], [to.y, to.x]],
        {
          color: color,
          weight: isHighlighted ? 6 : (isDelayed ? 5 : 4),
          opacity: isHighlighted ? 1.0 : (isAccessibilityMode ? 0.15 : 0.4),
          dashArray: dashArray
        }
      ).addTo(layers);

      trackLine.bindTooltip(
        `<div class="text-[10px] bg-slate-900 text-white p-1 rounded font-bold">
          ${from.name} ⟷ ${to.name}<br/>
          Line: ${edge.line}<br/>
          Distance: ${edge.distance} km | Time: ${edge.time} min
          ${isDelayed ? '<br/><span class="text-red-400 font-extrabold">⚠️ Delay: ' + edge.delayMin + ' min</span>' : ''}
         </div>`,
        { sticky: true, className: 'rounded border border-slate-700 bg-slate-900 text-white p-1' }
      );
    });

    // 2. Draw stations (Markers)
    stations.forEach(station => {
      const isRouteStation = activeRoute.includes(station.id);
      const isSource = activeRoute.length > 0 && activeRoute[0] === station.id;
      const isDest = activeRoute.length > 0 && activeRoute[activeRoute.length - 1] === station.id;

      const isAccessible = !isAccessibilityMode || station.wheelchair;

      let radius = station.interchange ? 10 : 7;
      let color = lineColors[station.line] || '#94a3b8';
      let fillOpacity = isAccessible ? 0.85 : 0.15;
      let borderOpacity = isAccessible ? 1.0 : 0.15;

      if (isSource) {
        color = '#f97316'; // orange glow for source
        radius = 12;
      } else if (isDest) {
        color = '#22c55e'; // green glow for dest
        radius = 12;
      } else if (isRouteStation) {
        radius = station.interchange ? 11 : 9;
        fillOpacity = 1.0;
      }

      const circle = window.L.circleMarker([station.y, station.x], {
        radius: radius,
        fillColor: station.interchange ? '#ffffff' : color,
        color: isRouteStation ? '#ffffff' : color,
        weight: isRouteStation ? 3 : 1.5,
        fillOpacity: fillOpacity,
        opacity: borderOpacity
      }).addTo(layers);

      // Tooltip showing station details
      circle.bindTooltip(
        `<div class="text-xs font-bold text-slate-900 flex items-center gap-1.5">
           <span>${station.name} (${station.id})</span>
           ${station.wheelchair ? '<span class="text-emerald-600 font-bold" title="Wheelchair accessible">♿</span>' : ''}
         </div>
         <div class="text-[10px] text-slate-500">${station.line} Line ${station.interchange ? '• Interchange' : ''}</div>
         ${isAccessibilityMode && !station.wheelchair ? '<div class="text-[9px] text-red-500 font-extrabold mt-1">⚠️ No Wheelchair Access</div>' : ''}`,
        { permanent: false, direction: 'top', className: 'rounded-xl border border-slate-200 bg-white p-2 shadow-lg' }
      );

      // Clicks select station
      circle.on('click', () => {
        if (onSelectStation) {
          onSelectStation(station.id);
        }
      });
    });

    // 3. Journey Animation (Metro Train moving along the route)
    if (activeRoute.length > 1) {
      const routeCoords = activeRoute
        .map(id => stationMap[id])
        .filter(Boolean)
        .map(s => [s.y, s.x]);

      if (routeCoords.length > 1) {
        // Create custom train icon
        const trainIcon = window.L.divIcon({
          className: 'train-pulsing-icon',
          html: `<div class="relative flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.8)] animate-pulse">
                   <span class="text-[10px]">🚇</span>
                 </div>`,
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        });

        // Add train marker at start node
        const train = window.L.marker(routeCoords[0], { icon: trainIcon }).addTo(layers);
        trainMarker.current = train;

        let currentSegment = 0;
        let progress = 0; // 0 to 1 along the current segment

        animationInterval.current = setInterval(() => {
          if (currentSegment >= routeCoords.length - 1) {
            // Restart journey from source after delay
            currentSegment = 0;
            progress = 0;
          }

          const startPt = routeCoords[currentSegment];
          const endPt = routeCoords[currentSegment + 1];

          // Interpolate coordinates
          const nextLat = startPt[0] + (endPt[0] - startPt[0]) * progress;
          const nextLng = startPt[1] + (endPt[1] - startPt[1]) * progress;

          train.setLatLng([nextLat, nextLng]);

          progress += 0.05; // speed step
          if (progress >= 1.0) {
            progress = 0;
            currentSegment++;
          }
        }, 80); // interval step in ms
      }
    }

    return () => {
      if (animationInterval.current) {
        clearInterval(animationInterval.current);
      }
    };
  }, [stations, connections, activeRoute, onSelectStation, isAccessibilityMode, isDelayMode]);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-3xl bg-slate-950/60 p-1 border border-white/5 shadow-inner">
      <div ref={mapRef} className="h-full w-full bg-slate-950/20" style={{ minHeight: '400px' }} />
    </div>
  );
}
