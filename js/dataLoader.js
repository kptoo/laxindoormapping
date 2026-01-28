class DataLoader {
    constructor() {
        this.data = {
            features: {},
            corridors: {},
            connectors: null,
            loaded: false
        };
        this.basePath = CONFIG.dataPath;
    }

    async loadAll() {
        console.log('Loading all terminal data...');
        
        try {
            await Promise.all([
                this.loadFeatures(),
                this.loadCorridors(),
                this.loadConnectors()
            ]);
            
            this.data.loaded = true;
            console.log('All data loaded successfully');
            return this.data;
        } catch (error) {
            console.error('Error loading data:', error);
            throw error;
        }
    }

    async loadFeatures() {
        const featureTypes = ['building', 'gates', 'shops', 'food_beverage', 
                            'restrooms', 'services', 'service', 'vertical_circulation'];
        
        for (const terminal of CONFIG.terminals) {
            this.data.features[terminal.id] = {};
            
            for (const type of featureTypes) {
                try {
                    const url = `${this.basePath}/${terminal.id}/${terminal.prefix}_${type}.geojson`;
                    const response = await fetch(url);
                    
                    if (response.ok) {
                        const geojson = await response.json();
                        this.data.features[terminal.id][type] = geojson;
                        console.log(`Loaded ${terminal.id}/${type}: ${geojson.features?.length || 0} features`);
                    } else {
                        console.warn(`Missing ${terminal.id}/${type}`);
                        this.data.features[terminal.id][type] = { type: 'FeatureCollection', features: [] };
                    }
                } catch (error) {
                    console.warn(`Error loading ${terminal.id}/${type}:`, error);
                    this.data.features[terminal.id][type] = { type: 'FeatureCollection', features: [] };
                }
            }
        }
    }

    async loadCorridors() {
        for (const terminal of CONFIG.terminals) {
            try {
                const url = `${this.basePath}/${terminal.id}/${terminal.prefix}_corridors.geojson`;
                const response = await fetch(url);
                
                if (response.ok) {
                    const geojson = await response.json();
                    this.data.corridors[terminal.id] = geojson;
                    console.log(`Loaded ${terminal.id}/corridors: ${geojson.features?.length || 0} features`);
                } else {
                    console.warn(`Missing corridors for ${terminal.id}`);
                    this.data.corridors[terminal.id] = { type: 'FeatureCollection', features: [] };
                }
            } catch (error) {
                console.warn(`Error loading corridors for ${terminal.id}:`, error);
                this.data.corridors[terminal.id] = { type: 'FeatureCollection', features: [] };
            }
        }
    }

    async loadConnectors() {
        console.log('Connectors are loaded as part of service points in each terminal');
        this.data.connectors = { type: 'FeatureCollection', features: [] };
    }

    getFeatures(terminal, type, level = null) {
        const terminalData = this.data.features[terminal];
        if (!terminalData || !terminalData[type]) {
            return { type: 'FeatureCollection', features: [] };
        }

        const features = terminalData[type];
        
        if (level === null || level === 'all') {
            return features;
        }

        return {
            type: 'FeatureCollection',
            features: features.features.filter(f => {
                const fLevel = f.properties.level || f.properties.Level;
                if (fLevel === null || fLevel === undefined) return true;
                return parseInt(fLevel) === parseInt(level);
            })
        };
    }

    getCorridors(terminal, level = null) {
        if (!this.data.corridors[terminal]) {
            return { type: 'FeatureCollection', features: [] };
        }

        const corridors = this.data.corridors[terminal];
        
        if (level === null || level === 'all') {
            return corridors;
        }

        return {
            type: 'FeatureCollection',
            features: corridors.features.filter(f => {
                const fLevel = f.properties.level || f.properties.Level;
                if (fLevel === null || fLevel === undefined) return true;
                return parseInt(fLevel) === parseInt(level);
            })
        };
    }

    getConnectors() {
        return this.data.connectors || { type: 'FeatureCollection', features: [] };
    }

    // NEW METHOD: Get available levels for a specific terminal
    getAvailableLevels(terminalId) {
        const levels = new Set();
        
        if (terminalId === 'all') {
            // Get all levels from all terminals
            CONFIG.terminals.forEach(terminal => {
                const terminalLevels = this.getAvailableLevels(terminal.id);
                terminalLevels.forEach(level => levels.add(level));
            });
        } else {
            // Get levels from specific terminal
            const terminalData = this.data.features[terminalId];
            
            if (terminalData) {
                // Check all feature types
                Object.values(terminalData).forEach(featureCollection => {
                    if (featureCollection && featureCollection.features) {
                        featureCollection.features.forEach(feature => {
                            const level = feature.properties.level || feature.properties.Level;
                            if (level !== null && level !== undefined) {
                                levels.add(parseInt(level));
                            }
                        });
                    }
                });
            }
            
            // Also check corridors
            const corridorData = this.data.corridors[terminalId];
            if (corridorData && corridorData.features) {
                corridorData.features.forEach(feature => {
                    const level = feature.properties.level || feature.properties.Level;
                    if (level !== null && level !== undefined) {
                        levels.add(parseInt(level));
                    }
                });
            }
        }
        
        // Convert to sorted array
        return Array.from(levels).sort((a, b) => a - b);
    }

    getAllFeaturesForSearch() {
        const allFeatures = [];
        const searchableTypes = ['gates', 'shops', 'food_beverage', 'restrooms', 
                                'services', 'service', 'vertical_circulation'];

        for (const terminal of CONFIG.terminals) {
            for (const type of searchableTypes) {
                const features = this.data.features[terminal.id]?.[type];
                if (features && features.features) {
                    features.features.forEach(feature => {
                        allFeatures.push({
                            ...feature,
                            properties: {
                                ...feature.properties,
                                terminal: terminal.id,
                                terminalName: terminal.name,
                                featureType: type
                            }
                        });
                    });
                }
            }
        }

        return allFeatures;
    }

    getAllNavigablePoints() {
        const points = [];
        const navigableTypes = ['gates', 'shops', 'food_beverage', 'restrooms', 
                               'services', 'service', 'vertical_circulation'];

        for (const terminal of CONFIG.terminals) {
            for (const type of navigableTypes) {
                const features = this.data.features[terminal.id]?.[type];
                if (features && features.features) {
                    features.features.forEach((feature, index) => {
                        if (feature.geometry && feature.geometry.coordinates) {
                            const coords = this.getFeatureCenter(feature);
                            const props = feature.properties;
                            
                            let name = props.name || props.Name;
                            if (!name && props.gate_num) {
                                name = `Gate ${props.gate_num}`;
                            }
                            if (!name) {
                                name = `${type.replace('_', ' ')} ${index + 1}`;
                            }
                            
                            const levelValue = props.level || props.Level;
                            const level = levelValue ? parseInt(levelValue) : 1;

                            points.push({
                                id: `${terminal.id}_${type}_${index}`,
                                name: name,
                                type: type,
                                terminal: terminal.id,
                                terminalName: terminal.name,
                                level: level,
                                coordinates: coords,
                                feature: feature,
                                serviceType: props.type
                            });
                        }
                    });
                }
            }
        }

        return points;
    }

    getFeatureCenter(feature) {
        if (feature.geometry.type === 'Point') {
            return feature.geometry.coordinates;
        } else if (feature.geometry.type === 'Polygon') {
            const coords = feature.geometry.coordinates[0];
            const sumX = coords.reduce((sum, coord) => sum + coord[0], 0);
            const sumY = coords.reduce((sum, coord) => sum + coord[1], 0);
            return [sumX / coords.length, sumY / coords.length];
        } else if (feature.geometry.type === 'MultiPolygon') {
            const firstPolygon = feature.geometry.coordinates[0][0];
            const sumX = firstPolygon.reduce((sum, coord) => sum + coord[0], 0);
            const sumY = firstPolygon.reduce((sum, coord) => sum + coord[1], 0);
            return [sumX / firstPolygon.length, sumY / firstPolygon.length];
        }
        return [0, 0];
    }
}