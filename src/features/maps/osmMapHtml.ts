export const buildOsmMapHtml = (
  initialLat: number,
  initialLng: number
): string => `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link
    rel="stylesheet"
    href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
  />
  <style>
    html, body, #map {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      background: #F0E5D6;
    }
    .lab-pin {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      border: 3px solid #FFFDF9;
      box-shadow: 0 3px 8px rgba(71, 67, 41, 0.35);
      transition: transform 0.2s ease;
    }
    .lab-pin-selected {
      transform: scale(1.25);
      box-shadow: 0 4px 12px rgba(252, 117, 180, 0.45);
    }
    .user-pin {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: #45734C;
      border: 3px solid #FFFDF9;
      box-shadow: 0 0 0 5px rgba(69, 115, 76, 0.25);
    }
    .leaflet-control-attribution {
      font-size: 9px !important;
      background: rgba(255, 253, 249, 0.8) !important;
      color: #7E7764 !important;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    (function () {
      var map = L.map('map', {
        zoomControl: false,
        attributionControl: true
      }).setView([${initialLat}, ${initialLng}], 17);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap'
      }).addTo(map);

      var labLayer = L.layerGroup().addTo(map);
      var userLayer = L.layerGroup().addTo(map);

      function postMessage(payload) {
        if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
          window.ReactNativeWebView.postMessage(JSON.stringify(payload));
        }
      }

      window.updateMapState = function (state) {
        if (!state) return;

        labLayer.clearLayers();
        var labs = Array.isArray(state.laboratories) ? state.laboratories : [];
        var selectedId = state.selectedLabId || null;

        labs.forEach(function (lab) {
          var isSelected = lab.id === selectedId;
          var color = isSelected ? '#FC75B4' : '#474329';

          L.circle([lab.latitude, lab.longitude], {
            radius: lab.radiusMeters || 50,
            color: color,
            weight: isSelected ? 2 : 1,
            fillColor: color,
            fillOpacity: isSelected ? 0.22 : 0.08
          }).addTo(labLayer);

          var icon = L.divIcon({
            className: '',
            html: '<div class="lab-pin ' + (isSelected ? 'lab-pin-selected' : '') + '" style="background:' + color + ';"></div>',
            iconSize: [24, 24],
            iconAnchor: [12, 12]
          });

          var marker = L.marker([lab.latitude, lab.longitude], { icon: icon })
            .addTo(labLayer)
            .bindTooltip(lab.name, { direction: 'top', offset: [0, -10] });

          marker.on('click', function () {
            postMessage({ type: 'SELECT_LAB', labId: lab.id });
          });
        });

        userLayer.clearLayers();
        if (state.userCoords && typeof state.userCoords.latitude === 'number') {
          var u = state.userCoords;
          if (typeof u.accuracy === 'number' && u.accuracy > 0) {
            L.circle([u.latitude, u.longitude], {
              radius: Math.min(u.accuracy, 200),
              color: '#45734C',
              weight: 1,
              fillColor: '#45734C',
              fillOpacity: 0.12
            }).addTo(userLayer);
          }

          var userIcon = L.divIcon({
            className: '',
            html: '<div class="user-pin"></div>',
            iconSize: [22, 22],
            iconAnchor: [11, 11]
          });

          L.marker([u.latitude, u.longitude], { icon: userIcon })
            .addTo(userLayer)
            .bindTooltip('Posisi Anda', { direction: 'top', offset: [0, -8] });
        }
      };

      window.focusMapPoint = function (lat, lng, zoom) {
        if (typeof lat === 'number' && typeof lng === 'number') {
          map.setView([lat, lng], zoom || 17, { animate: true });
        }
      };
    })();
  </script>
</body>
</html>`;
