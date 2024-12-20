from flask import Flask, jsonify, request
from dotenv import load_dotenv
import threading
from model_utils import ModelUtils
from database_utils import get_restaurants_within_coordinates, calculate_cosine_similarity
from flask_cors import cross_origin
import requests
import os


load_dotenv()

app = Flask(
    __name__,
    static_folder='static',  # Static file directory
    static_url_path='/flask/static'  # Static file access path
)

app.config['JSON_AS_ASCII'] = False

PLACE_API_KEY = os.getenv("PLACE_API_KEY")
GOOGLE_PLACE_DETAILS_URL = "https://maps.googleapis.com/maps/api/place/details/json"
GOOGLE_PLACE_SEARCH_URL = "https://maps.googleapis.com/maps/api/place/findplacefromtext/json"

cross_origin(["http://localhost", "https://web-system-hw5.among.world"])

model_utils = ModelUtils()

@app.route('/flask')
def home():
    return jsonify({"message": "Flask server is running!"})

@app.route('/flask/api/place', methods=['POST'])
def get_place_details_with_name():
    data = request.get_json()
    place_name = data.get("place_name")
    location = data.get("location")

    if not place_name:
        return jsonify({"error": "place_name is required"}), 400

    findplace_params = {
        "input": place_name,
        "inputtype": "textquery",
        "fields": "place_id",
        "key": PLACE_API_KEY,
    }
    if location:
        findplace_params["locationbias"] = f"circle:100@{location['lat']},{location['lng']}"

    findplace_response = requests.get(GOOGLE_PLACE_SEARCH_URL, params=findplace_params)

    if findplace_response.status_code == 200:
        findplace_data = findplace_response.json()
        if findplace_data.get("status") == "OK" and findplace_data.get("candidates"):
            place_id = findplace_data["candidates"][0].get("place_id")
        else:
            return jsonify({"error": "No place found", "details": findplace_data.get("status")}), 404
    else:
        return jsonify({"error": "Failed to fetch place_id", "status_code": findplace_response.status_code}), 500

    details_params = {
        "place_id": place_id,
        "key": PLACE_API_KEY,
        "fields": "name,formatted_address,rating,user_ratings_total,price_level,opening_hours,website,formatted_phone_number,business_status,current_opening_hours,photos,reviews,url",
        "language": "en"
    }
    details_response = requests.get(GOOGLE_PLACE_DETAILS_URL, params=details_params)

    if details_response.status_code == 200:
        details_data = details_response.json()
        if details_data.get("status") == "OK":
            return jsonify(details_data.get("result"))
        else:
            return jsonify({"error": details_data.get("status"),
                            "message": details_data.get("error_message", "Unknown error")}), 400
    else:
        return jsonify({"error": "Failed to fetch place details", "status_code": details_response.status_code}), 500

@app.route('/flask/api/restaurants', methods=['GET'])
def get_restaurants():
    start_lat = request.args.get('start_lat')
    start_lng = request.args.get('start_lng')
    end_lat = request.args.get('end_lat')
    end_lng = request.args.get('end_lng')
    topic = request.args.get('topic')
    page = request.args.get('page', default=1, type=int)
    per_page = request.args.get('per_page', default=10, type=int)

    missing_fields = []
    if not start_lat:
        missing_fields.append('start_lat')
    if not start_lng:
        missing_fields.append('start_lng')
    if not end_lat:
        missing_fields.append('end_lat')
    if not end_lng:
        missing_fields.append('end_lng')
    if not topic:
        missing_fields.append('topic')

    if missing_fields:
        return jsonify({"error": f"Missing required parameters: {', '.join(missing_fields)}"}), 400

    try:
        score_vector = [float(x) for x in topic.split(',')]
    except ValueError:
        return jsonify({"error": "Invalid format for topic. It should be a comma-separated list of numbers."}), 400

    try:
        restaurants = get_restaurants_within_coordinates(start_lat, start_lng, end_lat, end_lng)
    except Exception as e:
        return jsonify({"error": "Failed to access the database", "details": str(e)}), 500

    sorted_restaurants = calculate_cosine_similarity(score_vector, restaurants)

    total_items = len(sorted_restaurants)
    total_pages = (total_items + per_page - 1) // per_page
    start = (page - 1) * per_page
    end = start + per_page
    paginated_restaurants = sorted_restaurants[start:end]

    response = {
        "page": page,
        "per_page": per_page,
        "total_items": total_items,
        "total_pages": total_pages,
        "restaurants": paginated_restaurants
    }

    return jsonify(response)


# Load the model in a separate thread
model_thread = threading.Thread(target=model_utils.load_model_and_data)
model_thread.start()

@app.route('/flask/api/scores', methods=['POST'])
def get_topic_weights():
    if not model_utils.model_loaded:
        return jsonify({"error": "Model is still loading, please try again later"}), 503

    user_input = request.json.get('text')
    if not user_input:
        return jsonify({"error": "No input text provided"}), 400

    topic_weights = model_utils.calculate_input_topic_weights(user_input)
    return jsonify({"topicScore": topic_weights})

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=5000, debug=True)