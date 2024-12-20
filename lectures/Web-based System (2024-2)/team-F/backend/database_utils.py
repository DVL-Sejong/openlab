from sklearn.metrics.pairwise import cosine_similarity
from sqlalchemy import create_engine, text
from dotenv import load_dotenv
import numpy as np
import time
import os

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)

def get_restaurants_within_coordinates(start_lat, start_lng, end_lat, end_lng):
    start_time = time.time()

    query = text("""
    SELECT ri.gmap_id, ri.name, ri.latitude, ri.longitude, rs.relative_score
    FROM restaurant_info ri
    JOIN relative_scores rs ON ri.gmap_id = rs.gmap_id
    WHERE ri.latitude BETWEEN :start_lat AND :end_lat
    AND ri.longitude BETWEEN :start_lng AND :end_lng
    """)
    params = {
        "start_lat": start_lat,
        "start_lng": start_lng,
        "end_lat": end_lat,
        "end_lng": end_lng
    }
    with engine.connect() as connection:
        result = connection.execute(query, params)
        columns = result.keys()
        restaurants = [dict(zip(columns, row)) for row in result.fetchall()]

    end_time = time.time()
    print(f"\033[95mTime taken to fetch data from database: {end_time - start_time} seconds\033[0m")

    return restaurants


def calculate_cosine_similarity(score_vector, restaurants):
    start_time = time.time()

    score_vector = np.array(score_vector).reshape(1, -1)
    restaurant_scores = np.array([eval(restaurant['relative_score']) for restaurant in restaurants])

    cosine_similarities = cosine_similarity(score_vector, restaurant_scores)[0]

    for i, restaurant in enumerate(restaurants):
        restaurant['cosine_similarity'] = cosine_similarities[i]

    sorted_restaurants = sorted(restaurants, key=lambda x: x['cosine_similarity'], reverse=True)

    end_time = time.time()
    print(f"\033[95mTime taken to calculate cosine similarity: {end_time - start_time} seconds\033[0m")

    return sorted_restaurants