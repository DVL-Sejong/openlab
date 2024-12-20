import React from 'react';
import {useNavigate} from 'react-router-dom';
import {InfiniteData} from '@tanstack/react-query';
import {MarkerF} from '@react-google-maps/api';
import {RecommendationResponse} from '@/hooks/useRecommendations';

interface MarkerProps {
  data: InfiniteData<RecommendationResponse> | undefined;
}

const Markers : React.FC<MarkerProps> = ({data}) => {
  const navigate = useNavigate();

  return data && data?.pages.map((page, i) => (
    page.restaurants.map((restaurant) => (
      <MarkerF
        key={restaurant.gmap_id}
        position={{lat: restaurant.latitude, lng: restaurant.longitude}}
        title={restaurant.name}
        onClick={() => navigate(`/restaurant/${restaurant.gmap_id}?name=${restaurant.name}&lat=${restaurant.latitude}&lng=${restaurant.longitude}`)}
      />
    ))
  ))
}

export default Markers;