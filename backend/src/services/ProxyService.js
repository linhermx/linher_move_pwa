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
    async getRoute(coordinates) {
        if (this.isKeyPlaceholder) {
            throw new Error("ORS_API_KEY_MISSING");
        }

        const url = `https://api.openrouteservice.org/v2/directions/driving-car/geojson`;

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': this.apiKey
                },
                body: JSON.stringify({ coordinates })
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                console.error('ORS Routing Error:', response.status, errData);
                throw new Error(`ORS_API_ERROR_${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Fetch Routing Error:', error);
            throw error;
        }
    }

    /**
     * Proxy to OpenRouteService for Reverse Geocoding
     */
    async reverseGeocode(lat, lng) {
        if (this.isKeyPlaceholder) {
            throw new Error("ORS_API_KEY_MISSING");
        }

        const url = `https://api.openrouteservice.org/geocode/reverse?api_key=${this.apiKey}&point.lon=${lng}&point.lat=${lat}&size=1&lang=es`;

        try {
            const response = await fetch(url);
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                console.error('ORS Reverse Geocode Error:', response.status, errData);
                throw new Error(`ORS_API_ERROR_${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Fetch Reverse Geocode Error:', error);
            throw error;
        }
    }
}
