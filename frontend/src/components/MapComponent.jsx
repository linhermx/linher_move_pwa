import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in Leaflet with React
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

const MapComponent = ({ points = [], routeData = null, onMarkerDrag, readOnly = false }) => {
    const mapRef = useRef(null);
    const mapInstance = useRef(null);
    const routeLayer = useRef(null);

    const createCustomIcon = (colorClass) => {
        return L.divIcon({
            className: 'custom-marker',
            html: `<div class="pulse-ring ${colorClass}"></div><div class="pulse-dot ${colorClass}"></div>`,
            iconSize: [35, 35],
            iconAnchor: [17, 17]
        });
    };

    useEffect(() => {
        if (!mapInstance.current) {
            mapInstance.current = L.map(mapRef.current).setView([19.0414, -98.2063], 13); // Default to Puebla, MX
            L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            }).addTo(mapInstance.current);
        }

        return () => {
            if (mapInstance.current) {
                // mapInstance.current.remove();
            }
        };
    }, []);

    useEffect(() => {
        if (!mapInstance.current) return;

        // Clear existing markers (not efficient but simple for now)
        mapInstance.current.eachLayer((layer) => {
            if (layer instanceof L.Marker) mapInstance.current.removeLayer(layer);
        });

        points.forEach((p, idx) => {
            if (p.lat && p.lng) {
                const isOrigin = idx === 0;
                const isDestination = idx === points.length - 1;
                const colorClass = isOrigin ? 'green' : (isDestination ? 'red' : 'blue');

                const marker = L.marker([p.lat, p.lng], {
                    draggable: !readOnly,
                    icon: createCustomIcon(colorClass)
                })
                    .addTo(mapInstance.current)
                    .bindPopup(isOrigin ? 'Origen' : (isDestination ? 'Destino' : `Parada ${idx}`));

                marker.on('dragend', (e) => {
                    const { lat, lng } = e.target.getLatLng();
                    onMarkerDrag(idx, lat, lng);
                });
            }
        });

        // Fit bounds if we have points
        const validPoints = points.filter(p => p.lat && p.lng).map(p => [p.lat, p.lng]);
        if (validPoints.length > 0) {
            mapInstance.current.fitBounds(validPoints, { padding: [40, 40] });
        }
    }, [points]);

    useEffect(() => {
        if (!mapInstance.current || !routeData) return;

        if (routeLayer.current) {
            mapInstance.current.removeLayer(routeLayer.current);
        }

        routeLayer.current = L.geoJSON(routeData, {
            style: { color: '#FF4848', weight: 5, opacity: 0.7 }
        }).addTo(mapInstance.current);

    }, [routeData]);

    return <div ref={mapRef} style={{ height: '100%', width: '100%', borderRadius: 'var(--radius-md)' }} />;
};

export default MapComponent;
