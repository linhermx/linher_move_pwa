<?php
/**
 * Move API - Proxy Service for Maps
 */

class ProxyService
{
    private $apiKey;

    public function __construct()
    {
        $this->apiKey = Config::getORSKey();
    }

    /**
     * Proxy to OpenRouteService for Geocoding (Autocomplete)
     */
    public function geocode($text)
    {
        $url = "https://api.openrouteservice.org/geocode/autocomplete?api_key=" . $this->apiKey . "&text=" . urlencode($text) . "&boundary.country=MX";
        return $this->makeRequest($url);
    }

    /**
     * Proxy to OpenRouteService for Routing
     */
    public function getRoute($coordinates)
    {
        // coordinates: [[lng, lat], [lng, lat], ...]
        $url = "https://api.openrouteservice.org/v2/directions/driving-car/geojson";

        $body = json_encode(["coordinates" => $coordinates]);

        return $this->makePostRequest($url, $body);
    }

    private function makeRequest($url)
    {
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
        $response = curl_exec($ch);
        curl_close($ch);
        return $response;
    }

    private function makePostRequest($url, $body)
    {
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
        curl_setopt($ch, CURLOPT_POST, 1);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json',
            'Authorization: ' . $this->apiKey
        ]);
        $response = curl_exec($ch);
        curl_close($ch);
        return $response;
    }
}
