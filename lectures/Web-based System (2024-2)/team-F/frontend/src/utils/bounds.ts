const PRECISION = 6;

export interface Bounds {
  south: number;
  west: number;
  north: number;
  east: number;
}

const ceil = (value: number, precision: number) => {
  const multiplier = Math.pow(10, precision || 0);
  return Math.ceil(value * multiplier) / multiplier;
}

const floor = (value: number, precision: number) => {
  const multiplier = Math.pow(10, precision || 0);
  return Math.floor(value * multiplier) / multiplier;
}

export const getFixedBounds = (bounds: google.maps.LatLngBounds | undefined): Bounds|null => {
  if (!bounds)
    return null;

  return {
    south: floor(bounds.getSouthWest().lat(), PRECISION),
    west: ceil(bounds.getSouthWest().lng(), PRECISION),
    north: ceil(bounds.getNorthEast().lat(), PRECISION),
    east: floor(bounds.getNorthEast().lng(), PRECISION),
  };
}