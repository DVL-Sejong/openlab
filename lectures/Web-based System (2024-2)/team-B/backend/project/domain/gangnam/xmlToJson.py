import xml.etree.ElementTree as ET
from pyproj import Transformer


# SUMO 네트워크 파일 파싱 함수
def parse_sumo_network(file_path):
    tree = ET.parse(file_path)
    root = tree.getroot()

    edges = []
    for edge in root.findall(".//edge[@id]"):
        edge_id = edge.attrib.get("id")
        lanes = []
        for lane in edge.findall("lane"):
            lane_shape = lane.attrib.get("shape")
            if lane_shape:
                # 도로 좌표 데이터를 파싱
                coords = [
                    list(map(float, coord.split(","))) for coord in lane_shape.split()
                ]
                lanes.append({"id": lane.attrib.get("id"), "coords": coords})
        edges.append({"id": edge_id, "lanes": lanes})

    return {"edges": edges}


def pase_sumo_to_geoJson(file_path):
    tree = ET.parse(file_path)
    root = tree.getroot()

    # 2. 네트워크 오프셋 정보
    net_offset = root.find("location").get("netOffset").split(",")
    offset_x, offset_y = map(float, net_offset)

    # 3. 좌표 변환기 초기화
    # EPSG:32652 (UTM Zone 52N) → EPSG:4326 (WGS84 경위도)
    transformer = Transformer.from_crs("EPSG:32652", "EPSG:4326", always_xy=True)
    # 4. GeoJSON Feature 리스트 생성
    features = []

    for edge in root.findall("edge"):
        edge_id = edge.get("id")
        for lane in edge.findall("lane"):
            lane_id = lane.get("id")
            shape = lane.get("shape")  # "x1,y1 x2,y2 ..." 형태
            coords = [list(map(float, coord.split(","))) for coord in shape.split(" ")]

            # 로컬 좌표 → UTM 좌표 → WGS84 좌표
            transformed_coords = [
                transformer.transform(x - offset_x, y - offset_y) for x, y in coords
            ]

            # GeoJSON Feature 생성
            feature = {
                "type": "Feature",
                "properties": {
                    "edge_id": edge_id,
                    "lane_id": lane_id,
                    "trafficVolume": 900,
                },
                "geometry": {
                    "type": "LineString",
                    "coordinates": transformed_coords,
                },
            }
            features.append(feature)

    # 5. GeoJSON 데이터 생성
    geojson_data = {
        "type": "FeatureCollection",
        "features": features,
    }
    return geojson_data
