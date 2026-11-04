export const paceSecPerKm = (distanceKm: number, durationSec: number) =>
  distanceKm > 0 ? durationSec / distanceKm : 0;

export const formatPace = (secPerKm: number) => {
  const s = Math.round(secPerKm);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

export const formatDuration = (totalSec: number) => {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = Math.round(totalSec % 60);
  const mm = String(m).padStart(2, "0"), ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
};
