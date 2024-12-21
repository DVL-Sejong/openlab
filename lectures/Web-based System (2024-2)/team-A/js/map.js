// 지도 초기화
L.mapbox.accessToken = "pk.eyJ1IjoibGN3MjAwMSIsImEiOiJjbTRjOHZzN2IwN3JhMmpxcXF5eHN4YmV2In0.Uzc4pqLXYiT6RBLqkvz29w";

var map = L.mapbox
  .map("map", null, { minZoom: 13.5, zoomControl: false })
  .setView([37.5088, 127.045], 14)
  .addLayer(L.mapbox.styleLayer("mapbox://styles/mapbox/streets-v11"))

  var bounds = [[37.47785, 127.00195], [37.54641, 127.09208]];
  map.fitBounds(bounds);
  map.setMaxBounds(bounds); // 지도 이동 제한