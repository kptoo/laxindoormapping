class LayerManager {
    constructor(map, dataLoader) {
        this.map = map;
        this.dataLoader = dataLoader;
        this.currentTerminal = 'all';
        this.currentLevel = 'all';
        this.visibleFeatures = new Set(Object.keys(CONFIG.featureTypes));
        this.iconsLoaded = false;
        this.app = null;
    }

    async initialize() {
        console.log('LayerManager: Starting initialization...');
        await this.waitForMapStyle();
        await this.loadAllIcons();
        this.addAllLayers();
        this.setupInteractions();
        console.log('LayerManager: Initialization complete');
    }

    async waitForMapStyle() {
        return new Promise((resolve) => {
            if (this.map.isStyleLoaded()) {
                resolve();
            } else {
                this.map.once('styledata', resolve);
                setTimeout(resolve, 1000);
            }
        });
    }

    async loadAllIcons() {
        const iconNames = Object.values(ICON_CONFIG).map(cfg => cfg.icon);
        const uniqueIcons = [...new Set(iconNames)];
        
        console.log(`Loading ${uniqueIcons.length} unique icons...`);
        
        const targetSize = CONFIG.icons.targetSize;
        
        const promises = uniqueIcons.map(iconName => {
            return new Promise((resolve) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = targetSize;
                    canvas.height = targetSize;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, targetSize, targetSize);
                    const imageData = ctx.getImageData(0, 0, targetSize, targetSize);
                    
                    if (!this.map.hasImage(iconName)) {
                        this.map.addImage(iconName, imageData);
                    }
                    resolve();
                };
                img.onerror = () => {
                    console.warn(`Failed to load icon: ${iconName}`);
                    resolve();
                };
                img.src = `${ICON_BASE_PATH}${iconName}`;
            });
        });
        
        await Promise.all(promises);
        this.iconsLoaded = true;
    }

    addAllLayers() {
        for (const terminal of CONFIG.terminals) {
            this.addTerminalLayers(terminal.id);
        }
        this.addRouteLayer();
        this.addUserLocationLayer();
    }

    addTerminalLayers(terminalId) {
        this.addCorridorLayer(terminalId);

        const featureTypes = ['building', 'gates', 'shops', 'food_beverage', 
                            'restrooms', 'services', 'service', 'vertical_circulation'];
        
        for (const type of featureTypes) {
            this.addFeatureLayer(terminalId, type);
        }
    }

    addCorridorLayer(terminalId) {
        const layerId = `corridors-${terminalId}`;
        const data = this.dataLoader.getCorridors(terminalId);

        if (this.map.getSource(layerId)) return;

        try {
            if (!this.map.getStyle()) return;

            this.map.addSource(layerId, {
                type: 'geojson',
                data: data
            });

            this.map.addLayer({
                id: layerId,
                type: 'line',
                source: layerId,
                paint: {
                    'line-color': CONFIG.featureTypes.corridors.color,
                    'line-width': CONFIG.featureTypes.corridors.width,
                    'line-opacity': CONFIG.featureTypes.corridors.opacity
                }
            });
        } catch (error) {
            console.error(`Error adding corridor layer ${layerId}:`, error);
        }
    }

    addFeatureLayer(terminalId, type) {
        const layerId = `${type}-${terminalId}`;
        const data = this.dataLoader.getFeatures(terminalId, type);

        if (this.map.getSource(layerId)) return;

        try {
            if (!this.map.getStyle()) return;

            this.map.addSource(layerId, {
                type: 'geojson',
                data: data
            });

            const config = CONFIG.featureTypes[type];

            if (data.features.length > 0 && data.features[0].geometry.type.includes('Polygon')) {
                this.map.addLayer({
                    id: `${layerId}-fill`,
                    type: 'fill',
                    source: layerId,
                    paint: {
                        'fill-color': config.color,
                        'fill-opacity': config.opacity
                    }
                });

                this.map.addLayer({
                    id: `${layerId}-outline`,
                    type: 'line',
                    source: layerId,
                    paint: {
                        'line-color': config.outlineColor,
                        'line-width': 1
                    }
                });
            }

            if (type !== 'building' && config.icon && this.iconsLoaded) {
                this.map.addLayer({
                    id: `${layerId}-label`,
                    type: 'symbol',
                    source: layerId,
                    layout: {
                        'text-field': ['coalesce', ['get', 'name'], ['get', 'Name'], ''],
                        'text-font': ['Open Sans Regular'],
                        'text-size': 11,
                        'text-anchor': 'top',
                        'text-offset': [0, 1.8],
                        'symbol-placement': 'point',
                        'text-max-width': 8
                    },
                    paint: {
                        'text-color': '#1f2937',
                        'text-halo-color': '#ffffff',
                        'text-halo-width': 1.5
                    }
                });

                this.map.addLayer({
                    id: `${layerId}-icon`,
                    type: 'symbol',
                    source: layerId,
                    layout: {
                        'icon-image': this.getIconExpression(type),
                        'icon-size': CONFIG.icons.baseScale,
                        'icon-allow-overlap': true,
                        'icon-ignore-placement': false,
                        'symbol-placement': 'point'
                    }
                });
            }
        } catch (error) {
            console.error(`Error adding feature layer ${layerId}:`, error);
        }
    }

    getIconExpression(featureType) {
        if (featureType === 'restrooms') {
            return [
                'match',
                ['downcase', ['coalesce', ['get', 'type'], '']],
                'men', ICON_CONFIG.men.icon,
                'male', ICON_CONFIG.men.icon,
                'women', ICON_CONFIG.women.icon,
                'female', ICON_CONFIG.women.icon,
                ICON_CONFIG.restrooms.icon
            ];
        }
        
        if (featureType === 'vertical_circulation') {
            return [
                'case',
                ['in', 'elevator', ['downcase', ['coalesce', ['get', 'name'], '']]],
                ICON_CONFIG.elevator.icon,
                ['in', 'stair', ['downcase', ['coalesce', ['get', 'name'], '']]],
                ICON_CONFIG.stairs.icon,
                ['in', 'escalator', ['downcase', ['coalesce', ['get', 'name'], '']]],
                ICON_CONFIG.escalator.icon,
                ICON_CONFIG.vertical_circulation.icon
            ];
        }
        
        if (featureType === 'service') {
            return [
                'match',
                ['downcase', ['coalesce', ['get', 'type'], '']],
                'shuttle', ICON_CONFIG.shuttle.icon,
                'bus', ICON_CONFIG.bus.icon,
                'parking', ICON_CONFIG.parking.icon,
                'atm', ICON_CONFIG.atm.icon,
                'charging', ICON_CONFIG.charging.icon,
                'checkin', ICON_CONFIG.checkin.icon,
                'water', ICON_CONFIG.water.icon,
                'security', ICON_CONFIG.security.icon,
                'firstaid', ICON_CONFIG.firstaid.icon,
                'first aid', ICON_CONFIG.firstaid.icon,
                'faith', ICON_CONFIG.faith.icon,
                'wellness', ICON_CONFIG.wellness.icon,
                ICON_CONFIG.service.icon
            ];
        }
        
        return ICON_CONFIG[featureType]?.icon || ICON_CONFIG.service.icon;
    }

    addRouteLayer() {
        if (this.map.getSource('route')) return;

        try {
            this.map.addSource('route', {
                type: 'geojson',
                data: { type: 'FeatureCollection', features: [] }
            });

            this.map.addLayer({
                id: 'route-line',
                type: 'line',
                source: 'route',
                paint: {
                    'line-color': CONFIG.navigation.routeColor,
                    'line-width': CONFIG.navigation.routeWidth,
                    'line-opacity': CONFIG.navigation.routeOpacity
                }
            });

            this.map.addLayer({
                id: 'route-arrows',
                type: 'symbol',
                source: 'route',
                layout: {
                    'symbol-placement': 'line',
                    'text-field': '▶',
                    'text-size': 16,
                    'symbol-spacing': 50,
                    'text-keep-upright': false
                },
                paint: {
                    'text-color': CONFIG.navigation.routeColor
                }
            });
        } catch (error) {
            console.error('Error adding route layer:', error);
        }
    }

    addUserLocationLayer() {
        if (this.map.getSource('user-location')) return;

        try {
            this.map.addSource('user-location', {
                type: 'geojson',
                data: { type: 'FeatureCollection', features: [] }
            });

            this.map.addLayer({
                id: 'user-location-accuracy',
                type: 'circle',
                source: 'user-location',
                filter: ['==', ['get', 'type'], 'accuracy'],
                paint: {
                    'circle-radius': ['get', 'radius'],
                    'circle-color': '#2563eb',
                    'circle-opacity': 0.1,
                    'circle-stroke-width': 1,
                    'circle-stroke-color': '#2563eb',
                    'circle-stroke-opacity': 0.3
                }
            });

            this.map.addLayer({
                id: 'user-location-dot',
                type: 'circle',
                source: 'user-location',
                filter: ['==', ['get', 'type'], 'position'],
                paint: {
                    'circle-radius': 8,
                    'circle-color': '#2563eb',
                    'circle-stroke-width': 3,
                    'circle-stroke-color': '#ffffff'
                }
            });

            this.map.addLayer({
                id: 'user-location-pulse',
                type: 'circle',
                source: 'user-location',
                filter: ['==', ['get', 'type'], 'position'],
                paint: {
                    'circle-radius': 12,
                    'circle-color': '#2563eb',
                    'circle-opacity': 0.4
                }
            });
        } catch (error) {
            console.error('Error adding user location layer:', error);
        }
    }

    updateRoute(routeGeoJSON) {
        if (this.map.getSource('route')) {
            this.map.getSource('route').setData(routeGeoJSON);
        }
    }

    updateUserLocation(longitude, latitude, accuracy = null, heading = null) {
        const features = [];

        if (accuracy && CONFIG.positioning.showAccuracyCircle) {
            const radiusInMeters = accuracy;
            const radiusInPixels = this.metersToPixels(radiusInMeters, latitude, this.map.getZoom());
            
            features.push({
                type: 'Feature',
                properties: { type: 'accuracy', radius: radiusInPixels },
                geometry: { type: 'Point', coordinates: [longitude, latitude] }
            });
        }

        features.push({
            type: 'Feature',
            properties: { type: 'position', heading: heading },
            geometry: { type: 'Point', coordinates: [longitude, latitude] }
        });

        if (this.map.getSource('user-location')) {
            this.map.getSource('user-location').setData({
                type: 'FeatureCollection',
                features: features
            });
        }
    }

    metersToPixels(meters, latitude, zoom) {
        const earthCircumference = 40075017;
        const latitudeRadians = latitude * Math.PI / 180;
        const metersPerPixel = earthCircumference * Math.cos(latitudeRadians) / Math.pow(2, zoom + 8);
        return meters / metersPerPixel;
    }

    clearUserLocation() {
        if (this.map.getSource('user-location')) {
            this.map.getSource('user-location').setData({
                type: 'FeatureCollection',
                features: []
            });
        }
    }

    clearRoute() {
        if (this.map.getSource('route')) {
            this.map.getSource('route').setData({
                type: 'FeatureCollection',
                features: []
            });
        }
    }

    filterByTerminal(terminalId) {
        console.log(`Filtering by terminal: ${terminalId}`);
        this.currentTerminal = terminalId;
        this.updateLayerVisibility();
    }

    filterByLevel(level) {
        console.log(`Filtering by level: ${level}`);
        this.currentLevel = level;
        this.updateLayerVisibility();
    }

    toggleFeature(featureType, visible) {
        if (visible) {
            this.visibleFeatures.add(featureType);
        } else {
            this.visibleFeatures.delete(featureType);
        }
        this.updateLayerVisibility();
    }

    updateLayerVisibility() {
        console.log(`Updating visibility - Terminal: ${this.currentTerminal}, Level: ${this.currentLevel}`);
        
        for (const terminal of CONFIG.terminals) {
            const terminalVisible = this.currentTerminal === 'all' || this.currentTerminal === terminal.id;

            // Handle corridor layers with level filtering
            const corridorLayerId = `corridors-${terminal.id}`;
            if (this.map.getLayer(corridorLayerId)) {
                try {
                    if (terminalVisible) {
                        // Update corridor data with level filtering
                        const corridorData = this.dataLoader.getCorridors(terminal.id, this.currentLevel);
                        this.map.getSource(corridorLayerId).setData(corridorData);
                        this.map.setLayoutProperty(corridorLayerId, 'visibility', 'visible');
                    } else {
                        this.map.setLayoutProperty(corridorLayerId, 'visibility', 'none');
                    }
                } catch (error) {
                    console.warn(`Could not update corridors for ${corridorLayerId}`);
                }
            }

            // Handle feature layers with level filtering
            for (const type of Object.keys(CONFIG.featureTypes)) {
                if (type === 'corridors' || type === 'connectors') continue;

                const featureVisible = this.visibleFeatures.has(type);
                const layerId = `${type}-${terminal.id}`;

                // Update the source data with filtered features
                if (this.map.getSource(layerId)) {
                    try {
                        if (terminalVisible && featureVisible) {
                            // Get filtered data for this level
                            const filteredData = this.dataLoader.getFeatures(terminal.id, type, this.currentLevel);
                            this.map.getSource(layerId).setData(filteredData);
                        } else {
                            // Set empty data if not visible
                            this.map.getSource(layerId).setData({ type: 'FeatureCollection', features: [] });
                        }
                    } catch (error) {
                        console.warn(`Could not update source for ${layerId}`);
                    }
                }

                // Update layer visibility
                ['', '-fill', '-outline', '-label', '-icon'].forEach(suffix => {
                    const fullLayerId = layerId + suffix;
                    if (this.map.getLayer(fullLayerId)) {
                        try {
                            this.map.setLayoutProperty(fullLayerId, 'visibility', 
                                terminalVisible && featureVisible ? 'visible' : 'none');
                        } catch (error) {
                            console.warn(`Could not set visibility for ${fullLayerId}`);
                        }
                    }
                });
            }
        }
    }

    setupInteractions() {
        const clickableLayers = [];
        
        for (const terminal of CONFIG.terminals) {
            for (const type of Object.keys(CONFIG.featureTypes)) {
                if (type === 'building' || type === 'corridors') continue;
                clickableLayers.push(`${type}-${terminal.id}-fill`);
                clickableLayers.push(`${type}-${terminal.id}-icon`);
            }
        }

        clickableLayers.forEach(layerId => {
            if (this.map.getLayer(layerId)) {
                this.map.on('click', layerId, (e) => {
                    this.showPopup(e);
                });

                this.map.on('mouseenter', layerId, () => {
                    this.map.getCanvas().style.cursor = 'pointer';
                });

                this.map.on('mouseleave', layerId, () => {
                    this.map.getCanvas().style.cursor = '';
                });
            }
        });
    }

    showPopup(e) {
        const feature = e.features[0];
        const props = feature.properties;
        const geometry = feature.geometry;

        let content = `<div class="popup-content">`;
        const name = props.name || props.Name || 'Feature';
        content += `<div class="popup-title">${name}</div>`;
        
        if (props.type && props.type !== name) {
            const typeLabel = this.formatLabel(props.type);
            content += `<div class="popup-info"><strong>Type:</strong> ${typeLabel}</div>`;
        }
        
        if (props.category && props.category !== name) {
            content += `<div class="popup-info"><strong>Category:</strong> ${props.category}</div>`;
        }
        
        if (props.gate_num) {
            content += `<div class="popup-info"><strong>Gate:</strong> ${props.gate_num}</div>`;
        }
        
        if (props.shop_type) {
            content += `<div class="popup-info"><strong>Shop Type:</strong> ${props.shop_type}</div>`;
        }
        
        if (props.fb_type) {
            content += `<div class="popup-info"><strong>F&B Type:</strong> ${props.fb_type}</div>`;
        }
        
        let terminal = props.terminal;
        if (!terminal) {
            const layerId = e.features[0].layer?.id || '';
            const match = layerId.match(/-(Terminal_\w+)/);
            if (match) {
                terminal = match[1];
            }
        }
        
        if (terminal) {
            const terminalName = this.getTerminalName(terminal);
            content += `<div class="popup-info"><strong>Terminal:</strong> ${terminalName}</div>`;
        }
        
        const level = props.level || props.Level || 1;
        content += `<div class="popup-info"><strong>Level:</strong> ${level}</div>`;
        
        content += `<button class="popup-navigate-btn" data-popup-navigate="true">
            <span>🧭</span> Navigate Here
        </button>`;
        
        content += `</div>`;

        let coordinates;
        if (geometry.type === 'Point') {
            coordinates = geometry.coordinates.slice();
        } else if (geometry.type === 'Polygon') {
            const coords = geometry.coordinates[0];
            const sumX = coords.reduce((sum, coord) => sum + coord[0], 0);
            const sumY = coords.reduce((sum, coord) => sum + coord[1], 0);
            coordinates = [sumX / coords.length, sumY / coords.length];
        } else if (geometry.type === 'MultiPolygon') {
            const firstPolygon = geometry.coordinates[0][0];
            const sumX = firstPolygon.reduce((sum, coord) => sum + coord[0], 0);
            const sumY = firstPolygon.reduce((sum, coord) => sum + coord[1], 0);
            coordinates = [sumX / firstPolygon.length, sumY / firstPolygon.length];
        } else {
            coordinates = e.lngLat.toArray();
        }

        const popup = new maplibregl.Popup({
            closeButton: true,
            closeOnClick: true,
            maxWidth: '300px'
        })
            .setLngLat(coordinates)
            .setHTML(content)
            .addTo(this.map);

        setTimeout(() => {
            const navigateBtn = document.querySelector('[data-popup-navigate="true"]');
            if (navigateBtn) {
                navigateBtn.addEventListener('click', () => {
                    this.navigateToLocation(coordinates, level, name, terminal);
                    popup.remove();
                });
            }
        }, 10);
    }

    navigateToLocation(coordinates, level, name, terminal) {
        if (!this.app) {
            console.error('App reference not set in LayerManager');
            alert('Navigation system not ready');
            return;
        }

        const position = this.app.positioning?.getCurrentPosition();
        
        if (!position) {
            const useManual = confirm(
                `No current location detected.\n\n` +
                `Click OK to set your location on the map, or Cancel to select start point from the list.`
            );
            
            if (useManual) {
                this.app.positioning.enableManualMode();
                alert('Click on the map to set your current location, then try navigating again.');
                return;
            } else {
                this.preselectDestination(coordinates, level, name, terminal);
                return;
            }
        }

        console.log(`Finding route to: ${name} at [${coordinates[0]}, ${coordinates[1]}], Level ${level}, Terminal ${terminal}`);
        
        const endNodeId = this.app.pathfinder.findNearestNode(
            coordinates[0],
            coordinates[1],
            level,
            { maxDistance: 500, preferDestinations: true }
        );

        if (endNodeId === null || endNodeId === undefined) {
            console.error(`Could not find node for: ${name}`);
            alert(`Could not find routing node for "${name}". This location may not be in the routing network yet.`);
            return;
        }

        const startNodeId = this.app.pathfinder.findNearestNode(
            position.longitude,
            position.latitude,
            position.level,
            { maxDistance: 500, preferDestinations: false }
        );

        if (startNodeId === null || startNodeId === undefined) {
            alert('No routing node found near your current location.');
            return;
        }

        const route = this.app.navigation.calculateRoute(startNodeId, endNodeId);

        if (route) {
            this.app.uiController.showNavigationInstructions(route);
            this.app.navigation.startNavigation();
            console.log(`Navigation started to: ${name}`);
        } else {
            alert(`No route found to "${name}".`);
        }
    }

    preselectDestination(coordinates, level, name, terminal) {
        const endSelect = document.getElementById('end-select');
        
        if (!endSelect) return;

        let foundPoint = null;
        for (const point of this.app.navigationPoints) {
            const coordMatch = Math.abs(point.coordinates[0] - coordinates[0]) < 0.00001 &&
                              Math.abs(point.coordinates[1] - coordinates[1]) < 0.00001;
            
            const nameMatch = point.name === name;
            
            if (coordMatch || (nameMatch && point.level === level)) {
                foundPoint = point;
                break;
            }
        }

        if (foundPoint) {
            endSelect.value = foundPoint.selectId;
            alert(`Destination "${name}" selected. Please choose your starting point and click "Find Route".`);
        } else {
            alert(`Please select "${name}" as your destination from the navigation panel.`);
        }

        const navSection = document.querySelector('.navigation-controls');
        if (navSection) {
            navSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }

    formatLabel(str) {
        if (!str) return '';
        return str.replace(/_/g, ' ')
                  .split(' ')
                  .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                  .join(' ');
    }

    getTerminalName(terminalId) {
        const terminal = CONFIG.terminals.find(t => t.id === terminalId);
        return terminal ? terminal.name : terminalId;
    }
}