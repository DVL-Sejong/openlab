
window.onscroll = function() {
    makeNavbarSticky();
};

var navbar = document.querySelector('.navbar');
var sticky = navbar.offsetTop;

function makeNavbarSticky() {
    if (window.pageYOffset >= sticky) {
        navbar.classList.add("sticky-navbar");
    } else {
        navbar.classList.remove("sticky-navbar");
    }
}

    // Initialize the map and center it on Punta Langosteira
const map = L.map('mapOverview').setView([42.4318, -8.6480], 10);

// Add a colorful tile layer (CartoDB Positron)
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19
}).addTo(map);

let ColorIcon = L.Icon.extend({
    options: {
        iconSize: [25, 41],
        shadowSize: [41, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34]
    }
});

// Define icons for each ship type with different colors
let iconMap = {
    'Motorboat': new ColorIcon({iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png'}),
    'OceanLiner': new ColorIcon({iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-black.png'}),
    'Trawler': new ColorIcon({iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png'}),
    'Tugboat': new ColorIcon({iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-orange.png'}),
    'PilotShip': new ColorIcon({iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png'}),
    'MusselBoat': new ColorIcon({iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-grey.png'}),
    'Cargo': new ColorIcon({iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-brown.png'}),
    'Sailboat': new ColorIcon({iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-yellow.png'}),
    'Passengers': new ColorIcon({iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-violet.png'}),
    'RORO': new ColorIcon({iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-gold.png'}),
    'Fishboat': new ColorIcon({iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-grey.png'}),
    'Natural Ambient Noise': new ColorIcon({iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-gold.png'})
};

// Function to return the icon based on ship type
function getShipIcon(shipType) {
    // Return the icon based on the ship type, default to a gray icon if not found
    return iconMap[shipType] || iconMap['Natural Ambient Noise'];
}

// Ship data with updated coordinates
const shipLocations = [
    {
        id: [10, 14, 6, 7, 13, 11, 12, 17, 8, 9],
        name: [
            'Mar de Onza (Leaving)', 'Pirata de Cies (Waiting)', 'Mar de Cangas (Entering)', 'Mar de Cangas (Waiting)',
            'Pirata de Cies (Entering)', 'Minho Uno (Entering)', 'Minho Uno (Leaving)', 'Mar de Mouro (Entering)',
            'Mar de Onza (Entering)', 'Mar de Onza (Waiting)'
        ],
        type: "Passengers",
        localization: 'Cangas ships departure',
        coords: [42.2419, -8.7254]
    },
    { id: 15, name: 'Rada Uno (Passing)', type: 'Tugboat', localization: 'Ocean liners harbour', coords: [42.2426, -8.7257] },
    { id: 16, name: 'MSC Opera', type: 'OceanLiner', localization: 'Ocean liner harbour', coords: [42.2426, -8.7256] },
    { id: 21, name: 'Motorboat', type: 'Motorboat', localization: 'Bouzas Cove', coords: [42.2345, -8.7513] },
    {
        id: [18, 19, 20],
        name: [
            'Autopride (Entering)', 'Autopride(reverse)', 'Autopride(preparing maneuver)'
        ],
        type: "RORO",
        localization: 'Bouzas Cove',
        coords: [42.2345, -8.7512]
    },

    { id: 28, name: 'Nuevo ria Aldan', type: 'Trawler', localization: 'In front of ocean liners harbour', coords: [42.2401,-8.7327] },
    { id: 31, name: 'Tugboat (start-stop engine)', type: 'Tugboat', localization: 'In front of ocean liners harbour', coords:[42.2401,-8.7325] },
    {
        id: [26, 27],
        name: [
            'Motorboat', 'Motorboat (close recording)'
        ],
        type: "Motorboat",
        localization: 'In front of ocean liners harbour',
        coords: [42.2401,-8.7325]
    },
    {
        id: [29, 30],
        name: [
            'Pilot ship', 'Pilot ship'
        ],
        type: "PilotShip",
        localization: 'In front of ocean liners harbour',
        coords: [42.2401,-8.7324]
    },
    {
        id: [24,25,22,23],
        name: [
            'Adventure of the seas (slowing)', 'Adventure of the seas (arrives)', 
            'Adventure of the seas (maneuver)',  'Adventure of the seas (stopped)', 
        ],
        type: "OceanLiner",
        localization: 'In front of ocean liners harbour',
        coords: [42.2401,-8.7326]
    },
    { id: 37, name: 'Sailboat (starts and leaves)', type: 'Sailboat', localization: 'Red lighthouse at the port', coords: [42.2428, -8.7236] },
    {
        id: [39, 45, 33],
        name: [
            '"Duda" (going out)', 'Yacht (leaves)', 'Motorboat "Duda" (arrives)'
        ],
        type: 'Motorboat',
        localization: 'Red lighthouse at the port',
        coords: [42.2428, -8.7234]
    },
    {
        id: [36, 34, 35, 32, 40, 43, 42, 41, 38],
        name: [
            'Minho Uno (leaving)', 'Mar de Onza (arrives)', 'Mar de Onza (going out)', 'Arroios (arrives)',
            'Mar de Cangas (arrives, interference)', 'Mar de Cangas (arrives, interference)', 'Pirata de Cies (arrives, interference)',
            'Pirata de Cies (leaves)', 'Minho Uno (arrives)', 'Arroios'
        ],
        type: "Passengers",
        localization: 'Red lighthouse at the port',
        coords: [42.2428, -8.7235]
    },
    {
        id: [50, 51, 52],
        name: [
            'Motorboat1', 'Motorboat2 (interf)', 'Motorboat3 (interf)'
        ],
        type: "Motorboat",
        localization: "Vigo sea loch - Zone 1",
        coords: [ 42.2578, -8.7478]
    },
    {
        id: [56, 57],
        name: [
            'Sailboat', 'Sailboat 2'
        ],
        type: "Sailboat",
        localization: "Vigo sea loch - Zone 1",
        coords: [ 42.2578, -8.7479]
    },
    {
        id: [46, 47, 48, 49],
        name: [
           'Mussel boat1', 'Mussel boat2', 'Mussel boat3 (interf)', 'Mussel boat4'
        ],
        type: "MusselBoat",
        localization: "Vigo sea loch - Zone 1",
        coords: [ 42.2578, -8.7481]
    },
    {
        id: [53, 54, 55],
        name: [
           'Pirata de Salvora (arrives)', 'Pirata de Salvora (leaves)', 'Pirata de Salvora (leaves, 2nd take)'
        ],
        type: "Passengers",
        localization: "Vigo sea loch - Zone 1",
        coords: [ 42.2578, -8.7480]
    },
    { id: 58, name: 'Eimskip Reefer (interf)', type: 'RORO', localization: 'Vigo sea loch - Zone 2', coords: [42.2477, -8.7630] },
    { id: 68, name: 'Sailboat', type: 'Sailboat', localization: 'Vigo sea loch - Zone 2', coords: [42.2477, -8.7631] },
    { id: 66, name: 'Fishboat', type: 'MusselBoat', localization: 'Vigo sea loch - Zone 2', coords: [42.2477, -8.7632] },
    {
        id: [62, 63, 67, 60, 59, 65, 61, 64],
        name: [
            'Mar de Cangas (leaves)', 'Mar de Onza (arrives)', 'Pirata de Cies',
            'Mar de Cangas (arrives)', 'Mar de Mouro (arrives)', 'Minho uno (arrives)',
            'Mar de Cangas (leaves 2)', 'Mar de Onza (leaves)'
        ],
        type: "Passengers",
        localization: "Vigo sea loch - Zone 2",
        coords: [42.2482, -8.7618]
    },
    { id: 78, name: 'Viking Chance', type: 'RORO', localization: 'Vigo sea loch - Zone 3', coords: [42.2291, -8.7767] },
    {
        id: [71,69],
        name: [
            "Discovery UK", " Costa Voyager"
        ],
        type: "OceanLiner",
        localization: "Vigo sea loch - Zone 3",
        coords: [42.2291, -8.7768]
    },
    {
        id: [77, 79, 72, 70],
        name: [
            " High Speed Motorboat", " Zodiac", 
            " Motorboat 2", "Small Yacht"
        ],
        type: "Motorboat",
        localization: "Vigo sea loch - Zone 3",
        coords: [42.2291, -8.7769]
    },
    {
        id: [75, 76, 73, 74],
        name: [
            "Fishboat 1", " Mari Carmen Fishboat",
            " Fishboat 2","Saladino Primero"
        ],
        type: "Fishboat",
        localization: "Vigo sea loch - Zone 3",
        coords: [42.2291, -8.7766]
    },
    {
        id: [85, 86, 87, 88, 89, 90, 91, 92, 81, 83, 82, 84],
        name: [
            "Natural ambient noise sample 1-8",
            " Maximum flow",
            " Maximum wave",
            " Maximum rain",
            " Maximum wind"
        ],
        type: "Natural Ambient Noise",
        localization: "Intecmar weather station",
        coords: [42.590029504868994, -8.78805389667516]
    }
    
];

// Markers layer group
const markers = L.layerGroup().addTo(map);

// Function to update map based on selected filters
function updateMap() {
    markers.clearLayers(); // Clear existing markers
    
    // Get the selected filter from the dropdown
    const filter = document.querySelector('#ship-filter').value;

    // Filter ships based on the selected type
    shipLocations
        .filter(ship => filter === 'all' || ship.type === filter)  // Show all ships if "All Ships" is selected
        .forEach(ship => {
            // Create a marker with the appropriate icon based on ship type
            const marker = L.marker(ship.coords, { icon: getShipIcon(ship.type) });

            // Add the mouseover event to display the popup when hovering over the marker
            marker.on('mouseover', function() {
                marker.bindPopup(`<b>${ship.name}</b><br>ID: ${ship.id}<br>Type: ${ship.type}<br>Localization: ${ship.localization}`).openPopup();
            });

            // Optionally, you can also add a mouseout event to close the popup when the mouse leaves the marker
            marker.on('mouseout', function() {
                marker.closePopup();
            });

            // Add the marker to the map
            marker.addTo(markers);
        });
}


// Add reset functionality
document.getElementById('reset-map').addEventListener('click', () => {
    document.querySelector('.ship-filter').value = 'all';    updateMap();
    map.setView([42.4318, -8.6480], 10); // Reset the map view to Punta Langosteira
});


// Add event listener to the dropdown menu
document.querySelector('#ship-filter').addEventListener('change', updateMap);

// Initialize the map with all markers
updateMap();


