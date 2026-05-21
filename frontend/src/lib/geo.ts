// Calculate distance between two lat/lng points in miles
export function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3958.8; // Radius of the Earth in miles
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); 
  const d = R * c; 
  return d;
}

// Distance from point to line segment
export function distanceToSegment(pLat: number, pLon: number, vLat: number, vLon: number, wLat: number, wLon: number): number {
  const l2 = haversineDistance(vLat, vLon, wLat, wLon) ** 2;
  if (l2 === 0) return haversineDistance(pLat, pLon, vLat, vLon);
  
  // Approximate projection for small distances
  let t = ((pLat - vLat) * (wLat - vLat) + (pLon - vLon) * (wLon - vLon)) / 
          ((wLat - vLat)**2 + (wLon - vLon)**2);
  
  t = Math.max(0, Math.min(1, t));
  const projLat = vLat + t * (wLat - vLat);
  const projLon = vLon + t * (wLon - vLon);
  
  return haversineDistance(pLat, pLon, projLat, projLon);
}

// Check distance against entire route polyline (array of [lng, lat])
export function minDistanceToRoute(lat: number, lon: number, route: number[][]): number {
  if (!route || route.length === 0) return Infinity;
  if (route.length === 1) return haversineDistance(lat, lon, route[0][1], route[0][0]);
  
  let minDist = Infinity;
  for (let i = 0; i < route.length - 1; i++) {
    const d = distanceToSegment(lat, lon, route[i][1], route[i][0], route[i+1][1], route[i+1][0]);
    if (d < minDist) minDist = d;
  }
  return minDist;
}
