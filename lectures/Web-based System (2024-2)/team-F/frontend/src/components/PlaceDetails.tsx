import React, { useState, useEffect } from 'react';
import { LoadScript, useJsApiLoader } from '@react-google-maps/api';

const PlaceDetails: React.FC<{ placeId: string }> = ({ placeId }) => {
  const [placeDetails, setPlaceDetails] = useState<google.maps.places.PlaceResult | null>(null);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: ['places'],
  });

  useEffect(() => {
    if (isLoaded && placeId) {
      const service = new google.maps.places.PlacesService(document.createElement('div'));
      service.getDetails({ placeId }, (place, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK) {
          setPlaceDetails(place);
        } else {
          console.error('Place details request failed:', status);
        }
      });
    }
  }, [isLoaded, placeId]);

  if (!isLoaded) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      {placeDetails ? (
        <div>
          <h2>{placeDetails.name}</h2>
          <p>{placeDetails.formatted_address}</p>
          <p>{placeDetails.formatted_phone_number}</p>
          <p>{placeDetails.website}</p>
        </div>
      ) : (
        <div>Loading place details...</div>
      )}
    </div>
  );
};

export default PlaceDetails;