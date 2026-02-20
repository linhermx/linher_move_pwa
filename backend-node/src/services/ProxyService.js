import dotenv from 'dotenv';
dotenv.config();

export class ProxyService {
    constructor() {
        this.apiKey = process.env.ORS_API_KEY;
    }

    /**
     * Proxy to OpenRouteService for Geocoding (Autocomplete)
     */
    async geocode(text) {
        const url = `https://api.openrouteservice.org/geocode/autocomplete?api_key=${this.apiKey}&text=${encodeURIComponent(text)}&boundary.country=MX`;

        const response = await fetch(url);
        return await response.json();
    }

    /**
     * Proxy to OpenRouteService for Routing
     */
    async getRoute(coordinates) {
        const url = `https://api.openrouteservice.org/v2/directions/driving-car/geojson`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': this.apiKey
            },
            body: JSON.stringify({ coordinates })
        });

        return await response.json();
    }
}
