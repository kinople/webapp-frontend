import React, { useCallback, useMemo, useRef, useEffect } from 'react';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';

const mapContainerStyle = {
    height: '100%',
    width: '100%'
};

// Default to Los Angeles if no location
const defaultCenter = { lat: 34.0522, lng: -118.2437 };

const libraries = ['places'];

const InlineLocationMap = ({ lat, lng, onLocationChange }) => {
    const mapRef = useRef(null);
    const { isLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: "AIzaSyBGLCFBaUHw6fGo2XbLIQXNIiLTlMjfITo",
        libraries
    });

    const center = useMemo(() => (lat != null && lng != null ? { lat: parseFloat(lat), lng: parseFloat(lng) } : defaultCenter), [lat, lng]);
    const markerPosition = useMemo(() => (lat != null && lng != null ? { lat: parseFloat(lat), lng: parseFloat(lng) } : null), [lat, lng]);

    // Re-center map when props change
    useEffect(() => {
        if (mapRef.current && lat != null && lng != null) {
            mapRef.current.panTo({ lat: parseFloat(lat), lng: parseFloat(lng) });
        }
    }, [lat, lng]);

    const onMapLoad = useCallback((map) => {
        mapRef.current = map;
    }, []);

    const onMapClick = useCallback((e) => {
        if (onLocationChange) {
            onLocationChange(e.latLng.lat(), e.latLng.lng());
        }
    }, [onLocationChange]);

    if (!isLoaded) return <div style={{ height: '100%', width: '100%', background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading Map...</div>;

    return (
        <div style={{ height: '100%', width: '100%' }}>
            <GoogleMap
                mapContainerStyle={mapContainerStyle}
                center={center}
                zoom={14}
                onLoad={onMapLoad}
                onClick={onMapClick}
                options={{
                    streetViewControl: false,
                    mapTypeControl: true,
                    fullscreenControl: false
                }}
            >
                {markerPosition && <Marker position={markerPosition} />}
            </GoogleMap>
        </div>
    );
};

export default React.memo(InlineLocationMap);
