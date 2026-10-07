/** Port of src/utils/matching.ts: rank verified apprentices for a job by skill match (70%) and distance (30%). */
export function distanceKm(a, b) {
  const R = 6371;
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

/** apprentices: [{ id, location: {lat, lng}, verified: Set<skillId> }] */
export function rankMatches(job, apprentices) {
  return apprentices
    .map((a) => {
      const matched = job.skillIds.filter((s) => a.verified.has(s));
      const skillScore = job.skillIds.length ? matched.length / job.skillIds.length : 0;
      const distScore = Math.max(0, 1 - distanceKm(job.location, a.location) / 30);
      return { id: a.id, matched: matched.length, score: Math.round((0.7 * skillScore + 0.3 * distScore) * 100) };
    })
    .filter((m) => m.matched > 0)
    .sort((x, y) => y.score - x.score);
}
