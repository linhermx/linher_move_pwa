import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useTheme } from '../context/ThemeContext';

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
    const { theme } = useTheme();
    const mapRef = useRef(null);
    const mapInstance = useRef(null);
    const routeLayer = useRef(null);
    const tileLayer = useRef(null);

    const getTileLayerConfig = () => (
        theme === 'light'
            ? {
                url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
                options: {
                    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
                    subdomains: 'abcd',
                    maxZoom: 20
                }
            }
            : {
                url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
                options: {
                    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
                    subdomains: 'abcd',
                    maxZoom: 20
                }
            }
    );

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
            const tileConfig = getTileLayerConfig();
            mapInstance.current = L.map(mapRef.current).setView([19.0414, -98.2063], 13); // Default to Puebla, MX
            tileLayer.current = L.tileLayer(tileConfig.url, tileConfig.options).addTo(mapInstance.current);
        }

        const mapContainer = mapRef.current;
        const resizeObserver = new ResizeObserver(() => {
            if (mapInstance.current) {
                mapInstance.current.invalidateSize();
            }
        });

        if (mapContainer) {
            resizeObserver.observe(mapContainer);
        }

        return () => {
            if (mapContainer) {
                resizeObserver.unobserve(mapContainer);
            }
            if (mapInstance.current) {
                // mapInstance.current.remove();
            }
        };
    }, []);

    useEffect(() => {
        if (!mapInstance.current) {
            return;
        }

        if (tileLayer.current) {
            mapInstance.current.removeLayer(tileLayer.current);
        }

        const tileConfig = getTileLayerConfig();
        tileLayer.current = L.tileLayer(tileConfig.url, tileConfig.options).addTo(mapInstance.current);
    }, [theme]);

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
        if (!mapInstance.current) return;

        if (routeLayer.current) {
            mapInstance.current.removeLayer(routeLayer.current);
            routeLayer.current = null;
        }

        if (!routeData) return;

        routeLayer.current = L.geoJSON(routeData, {
            style: { color: '#FF4848', weight: 5, opacity: 0.7 }
        }).addTo(mapInstance.current);

        // Fit map bounds to the actual route polyline, plus slight delay to ensure size is registered
        setTimeout(() => {
            if (mapInstance.current && routeLayer.current) {
                const routeBounds = routeLayer.current.getBounds();
                if (routeBounds.isValid()) {
                    mapInstance.current.fitBounds(routeBounds, { padding: [50, 50] });
                }
            }
        }, 150);

    }, [routeData]);

    return <div ref={mapRef} className="map-canvas" />;
};

export default MapComponent;
