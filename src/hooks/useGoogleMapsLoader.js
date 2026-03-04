import { useEffect, useMemo, useState } from 'react';

export default function useGoogleMapsLoader({ apiKey, libraries = [], id = 'google-map-script' }) {
    const [isLoaded, setIsLoaded] = useState(
        typeof window !== 'undefined' && !!window.google?.maps
    );

    const librariesParam = useMemo(() => libraries.join(','), [libraries]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (window.google?.maps) {
            setIsLoaded(true);
            return;
        }

        const existingScript = document.getElementById(id);
        if (existingScript) {
            const onLoad = () => setIsLoaded(true);
            existingScript.addEventListener('load', onLoad);
            return () => existingScript.removeEventListener('load', onLoad);
        }

        const script = document.createElement('script');
        script.id = id;
        script.async = true;
        script.defer = true;
        script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=${encodeURIComponent(librariesParam)}`;
        script.onload = () => setIsLoaded(true);
        document.head.appendChild(script);
    }, [apiKey, id, librariesParam]);

    return { isLoaded };
}
