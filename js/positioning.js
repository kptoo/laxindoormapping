class PositioningSystem {
    constructor(map, layerManager) {
        this.map = map;
        this.layerManager = layerManager;
        this.config = CONFIG.positioning;
        this.currentPosition = null;
        this.watchId = null;
        this.updateTimer = null;
        this.positionHistory = [];
        this.maxHistorySize = 5;
        this.callbacks = { onPositionUpdate: null, onError: null };
        this.manualMode = false;
        this.simulationMode = this.config.simulationMode;
        this.simulationPath = null;
        this.simulationIndex = 0;
    }

    start() {
        if (!this.config.enabled) return;
        if (this.simulationMode) {
            this.startSimulation();
            return;
        }
        if (!navigator.geolocation) {
            console.error('Geolocation not supported');
            if (this.callbacks.onError) this.callbacks.onError('Geolocation not supported');
            return;
        }

        const options = {
            enableHighAccuracy: this.config.highAccuracy,
            timeout: this.config.timeout,
            maximumAge: this.config.maximumAge
        };

        this.watchId = navigator.geolocation.watchPosition(
            (position) => this.handlePosition(position),
            (error) => this.handleError(error),
            options
        );
    }

    stop() {
        if (this.watchId) {
            navigator.geolocation.clearWatch(this.watchId);
            this.watchId = null;
        }
        if (this.updateTimer) {
            clearInterval(this.updateTimer);
            this.updateTimer = null;
        }
        this.layerManager.clearUserLocation();
    }

    handlePosition(position) {
        const newPos = {
            longitude: position.coords.longitude,
            latitude: position.coords.latitude,
            accuracy: position.coords.accuracy,
            heading: position.coords.heading,
            speed: position.coords.speed,
            altitude: position.coords.altitude,
            timestamp: position.timestamp,
            level: this.estimateLevel(position)
        };

        if (this.config.smoothing) {
            newPos.longitude = this.smoothValue('longitude', newPos.longitude);
            newPos.latitude = this.smoothValue('latitude', newPos.latitude);
        }

        this.currentPosition = newPos;
        this.positionHistory.push(newPos);
        
        if (this.positionHistory.length > this.maxHistorySize) {
            this.positionHistory.shift();
        }

        this.updateVisualization();

        if (this.callbacks.onPositionUpdate) {
            this.callbacks.onPositionUpdate(this.currentPosition);
        }
    }

    handleError(error) {
        console.error('Positioning error:', error.message);
        if (this.callbacks.onError) this.callbacks.onError(error.message);
    }

    smoothValue(key, newValue) {
        if (this.positionHistory.length === 0) return newValue;
        const lastPos = this.positionHistory[this.positionHistory.length - 1];
        const oldValue = lastPos[key];
        const factor = this.config.smoothingFactor;
        return oldValue + (newValue - oldValue) * factor;
    }

    estimateLevel(position) {
        if (position.coords.altitude === null) return 1;
        const altitude = position.coords.altitude;
        const groundLevel = 38;
        if (altitude < groundLevel + 3) return 1;
        if (altitude < groundLevel + 6) return 2;
        return 3;
    }

    updateVisualization() {
        if (!this.currentPosition) return;

        this.layerManager.updateUserLocation(
            this.currentPosition.longitude,
            this.currentPosition.latitude,
            this.currentPosition.accuracy,
            this.currentPosition.heading
        );

        if (this.config.autoCenter) {
            this.map.easeTo({
                center: [this.currentPosition.longitude, this.currentPosition.latitude],
                duration: 1000
            });
        }
    }

    enableManualMode() {
        this.stop();
        this.manualMode = true;
        this.map.getCanvas().style.cursor = 'crosshair';

        const clickHandler = (e) => {
            this.setManualPosition(e.lngLat.lng, e.lngLat.lat);
            this.map.off('click', clickHandler);
            this.map.getCanvas().style.cursor = '';
        };

        this.map.on('click', clickHandler);
    }

    setManualPosition(longitude, latitude, level = null) {
        this.currentPosition = {
            longitude: longitude,
            latitude: latitude,
            accuracy: 5,
            heading: null,
            speed: null,
            altitude: null,
            timestamp: Date.now(),
            level: level || 1,
            manual: true
        };

        this.updateVisualization();

        if (this.callbacks.onPositionUpdate) {
            this.callbacks.onPositionUpdate(this.currentPosition);
        }
    }

    startSimulation() {
        if (!this.simulationPath) {
            this.simulationPath = this.generateSimulationPath();
        }

        this.simulationIndex = 0;

        this.updateTimer = setInterval(() => {
            if (this.simulationIndex >= this.simulationPath.length) {
                this.simulationIndex = 0;
            }

            const simPos = this.simulationPath[this.simulationIndex];
            
            this.currentPosition = { ...simPos, timestamp: Date.now() };

            this.updateVisualization();

            if (this.callbacks.onPositionUpdate) {
                this.callbacks.onPositionUpdate(this.currentPosition);
            }

            this.simulationIndex++;
        }, 2000);
    }

    generateSimulationPath() {
        const centerLng = CONFIG.map.center[0];
        const centerLat = CONFIG.map.center[1];
        const path = [];

        for (let i = 0; i < 50; i++) {
            const angle = (i / 50) * Math.PI * 2;
            const radius = 0.002;
            
            path.push({
                longitude: centerLng + Math.cos(angle) * radius,
                latitude: centerLat + Math.sin(angle) * radius,
                accuracy: 10 + Math.random() * 10,
                heading: (angle * 180 / Math.PI) % 360,
                speed: 1.5,
                altitude: 40,
                level: 1 + Math.floor(i / 17)
            });
        }

        return path;
    }

    getCurrentPosition() {
        return this.currentPosition;
    }

    onPositionUpdate(callback) {
        this.callbacks.onPositionUpdate = callback;
    }

    onError(callback) {
        this.callbacks.onError = callback;
    }
}