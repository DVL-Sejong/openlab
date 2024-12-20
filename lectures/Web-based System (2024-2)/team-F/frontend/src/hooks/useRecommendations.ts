import { useInfiniteQuery, QueryFunctionContext } from '@tanstack/react-query';
import {Bounds} from '@/utils/bounds';

export interface Restaurant {
  gmap_id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  category: string;
  avg_rating: number;
  cosine_similarity: number;
}

export interface RecommendationResponse {
  restaurants: Restaurant[];
  nextPage: number;
}

const fetchRecommendations = async ({ pageParam = 1, queryKey }: QueryFunctionContext<[string, Bounds | null, string]>) => {
  const [_, bounds, scores] = queryKey;

  if (!bounds || scores === '0,0,0,0,0') {
    return { restaurants: [], nextPage: 1 } as RecommendationResponse;
  }

  const { south, west, north, east } = bounds;

  const url = `/api/restaurants?page=${pageParam}&start_lat=${south}&start_lng=${west}&end_lat=${north}&end_lng=${east}&topic=${scores}`;
  const response = await fetch(url);
  const data = await response.json();

  return { restaurants: data.restaurants, nextPage: pageParam as number + 1 } as RecommendationResponse;
};

export const useRecommendations = (bounds: Bounds | null, scores: string) => {
  return useInfiniteQuery<RecommendationResponse, Error>({
    queryKey: ['recommendations', bounds, scores],
    queryFn: fetchRecommendations as any,
    getNextPageParam: (lastPage) => lastPage.nextPage,
    staleTime: 5000, // Adjust the stale time as needed
    initialPageParam: 1, // Add initialPageParam
  });
};