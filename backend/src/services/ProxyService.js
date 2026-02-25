import dotenv from 'dotenv';
dotenv.config();

export class ProxyService {
    constructor() {
        this.apiKey = process.env.ORS_API_KEY;
        this.isKeyPlaceholder = !this.apiKey || this.apiKey === 'YOUR_API_KEY_HERE';
    }

    /**
     * Proxy to OpenRouteService for Geocoding (Autocomplete)
     */
    async geocode(text) {
        if (this.isKeyPlaceholder) {
            throw new Error("ORS_API_KEY_MISSING");
        }

        const url = `https://api.openrouteservice.org/geocode/autocomplete?api_key=${this.apiKey}&text=${encodeURIComponent(text)}&boundary.country=MX&lang=es`;

        try {
            // Quick check: If text looks like "lat, lng", don't search, just return it as a single feature
            const coordRegex = /^-?\d+\.?\d*,\s*-?\d+\.?\d*$/;
            if (coordRegex.test(text.trim())) {
                const [lat, lng] = text.split(',').map(s => parseFloat(s.trim()));
                return {
                    features: [{
                        geometry: { coordinates: [lng, lat] },
                        properties: { label: text.trim() }
                    }]
                };
            }

            const response = await fetch(url);
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                console.error('ORS Autocomplete Error:', response.status, errData);
                throw new Error(`ORS_API_ERROR_${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Fetch Geocode Error:', error);
            throw error;
        }
    }

    /**
     * Proxy to OpenRouteService for Routing
     */
    async getRoute(coordinates, retries = 2) {
        if (this.isKeyPlaceholder) {
            throw new Error("ORS_API_KEY_MISSING");
        }

        const url = `https://api.openrouteservice.org/v2/directions/driving-car/geojson?api_key=${this.apiKey}`;
        console.log(`[ORS] Routing request points:`, JSON.stringify(coordinates));

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ coordinates })
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                console.error(`[ORS] Routing Error ${response.status}:`, JSON.stringify(errData));
                throw new Error(`ORS_API_ERROR_${response.status}`);
            }
            return await response.json();
        } catch (error) {
            if (retries > 0 && (error.message.includes("fetch failed") || error.name === 'ConnectTimeoutError' || (error.cause && error.cause.code === 'UND_ERR_CONNECT_TIMEOUT'))) {
                console.warn(`[ORS] Routing failed (timeout/network), retrying... (${retries} left)`);
                await new Promise(resolve => setTimeout(resolve, 1500));
                return this.getRoute(coordinates, retries - 1);
            }
            console.error('[ORS] Fetch Routing Error:', error.message);
            throw error;
        }
    }

    /**
     * Proxy to OpenRouteService for Reverse Geocoding
     */
    async reverseGeocode(lat, lng, retries = 1) {
        if (this.isKeyPlaceholder) {
            throw new Error("ORS_API_KEY_MISSING");
        }

        const url = `https://api.openrouteservice.org/geocode/reverse?api_key=${this.apiKey}&point.lon=${lng}&point.lat=${lat}&size=1&lang=es`;
        console.log(`[ORS] Reverse Geocode request: ${lat}, ${lng}`);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        try {
            const response = await fetch(url, { signal: controller.signal });
            clearTimeout(timeoutId);
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                console.error(`[ORS] Reverse Geocode Error ${response.status}:`, JSON.stringify(errData));
                throw new Error(`ORS_API_ERROR_${response.status}`);
            }
            return await response.json();
        } catch (error) {
            clearTimeout(timeoutId);
            if (retries > 0 && (error.name === 'AbortError' || error.message.includes("fetch failed") || error.name === 'ConnectTimeoutError' || (error.cause && error.cause.code === 'UND_ERR_CONNECT_TIMEOUT'))) {
                console.warn(`[ORS] Reverse Geocode failed (timeout/network), retrying... (${retries} left)`);
                await new Promise(resolve => setTimeout(resolve, 1000));
                return this.reverseGeocode(lat, lng, retries - 1);
            }
            console.error('[ORS] Fetch Reverse Geocode Error:', error.message);
            throw error;
        }
    }
}
