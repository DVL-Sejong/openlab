import React, { useState, useRef, useCallback } from 'react';
import { GoogleMap, LoadScript } from '@react-google-maps/api';
import '@/styles/GoogleMap.css';

interface GoogleMapComponentProps {
  children?: React.ReactNode;
  onSearchAgain: (bounds: google.maps.LatLngBounds | undefined) => void;
}

const containerStyle = {
  width: '100%',
  height: '100%'
};

const initialCenter = {
  lat: 34.0522,
  lng: -118.2437
};

const GoogleMapComponent: React.FC<GoogleMapComponentProps> = ({ children, onSearchAgain }) => {
  const [showButton, setShowButton] = useState(false);
  const mapInstance = useRef<google.maps.Map | null>(null);

  const onLoad = useCallback((map: google.maps.Map) => {
    mapInstance.current = map;

    setTimeout(() => {
      if (mapInstance.current)
        onSearchAgain(mapInstance.current.getBounds());
    }, 700);

    map.addListener('center_changed', () => {
      const center = map.getCenter();
      const isNotHome = window.location.pathname !== '/';

      if (center && isNotHome) {
        setShowButton(true);
      }
    });
  }, []);

  const handleSearchAgain = () => {
    if (mapInstance.current) {
      onSearchAgain(mapInstance.current.getBounds());
    }
    setShowButton(false);
  };

  return (
    <LoadScript googleMapsApiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}>
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={initialCenter}
          onLoad={onLoad}
          zoom={10}
        >
          {children}
        </GoogleMap>
        {showButton && (
          <button className="search-again-button" onClick={handleSearchAgain}>
            Search Here Again
          </button>
        )}
      </div>
    </LoadScript>
  );
};

export default GoogleMapComponent;