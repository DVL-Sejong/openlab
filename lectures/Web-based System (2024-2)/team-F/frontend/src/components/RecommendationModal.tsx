import React from 'react';
import {InfiniteData} from '@tanstack/react-query';
import CriteriaList from '@/components/CriteriaList';
import RestaurantCard from './RestaurantCard';
import {Restaurant} from '@/hooks/useRecommendations';
import '@/styles/GoogleMap.css';


type RecommendationResponse = {
  restaurants: Restaurant[];
  nextPage: number;
}

interface RecommendationModalProps {
  recommendations: {
    data: InfiniteData<RecommendationResponse> | undefined;
    isLoading: boolean;
    error: Error | null;
    fetchNextPage: () => void;
    hasNextPage: boolean | undefined;
    isFetchingNextPage: boolean;
  };
}

const RecommendationModal: React.FC<RecommendationModalProps> = ({recommendations}) => {
  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = recommendations;

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const {scrollTop, scrollHeight, clientHeight} = e.currentTarget;
    if (scrollHeight - scrollTop - 10 <= clientHeight && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  return (
    <div className="modal" onScroll={handleScroll}>
      <div className="modal-header">
        <h2>Recommendations</h2>
      </div>

      <div className="modal-body">
        <h3>Recommendations</h3>

        <CriteriaList/>

        <br/>
        <h3>Top Recommendations</h3>
        <div className="recommendation-list">
          {isLoading && <div>Loading...</div>}
          {error && <div>{error.message}</div>}
          {data && data.pages.length === 0 && <div>No recommendations found</div>}
          {data?.pages.map((page, pageIndex) => (
            <React.Fragment key={pageIndex}>
              {page.restaurants && page.restaurants.map(restaurant => (
                <RestaurantCard
                  key={restaurant.gmap_id}
                  id={restaurant.gmap_id}
                  name={restaurant.name}
                  latitude={restaurant.latitude}
                  longitude={restaurant.longitude}
                  similarity={restaurant.cosine_similarity}
                />
              ))}
            </React.Fragment>
          ))}
          {isFetchingNextPage && <div>Loading more...</div>}
        </div>
      </div>
    </div>
  );
};

export default RecommendationModal;