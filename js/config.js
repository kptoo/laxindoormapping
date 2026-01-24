const CONFIG = {
    map: {
        container: 'map',
        style: {
            version: 8,
            sources: {
                'osm-tiles': {
                    type: 'raster',
                    tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
                    tileSize: 256,
                    attribution: '© OpenStreetMap contributors'
                }
            },
            layers: [{
                id: 'osm-layer',
                type: 'raster',
                source: 'osm-tiles',
                minzoom: 0,
                maxzoom: 19
            }]
        },
        center: [-118.40897, 33.94254],
        zoom: 15,
        pitch: 45,
        bearing: 0,
        minZoom: 13,
        maxZoom: 20
    },

    terminals: [
        { id: 'Terminal_1', name: 'Terminal 1', prefix: 'T1', color: '#ef4444' },
        { id: 'Terminal_2', name: 'Terminal 2', prefix: 'T2', color: '#f97316' },
        { id: 'Terminal_3', name: 'Terminal 3', prefix: 'T3', color: '#f59e0b' },
        { id: 'Terminal_4', name: 'Terminal 4', prefix: 'T4', color: '#84cc16' },
        { id: 'Terminal_6', name: 'Terminal 6', prefix: 'T6', color: '#06b6d4' },
        { id: 'Terminal_7', name: 'Terminal 7', prefix: 'T7', color: '#3b82f6' },
        { id: 'Terminal_8', name: 'Terminal 8', prefix: 'T8', color: '#8b5cf6' },
        { id: 'Terminal_B', name: 'Terminal B', prefix: 'TB', color: '#ec4899' },
        { id: 'Terminal_Regional', name: 'Regional Terminal', prefix: 'Reg', color: '#6366f1' },
        { id: 'Terminal_Wgates', name: 'West Gates', prefix: 'W', color: '#14b8a6' }
    ],

    levels: [1, 2, 3],

    featureTypes: {
        building: { color: '#d4d4d4', opacity: 0.7, outlineColor: '#9ca3af', label: 'Building' },
        gates: { color: '#ef4444', opacity: 0.9, outlineColor: '#991b1b', label: 'Gates', icon: true },
        shops: { color: '#06b6d4', opacity: 0.85, outlineColor: '#0e7490', label: 'Shops', icon: true },
        food_beverage: { color: '#f97316', opacity: 0.85, outlineColor: '#c2410c', label: 'Food & Beverage', icon: true },
        restrooms: { color: '#a78bfa', opacity: 0.85, outlineColor: '#6d28d9', label: 'Restrooms', icon: true },
        services: { color: '#10b981', opacity: 0.85, outlineColor: '#047857', label: 'Services', icon: true },
        service: { color: '#8b5cf6', opacity: 0.85, outlineColor: '#6d28d9', label: 'Service Points', icon: true },
        vertical_circulation: { color: '#f59e0b', opacity: 0.85, outlineColor: '#d97706', label: 'Elevators/Stairs', icon: true },
        corridors: { color: '#94a3b8', opacity: 0.5, outlineColor: '#64748b', label: 'Corridors', width: 3 },
        connectors: { color: '#22c55e', opacity: 0.8, outlineColor: '#16a34a', label: 'Connectors', icon: true, width: 4 }
    },

    positioning: {
        enabled: true,
        highAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
        updateInterval: 1000,
        minAccuracy: 50,
        smoothing: true,
        smoothingFactor: 0.3,
        showAccuracyCircle: true,
        autoCenter: true,
        simulationMode: false,
        wifiEnabled: true,
        beaconEnabled: false
    },

    navigation: {
        routeColor: '#2563eb',
        routeWidth: 4,
        routeOpacity: 0.8,
        waypointColor: '#10b981',
        destinationColor: '#ef4444',
        animateRoute: true,
        snapToRoute: true,
        snapDistance: 10,
        turnByTurnEnabled: true,
        voiceGuidance: false
    },

    icons: {
        targetSize: 48,
        baseScale: 0.2
    },

    dataPath: 'data',
    routingGraphPath: 'routing_graph.json'  // Make sure this points to your graph file
};