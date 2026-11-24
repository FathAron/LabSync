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
      background: #e5e7eb;
    }
    .lab-pin {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      border: 3px solid #ffffff;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.35);
    }
    .user-pin {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: #16a34a;
      border: 3px solid #ffffff;
      box-shadow: 0 0 0 4px rgba(22, 163, 74, 0.25);
    }
    .leaflet-control-attribution {
      font-size: 10px !important;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    (function () {
      var map = L.map('map', {
        zoomControl: true,
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
          var color = isSelected ? '#2563EB' : '#DC2626';

          L.circle([lab.latitude, lab.longitude], {
            radius: lab.radiusMeters || 50,
            color: color,
            weight: isSelected ? 2 : 1,
            fillColor: color,
            fillOpacity: isSelected ? 0.18 : 0.08
          }).addTo(labLayer);

          var icon = L.divIcon({
            className: '',
            html: '<div class="lab-pin" style="background:' + color + ';"></div>',
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
              color: '#16A34A',
              weight: 1,
              fillColor: '#16A34A',
              fillOpacity: 0.1
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
