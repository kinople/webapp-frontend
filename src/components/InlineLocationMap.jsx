import React, { useEffect, useMemo, useRef } from 'react';
import useGoogleMapsLoader from '../hooks/useGoogleMapsLoader';

// Default to Los Angeles if no location
const defaultCenter = { lat: 34.0522, lng: -118.2437 };

const libraries = ['places'];

const InlineLocationMap = ({ lat, lng, onLocationChange }) => {
    const mapRef = useRef(null);
    const markerRef = useRef(null);
    const mapContainerRef = useRef(null);
    const clickListenerRef = useRef(null);
    const { isLoaded } = useGoogleMapsLoader({
        id: 'google-map-script',
        apiKey: "AIzaSyBGLCFBaUHw6fGo2XbLIQXNIiLTlMjfITo",
        libraries
    });

    const center = useMemo(() => (lat != null && lng != null ? { lat: parseFloat(lat), lng: parseFloat(lng) } : defaultCenter), [lat, lng]);
    const markerPosition = useMemo(() => (lat != null && lng != null ? { lat: parseFloat(lat), lng: parseFloat(lng) } : null), [lat, lng]);

    useEffect(() => {
        if (!isLoaded || !mapContainerRef.current || mapRef.current) return;

        mapRef.current = new window.google.maps.Map(mapContainerRef.current, {
            center,
            zoom: 14,
            streetViewControl: false,
            mapTypeControl: true,
            fullscreenControl: false
        });

        if (markerPosition) {
            markerRef.current = new window.google.maps.Marker({
                position: markerPosition,
                map: mapRef.current
            });
        }

        clickListenerRef.current = mapRef.current.addListener('click', (e) => {
            const clickLat = e.latLng?.lat();
            const clickLng = e.latLng?.lng();
            if (typeof clickLat === 'number' && typeof clickLng === 'number') {
                if (!markerRef.current) {
                    markerRef.current = new window.google.maps.Marker({
                        position: { lat: clickLat, lng: clickLng },
                        map: mapRef.current
                    });
                } else {
                    markerRef.current.setPosition({ lat: clickLat, lng: clickLng });
                }

                if (onLocationChange) onLocationChange(clickLat, clickLng);
            }
        });
    }, [center, isLoaded, markerPosition, onLocationChange]);

    useEffect(() => {
        if (!mapRef.current) return;

        mapRef.current.panTo(center);
        if (markerPosition) {
            if (!markerRef.current) {
                markerRef.current = new window.google.maps.Marker({
                    position: markerPosition,
                    map: mapRef.current
                });
            } else {
                markerRef.current.setPosition(markerPosition);
            }
        } else if (markerRef.current) {
            markerRef.current.setMap(null);
            markerRef.current = null;
        }
    }, [center, markerPosition]);

    useEffect(() => {
        return () => {
            if (clickListenerRef.current) {
                window.google?.maps?.event?.removeListener(clickListenerRef.current);
            }
        };
    }, []);

    if (!isLoaded) return <div style={{ height: '100%', width: '100%', background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading Map...</div>;

    return (
        <div ref={mapContainerRef} style={{ height: '100%', width: '100%' }} />
    );
};

export default React.memo(InlineLocationMap);
