import React, {useEffect, useState} from 'react';
import {useParams, useNavigate} from 'react-router-dom';
import Comment from '@/components/Comment';
import ImageNone from '@/assets/img_none.svg';
import '@/styles/RestaurantDetail.css';

interface RestaurantDetailProps {
  place_id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  category: string;
  avg_rating: number;
  business_status: string;
  formatted_phone_number: string;
  price_level: number;
  user_ratings_total: number;
  url: string;
  reviews: { author_name: string; text: string; rating: number }[];
  photos: { height: number; width: number; photo_reference: string }[];
}

const RestaurantDetail: React.FC = () => {
  const {id} = useParams<{ id: string }>();
  const [restaurant, setRestaurant] = useState<RestaurantDetailProps | null>(null);
  const navigate = useNavigate();
  const params = new URLSearchParams(window.location.search);
  const name = params.get('name');
  const lat = parseFloat(params.get('lat') ?? '0');
  const lng = parseFloat(params.get('lng') ?? '0');

  useEffect(() => {
    const fetchRestaurantDetails = async () => {
      try {
        const response = await fetch('/api/place', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            place_name: name,
            location: {lat, lng}
          }),
        });
        const data = await response.json();
        setRestaurant({
          place_id: id ?? '',
          name: data.name || '',
          address: data.formatted_address || '',
          latitude: data.geometry?.location?.lat || 0,
          longitude: data.geometry?.location?.lng || 0,
          category: data.types?.[0] || '',
          avg_rating: data.rating || 0,
          business_status: data.business_status || '',
          formatted_phone_number: data.formatted_phone_number || '',
          price_level: data.price_level || 0,
          user_ratings_total: data.user_ratings_total || 0,
          url: data.url || '',
          reviews: data.reviews || [],
          photos: data.photos || [],
        });
      } catch (error) {
        console.error('Error fetching restaurant details:', error);
      }
    };

    fetchRestaurantDetails();
  }, [id]);

  return (
    <div className="modal">
      <div className="modal-header">
        <button className="back-button" onClick={() => navigate(-1)}>Back</button>
      </div>

      {restaurant && restaurant.photos.length > 0 ? (
        <img
          className="header-image" key={restaurant.photos[0].photo_reference}
          src={`https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${restaurant.photos[0].photo_reference}&key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}`}
          alt="Restaurant"
        />
      ) : (

        <div className="img-none-container header-image">
          <img src={ImageNone} alt="Restaurant image"/>
        </div>
      )}

      <div className="modal-body">
        {!restaurant ? (
          <div>
            <h2>Loading...</h2>
          </div>
        ) : (
          <div>
            <h2>{restaurant.name}</h2>
            <p>Address: {restaurant.address}</p>
            <p>Phone: {restaurant.formatted_phone_number}</p>
            <p>Rating: {restaurant.avg_rating} ({restaurant.user_ratings_total} reviews)</p>
            <p>Price Level: {restaurant.price_level}</p>
            <p>Business Status: {restaurant.business_status}</p>
            <p>Category: {restaurant.category}</p>
            <a href={restaurant.url} target="_blank" rel="noopener noreferrer">View on Google Maps</a>
            <h3>Photos:</h3>
            <div className="photos">
              {restaurant.photos.map((photo, index) => (
                <img
                  key={index}
                  src={`https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photo.photo_reference}&key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}`}
                  alt={`Photo ${index + 1}`}
                />
              ))}
            </div>
            <h3>Reviews</h3>
            {restaurant.reviews.map((review, index) => (
              <Comment
                key={index}
                author_name={review.author_name}
                text={review.text}
                rating={review.rating}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RestaurantDetail;