import { useQuery } from '@tanstack/react-query';

const fetchRestaurantDetails = async (name: string, latitude: number, longitude: number) => {
  const response = await fetch('/api/place', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      place_name: name,
      location: { lat: latitude, lng: longitude }
    }),
  });
  const data = await response.json();
  let imageUrl = null;
  if (data.photos && data.photos.length > 0) {
    const photoReference = data.photos[0].photo_reference;
    imageUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photoReference}&key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}`;
  }
  return { ...data, imageUrl };
};

export const useRestaurantDetails = (name: string, latitude: number, longitude: number) => {
  return useQuery({
    queryKey: ['restaurantDetails', name, latitude, longitude],
    queryFn: () => fetchRestaurantDetails(name, latitude, longitude),
    staleTime: Infinity, // Disable automatic refresh
  });
};