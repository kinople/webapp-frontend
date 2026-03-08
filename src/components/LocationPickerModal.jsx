import React, { useState, useEffect, useRef } from 'react';

const LocationPickerModal = ({ isOpen, onClose, onSave, initialLocation }) => {
    const mapRef = useRef(null);
    const [map, setMap] = useState(null);
    const [marker, setMarker] = useState(null);
    const [position, setPosition] = useState(initialLocation || null);

    // Default to Mumbai if no location (common for this project based on context)
    const defaultCenter = initialLocation || { lat: 19.0760, lng: 72.8777 };

    useEffect(() => {
        if (isOpen && !window.google) {
            // Load Google Maps script if not already loaded
            const script = document.createElement('script');
            script.src = `https://maps.googleapis.com/maps/api/js?key=${"AIzaSyBGLCFBaUHw6fGo2XbLIQXNIiLTlMjfITo"}&libraries=places`;
            script.async = true;
            script.defer = true;
            script.onload = initMap;
            document.head.appendChild(script);
        } else if (isOpen && window.google) {
            initMap();
        }
    }, [isOpen]);

    const initMap = () => {
        if (!mapRef.current) return;

        const newMap = new window.google.maps.Map(mapRef.current, {
            center: defaultCenter,
            zoom: 13,
            disableDefaultUI: false,
        });

        const newMarker = new window.google.maps.Marker({
            position: position || defaultCenter,
            map: newMap,
            draggable: true
        });

        newMap.addListener('click', (e) => {
            const latLng = { lat: e.latLng.lat(), lng: e.latLng.lng() };
            setPosition(latLng);
            newMarker.setPosition(latLng);
        });

        newMarker.addListener('dragend', (e) => {
            setPosition({ lat: e.latLng.lat(), lng: e.latLng.lng() });
        });

        setMap(newMap);
        setMarker(newMarker);
    };

    useEffect(() => {
        if (isOpen && initialLocation && marker) {
            setPosition(initialLocation);
            marker.setPosition(initialLocation);
            map?.setCenter(initialLocation);
        }
    }, [isOpen, initialLocation, marker, map]);

    if (!isOpen) return null;

    const handleSave = () => {
        if (position) {
            onSave(position);
            onClose();
        } else {
            alert("Please click on the map to select a location.");
        }
    };

    return (
        <div className="msd-modal-overlay">
            <div className="msd-modal-content" style={{ width: '800px', maxWidth: '95%' }}>
                <div className="msd-modal-header">
                    <h3>Pick Location (Google Maps)</h3>
                    <button className="msd-close-btn" onClick={onClose}>×</button>
                </div>
                <div className="msd-modal-body" style={{ height: '500px', display: 'flex', flexDirection: 'column' }}>
                    <p style={{ marginBottom: '10px', fontSize: '0.9rem', color: '#666' }}>
                        Click on the map or drag the marker to set the location for the shoot.
                    </p>
                    <div ref={mapRef} style={{ flex: 1, border: '1px solid #ddd', borderRadius: '4px' }}></div>
                </div>
                <div className="msd-modal-footer">
                    <button className="msd-btn-secondary" onClick={onClose}>Cancel</button>
                    <button className="msd-btn-primary" onClick={handleSave}>Set Location</button>
                </div>
            </div>
        </div>
    );
};

export default LocationPickerModal;
