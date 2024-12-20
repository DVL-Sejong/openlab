import React from 'react';
import {useNavigate} from 'react-router-dom';
import {useRestaurantDetails} from '@/hooks/useRestaurantDetails';
import ImageNone from '@/assets/img_none.svg';
import '@/styles/RestaurantCard.css';

interface RestaurantCardProps {
  name: string;
  latitude: number;
  longitude: number;
  id: string;
  similarity: number;
}

const RestaurantCard: React.FC<RestaurantCardProps> = ({name, id, latitude, longitude, similarity}) => {
  const navigate = useNavigate();
  const {data, isLoading, error} = useRestaurantDetails(name, latitude, longitude);

  const handleClick = () => {
    navigate(`/restaurant/${id}?name=${name}&lat=${latitude}&lng=${longitude}`);
  };

  return (
    <div className="restaurant-card" onClick={handleClick}>
      <div className="image-container">
        {isLoading && <div>Loading...</div>}
        {error && <div>Error loading details</div>}
        {!isLoading && !error && data?.imageUrl ? (
          <img src={data.imageUrl} alt="Restaurant image"/>
        ) : (
          <div className="img-none-container card-thumbnail">
            <img src={ImageNone} alt="Restaurant image"/>
          </div>
        )}
      </div>
      <h4>{name}</h4>
      {isLoading ?
        (
          <p>Loading...</p>
        ) : (
          <>
            <p><b>Similarity:</b> <span className='highlight'>{Math.floor(similarity*1000)/10}%</span></p> {/* Add this line */}
            <p><b>Address:</b> {data.formatted_address}</p>
            <p><b>Rating:</b> {data.rating?.toFixed(1) ?? 'unknown'}</p>
          </>
        )}
      {/*<p>Category: {category}</p>*/}
    </div>
  );
};

export default RestaurantCard;