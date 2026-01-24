class NavigationSystem {
    constructor(map, layerManager, pathfinder, positioning) {
        this.map = map;
        this.layerManager = layerManager;
        this.pathfinder = pathfinder;
        this.positioning = positioning;
        
        this.currentRoute = null;
        this.currentInstructions = [];
        this.isNavigating = false;
        this.currentStepIndex = 0;
        
        this.callbacks = {
            onRouteCalculated: null,
            onNavigationStarted: null,
            onNavigationEnded: null,
            onStepChanged: null
        };

        if (this.positioning) {
            this.positioning.onPositionUpdate((position) => {
                this.handlePositionUpdate(position);
            });
        }
    }

    calculateRoute(startPoint, endPoint) {
        console.log('Calculating route...', startPoint, endPoint);

        let startNodeId, endNodeId;

        if (typeof startPoint === 'object' && 'longitude' in startPoint) {
            startNodeId = this.pathfinder.findNearestNode(
                startPoint.longitude,
                startPoint.latitude,
                startPoint.level,
                { maxDistance: 500, preferDestinations: false }
            );
        } else {
            startNodeId = startPoint;
        }

        if (typeof endPoint === 'object' && 'longitude' in endPoint) {
            endNodeId = this.pathfinder.findNearestNode(
                endPoint.longitude,
                endPoint.latitude,
                endPoint.level,
                { maxDistance: 500, preferDestinations: true }
            );
        } else {
            endNodeId = endPoint;
        }

        if (!startNodeId || !endNodeId) {
            console.error('Could not find start or end nodes', { startNodeId, endNodeId });
            return null;
        }

        const path = this.pathfinder.findPath(startNodeId, endNodeId);

        if (!path) {
            console.error('No path found');
            return null;
        }

        this.currentRoute = path;
        this.currentInstructions = path.instructions;
        this.currentStepIndex = 0;

        console.log('Route calculated:', path);

        this.visualizeRoute(path);

        if (this.callbacks.onRouteCalculated) {
            this.callbacks.onRouteCalculated(path);
        }

        return path;
    }

    visualizeRoute(path) {
        if (!path || !path.nodes || path.nodes.length === 0) {
            console.error('Invalid path for visualization');
            return;
        }

        const coordinates = path.nodes
            .filter(node => node && node.lon !== undefined && node.lat !== undefined)
            .map(node => [node.lon, node.lat]);

        if (coordinates.length < 2) {
            console.error('Not enough valid coordinates for route visualization');
            return;
        }

        const routeGeoJSON = {
            type: 'FeatureCollection',
            features: [{
                type: 'Feature',
                geometry: {
                    type: 'LineString',
                    coordinates: coordinates
                },
                properties: {
                    distance: path.distance
                }
            }]
        };

        this.layerManager.updateRoute(routeGeoJSON);

        try {
            const bounds = coordinates.reduce((bounds, coord) => {
                return bounds.extend(coord);
            }, new maplibregl.LngLatBounds(coordinates[0], coordinates[0]));

            this.map.fitBounds(bounds, {
                padding: 100,
                duration: 1000
            });
        } catch (error) {
            console.error('Error fitting bounds:', error);
        }
    }

    startNavigation() {
        if (!this.currentRoute) {
            console.error('No route available');
            return;
        }

        this.isNavigating = true;
        this.currentStepIndex = 0;

        if (this.callbacks.onNavigationStarted) {
            this.callbacks.onNavigationStarted(this.currentRoute);
        }

        console.log('Navigation started');
    }

    stopNavigation() {
        this.isNavigating = false;
        this.currentStepIndex = 0;

        if (this.callbacks.onNavigationEnded) {
            this.callbacks.onNavigationEnded();
        }

        console.log('Navigation stopped');
    }

    clearRoute() {
        this.currentRoute = null;
        this.currentInstructions = [];
        this.currentStepIndex = 0;
        this.isNavigating = false;

        this.layerManager.clearRoute();

        console.log('Route cleared');
    }

    handlePositionUpdate(position) {
        if (!this.isNavigating || !this.currentRoute) return;

        const userCoords = [position.longitude, position.latitude];
        const currentNode = this.currentRoute.nodes[this.currentStepIndex];
        const nextNode = this.currentRoute.nodes[this.currentStepIndex + 1];

        if (!currentNode || !nextNode) {
            this.stopNavigation();
            return;
        }

        const distanceToNext = this.calculateDistance(
            userCoords,
            [nextNode.lon, nextNode.lat]
        );

        if (distanceToNext < 20) {
            this.currentStepIndex++;

            if (this.callbacks.onStepChanged) {
                this.callbacks.onStepChanged(this.currentStepIndex, nextNode);
            }

            if (this.currentStepIndex >= this.currentRoute.nodes.length - 1) {
                console.log('Destination reached!');
                this.stopNavigation();
            }
        }
    }

    calculateDistance(coord1, coord2) {
        const R = 6371e3;
        const φ1 = coord1[1] * Math.PI / 180;
        const φ2 = coord2[1] * Math.PI / 180;
        const Δφ = (coord2[1] - coord1[1]) * Math.PI / 180;
        const Δλ = (coord2[0] - coord1[0]) * Math.PI / 180;

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                  Math.cos(φ1) * Math.cos(φ2) *
                  Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c;
    }

    onRouteCalculated(callback) {
        this.callbacks.onRouteCalculated = callback;
    }

    onNavigationStarted(callback) {
        this.callbacks.onNavigationStarted = callback;
    }

    onNavigationEnded(callback) {
        this.callbacks.onNavigationEnded = callback;
    }

    onStepChanged(callback) {
        this.callbacks.onStepChanged = callback;
    }
}