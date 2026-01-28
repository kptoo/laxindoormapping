class PositioningSystem {
    constructor(map, layerManager) {
        this.map = map;
        this.layerManager = layerManager;
        this.watchId = null;
        this.currentPosition = null;
        this.manualMode = false;
        this.manualMarker = null;
        this.positionHistory = [];
        this.maxHistorySize = 10;
        
        // Mobile-optimized geolocation options
        this.geolocationOptions = {
            enableHighAccuracy: true,
            timeout: 10000, // 10 seconds
            maximumAge: 5000 // 5 seconds
        };
    }

    start() {
        // Check if geolocation is supported
        if (!navigator.geolocation) {
            alert('Geolocation is not supported by your browser. Please use a modern browser with location services.');
            return;
        }

        // Check if we're on a secure context (HTTPS or localhost)
        if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
            alert('Location services require a secure connection (HTTPS). Please access this site via HTTPS.');
            return;
        }

        console.log('Starting location tracking...');
        
        // Show loading indicator
        this.showLocationLoading();

        // Request permission and start watching
        this.requestLocationPermission();
    }

    requestLocationPermission() {
        // First, try to get current position to trigger permission prompt
        navigator.geolocation.getCurrentPosition(
            (position) => {
                console.log('Location permission granted');
                this.hideLocationLoading();
                this.handlePositionSuccess(position);
                this.startWatching();
            },
            (error) => {
                console.error('Location permission error:', error);
                this.hideLocationLoading();
                this.handlePositionError(error);
            },
            this.geolocationOptions
        );
    }

    startWatching() {
        if (this.watchId !== null) {
            console.log('Already watching position');
            return;
        }

        console.log('Starting continuous position watch...');
        
        this.watchId = navigator.geolocation.watchPosition(
            (position) => this.handlePositionSuccess(position),
            (error) => this.handlePositionError(error),
            this.geolocationOptions
        );
    }

    handlePositionSuccess(position) {
        const longitude = position.coords.longitude;
        const latitude = position.coords.latitude;
        const accuracy = position.coords.accuracy;
        const heading = position.coords.heading;

        console.log(`Position: ${latitude}, ${longitude} (±${accuracy}m)`);

        // Store position
        this.currentPosition = {
            longitude: longitude,
            latitude: latitude,
            accuracy: accuracy,
            heading: heading,
            level: this.estimateLevel(latitude, longitude),
            timestamp: position.timestamp
        };

        // Add to history
        this.positionHistory.push(this.currentPosition);
        if (this.positionHistory.length > this.maxHistorySize) {
            this.positionHistory.shift();
        }

        // Update map
        this.layerManager.updateUserLocation(longitude, latitude, accuracy, heading);

        // Center map on first successful location
        if (this.positionHistory.length === 1) {
            this.map.flyTo({
                center: [longitude, latitude],
                zoom: 18,
                pitch: 45,
                duration: 2000
            });
        }
    }

    handlePositionError(error) {
        console.error('Geolocation error:', error);
        
        let errorMessage = 'Unable to get your location. ';
        let instructions = '';

        switch (error.code) {
            case error.PERMISSION_DENIED:
                errorMessage += 'Location permission was denied.';
                instructions = this.getPermissionInstructions();
                break;
            case error.POSITION_UNAVAILABLE:
                errorMessage += 'Location information is unavailable.';
                instructions = 'Please ensure you have a clear view of the sky if outdoors, or try moving to a different location.';
                break;
            case error.TIMEOUT:
                errorMessage += 'Location request timed out.';
                instructions = 'Please check your GPS/location settings and try again.';
                break;
            default:
                errorMessage += 'An unknown error occurred.';
                instructions = 'Please try again or use manual location setting.';
        }

        // Show detailed error with instructions
        this.showLocationError(errorMessage, instructions);
        
        // Stop watching on permission denied
        if (error.code === error.PERMISSION_DENIED) {
            this.stop();
        }
    }

    getPermissionInstructions() {
        const userAgent = navigator.userAgent.toLowerCase();
        
        if (/iphone|ipad|ipod/.test(userAgent)) {
            // iOS
            return `
To enable location on iOS:
1. Go to Settings > Privacy & Security > Location Services
2. Make sure Location Services is ON
3. Scroll down and find Safari (or your browser)
4. Select "While Using the App"
5. Refresh this page and try again
            `.trim();
        } else if (/android/.test(userAgent)) {
            // Android
            return `
To enable location on Android:
1. Go to Settings > Location
2. Turn ON location
3. Go to Settings > Apps > Browser/Chrome
4. Tap Permissions > Location
5. Select "Allow only while using the app"
6. Refresh this page and try again
            `.trim();
        } else {
            // Desktop
            return `
To enable location in your browser:
1. Click the lock icon (🔒) in the address bar
2. Find "Location" in the permissions list
3. Change it to "Allow"
4. Refresh this page and try again

Or use the browser settings:
- Chrome: Settings > Privacy and security > Site Settings > Location
- Firefox: Settings > Privacy & Security > Permissions > Location
- Safari: Safari > Preferences > Websites > Location
            `.trim();
        }
    }

    showLocationLoading() {
        // Create loading overlay
        const overlay = document.createElement('div');
        overlay.id = 'location-loading';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
        `;
        
        overlay.innerHTML = `
            <div style="background: white; padding: 30px; border-radius: 12px; text-align: center; max-width: 90%; max-width: 400px;">
                <div style="font-size: 48px; margin-bottom: 16px;">📍</div>
                <div style="font-size: 18px; font-weight: 600; color: #1f2937; margin-bottom: 8px;">Getting your location...</div>
                <div style="font-size: 14px; color: #6b7280;">Please allow location access when prompted</div>
            </div>
        `;
        
        document.body.appendChild(overlay);
    }

    hideLocationLoading() {
        const overlay = document.getElementById('location-loading');
        if (overlay) {
            overlay.remove();
        }
    }

    showLocationError(message, instructions) {
        // Remove loading if present
        this.hideLocationLoading();
        
        // Create error dialog
        const dialog = document.createElement('div');
        dialog.id = 'location-error';
        dialog.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            padding: 20px;
        `;
        
        dialog.innerHTML = `
            <div style="background: white; padding: 24px; border-radius: 12px; max-width: 500px; max-height: 80vh; overflow-y: auto;">
                <div style="font-size: 48px; text-align: center; margin-bottom: 16px;">⚠️</div>
                <div style="font-size: 18px; font-weight: 600; color: #ef4444; margin-bottom: 12px; text-align: center;">Location Access Issue</div>
                <div style="font-size: 14px; color: #374151; margin-bottom: 16px; text-align: center;">${message}</div>
                <div style="background: #f9fafb; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
                    <div style="font-size: 13px; font-weight: 600; color: #1f2937; margin-bottom: 8px;">Instructions:</div>
                    <div style="font-size: 13px; color: #4b5563; white-space: pre-line; line-height: 1.6;">${instructions}</div>
                </div>
                <div style="display: flex; gap: 8px;">
                    <button id="try-again-btn" style="flex: 1; padding: 12px; background: #2563eb; color: white; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer;">Try Again</button>
                    <button id="manual-location-btn" style="flex: 1; padding: 12px; background: #f3f4f6; color: #374151; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer;">Set Manually</button>
                    <button id="close-error-btn" style="padding: 12px; background: #f3f4f6; color: #374151; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer;">Close</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(dialog);
        
        // Add event listeners
        document.getElementById('try-again-btn').addEventListener('click', () => {
            dialog.remove();
            this.start();
        });
        
        document.getElementById('manual-location-btn').addEventListener('click', () => {
            dialog.remove();
            this.enableManualMode();
        });
        
        document.getElementById('close-error-btn').addEventListener('click', () => {
            dialog.remove();
        });
        
        // Close on background click
        dialog.addEventListener('click', (e) => {
            if (e.target === dialog) {
                dialog.remove();
            }
        });
    }

    stop() {
        if (this.watchId !== null) {
            navigator.geolocation.clearWatch(this.watchId);
            this.watchId = null;
            console.log('Stopped location tracking');
        }
        
        this.layerManager.clearUserLocation();
        this.currentPosition = null;
        this.positionHistory = [];
    }

    enableManualMode() {
        this.manualMode = true;
        this.stop();

        alert('Click on the map to set your current location');

        const clickHandler = (e) => {
            const longitude = e.lngLat.lng;
            const latitude = e.lngLat.lat;

            this.currentPosition = {
                longitude: longitude,
                latitude: latitude,
                accuracy: 10,
                heading: null,
                level: this.estimateLevel(latitude, longitude),
                timestamp: Date.now()
            };

            this.layerManager.updateUserLocation(longitude, latitude, 10, null);

            console.log(`Manual position set: ${latitude}, ${longitude}`);

            this.map.off('click', clickHandler);
            this.map.getCanvas().style.cursor = '';

            alert('Location set! You can now use navigation.');
        };

        this.map.on('click', clickHandler);
        this.map.getCanvas().style.cursor = 'crosshair';
    }

    disableManualMode() {
        this.manualMode = false;
        this.map.getCanvas().style.cursor = '';
    }

    getCurrentPosition() {
        return this.currentPosition;
    }

    estimateLevel(latitude, longitude) {
        // Default to level 1 for now
        // This could be enhanced with building footprint data
        return 1;
    }

    getSmoothedPosition() {
        if (this.positionHistory.length === 0) return null;
        if (this.positionHistory.length === 1) return this.positionHistory[0];

        const recentPositions = this.positionHistory.slice(-5);
        const avgLon = recentPositions.reduce((sum, pos) => sum + pos.longitude, 0) / recentPositions.length;
        const avgLat = recentPositions.reduce((sum, pos) => sum + pos.latitude, 0) / recentPositions.length;

        return {
            longitude: avgLon,
            latitude: avgLat,
            level: this.currentPosition.level,
            accuracy: this.currentPosition.accuracy
        };
    }

    isInsideTerminal(latitude, longitude) {
        // TODO: Implement terminal boundary checking
        return false;
    }
}