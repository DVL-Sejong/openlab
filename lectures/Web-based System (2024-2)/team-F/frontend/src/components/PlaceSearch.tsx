import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const PlaceSearch: React.FC = () => {
  const [query, setQuery] = useState('');
  const [placeId, setPlaceId] = useState<string | null>(null);
  const navigate = useNavigate();

const handleSearch = async () => {
  try {
    const response = await fetch('/api/place', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        place_name: query,
        location: { lat: 37.7749, lng: -122.4194 }, // Example location
      }),
    });
    const data = await response.json();
    if (response.ok) {
      setPlaceId(data.place_id);
    } else {
      console.error('Error:', data.error);
    }
  } catch (error) {
    console.error('Error fetching place details:', error);
  }
};

  return (
    <div className="modal">
      <div className="modal-header">
        <button className="back-button" onClick={() => navigate('/')}>Back</button>
      </div>

      <div className="modal-body">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Enter place name or address"
        />
        <button onClick={handleSearch}>Search</button>
        {placeId && <p>Place ID: {placeId}</p>}
      </div>
    </div>
  );
};

export default PlaceSearch;