/**
 * Geotab Digital Matter Device Manager Add-in
 * @returns {{initialize: Function, focus: Function, blur: Function}}
 */
geotab.addin.digitalMatterDeviceManager = function () {
    'use strict';

    let api;
    let state;
    let elAddin;
    
    // Digital Matter API configuration
    const DM_API_BASE = 'https://api.oemserver.com/v1';
    const DM_API_TOKEN = 'hUpEcwaVfthLqxMOP8MirN.tFoswRLau5YFaBRTicD_vUt2TKc8_LefBgLK7J1a02w7.1';
    const NETLIFY_BASE_URL = 'https://sunny-lolly-97f343.netlify.app/';
    const DEVICE_TYPES = ['Yabby34G', 'YabbyEdge', 'Oyster2', 'Oyster34G'];
    
    // Global variables for device management
    let digitalMatterDevices = [];
    let geotabDevices = [];
    let filteredDevices = [];
    let currentEditingDevice = null;
    
    // Device type endpoints
    const DEVICE_TYPE_ENDPOINTS = [
        '/v1/Yabby34G/Get',
        '/v1/YabbyEdge/Get',
        '/v1/Oyster2/Get',
        '/v1/Oyster34G/Get'
    ];

    // Parameter descriptions from the provided paste
    const PARAMETER_DESCRIPTIONS = {
        '2000': {
            name: 'Basic Tracking',
            description: 'These parameters determine the tracking mode and tracking intervals of your device.',
            params: {
                'bPeriodicUploadHrMin': 'Heartbeat Upload Period (min) - Period of inactivity before a heartbeat upload (minutes)',
                'bInTripUploadMinSec': 'In Trip Upload Period (s) - Time between uploads in a trip (seconds)',
                'bInTripLogMinSec': 'In Trip Logging Period (s) - Time between GPS fixes in a trip (seconds)',
                'bGpsTimeoutMinSec': 'GPS Fix Timeout (s) - Max time to wait for a GPS fix (seconds)',
                'fGpsPowerMode': 'GPS Mode - Choose between prioritising GPS performance or power usage [0=Low Power,1=Performance]',
                'bTrackingMode': 'Tracking Mode - Mode of location tracking [0=GPS Movement Trips,1=Jostle Trips,2=Periodic Update]'
            }
        },
        '2050': {
            name: 'Alternative Basic Tracking',
            description: 'Used when after hours or in configured geofences NOTE: This is an advanced section.',
            params: {
                'bPeriodicUploadHrMin': 'Heartbeat Upload Period (min) - Period of inactivity before a heartbeat upload (minutes)',
                'bInTripUploadMinSec': 'In Trip Upload Period (s) - Time between uploads in a trip (seconds)',
                'bInTripLogMinSec': 'In Trip Logging Period (s) - Time between GPS fixes in a trip (seconds)',
                'bGpsTimeoutMinSec': 'GPS Fix Timeout (s) - Max time to wait for a GPS fix (seconds)',
                'fGpsPowerMode': 'GPS Mode - Choose between prioritising GPS performance or power usage [0=Low Power,1=Performance]'
            }
        },
        '2100': {
            name: 'Advanced Tracking',
            description: 'Configure upload behavior - whether at trip start, during movement, at trip end, based on accelerometer activity, and more.',
            params: {
                'fUploadOnStart': 'Upload On Trip Start - Schedule an upload as soon as a trip starts [1=Yes,0=No]',
                'fUploadDuring': 'Upload During Trip - Schedule uploads while in trip (enables Tracking->In Trip Upload Period) [1=Yes,0=No]',
                'fUploadOnEnd': 'Upload On Trip End - Schedule an upload as soon as a trip ends [1=Yes,0=No]',
                'fUploadOnJostle': 'Upload On Jostle - Schedule an upload shortly after accelerometer stops firing [1=Yes,0=No]',
                'fAvoidGpsWander': 'Suppress GPS Wander - Filter out small scale GPS movement (noise) [1=Yes,0=No]',
                'fCellTowerFallback': 'Cell Tower Fallback - Attempt to locate the device using cell towers when a GPS fix attempt fails [1=Yes,0=No]',
                'bOnceOffUploadDelayMinutes': 'Once-off Upload Delay (min) - Uploads once on trip start after this delay. Set to 0 to disable. Requires fw v1.8+',
                'bGpsFixMultiplier': 'GPS Fix Multiplier - Attempt GPS fix every this heartbeats (0 - 255). 1 will attempt a fix every heartbeat (default).'
            }
        }
    };

    /**
     * Make a Geotab API call
     */
    async function makeGeotabCall(method, typeName, parameters = {}) {
        if (!api) {
            throw new Error('Geotab API not initialized');
        }
        
        return new Promise((resolve, reject) => {
            const callParams = {
                typeName: typeName,
                ...parameters
            };
            
            api.call(method, callParams, resolve, reject);
        });
    }

    /**
     * Make a Digital Matter API call
     */
    async function makeDigitalMatterCall(endpoint, method = 'GET', body = null) {
        let url;
        let options = {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };
        
        if (body && method !== 'GET') {
            options.body = JSON.stringify(body);
        }
        
        // Route to appropriate Netlify function
        if (endpoint === '/TrackingDevice/GetDeviceList') {
            url = `${NETLIFY_BASE_URL}/api/get-device-list`;
        } else if (endpoint.includes('/TrackingDevice/GetGeotabSerial')) {
            const params = new URLSearchParams(endpoint.split('?')[1]);
            url = `${NETLIFY_BASE_URL}/api/get-geotab-serial?${params}`;
        } else if (endpoint.includes('/TrackingDevice/GetBatteryPercentageAndDeviceCounters')) {
            const params = new URLSearchParams(endpoint.split('?')[1]);
            url = `${NETLIFY_BASE_URL}/api/get-battery-data?${params}`;
        } else if (endpoint.includes('/TrackingDevice/SetDeviceParameters/')) {
            const productId = endpoint.split('/').pop();
            url = `${NETLIFY_BASE_URL}/api/set-device-params?productId=${productId}`;
        } else if (endpoint.includes('/v1/') && endpoint.includes('/Get?')) {
            // Handle device parameter requests
            const parts = endpoint.split('?');
            const deviceType = parts[0].split('/v1/')[1].split('/Get')[0];
            const params = new URLSearchParams(parts[1]);
            params.append('deviceType', deviceType);
            url = `${NETLIFY_BASE_URL}/api/get-device-params?${params}`;
        } else {
            throw new Error(`Unsupported endpoint: ${endpoint}`);
        }
        
        const response = await fetch(url, options);
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            throw new Error(errorData.error || `HTTP Error: ${response.status} ${response.statusText}`);
        }
        
        return await response.json();
    }

    /**
     * Load Digital Matter devices from API
     */
    async function loadDigitalMatterDevices() {
        try {
            showAlert('Loading Digital Matter devices...', 'info');
            const response = await makeDigitalMatterCall('/TrackingDevice/GetDeviceList');
            
            if (response && response.Devices) {
                digitalMatterDevices = response.Devices.map(device => ({
                    serialNumber: device.SerialNumber,
                    productId: device.ProductId,
                    geotabSerial: null,
                    batteryPercentage: null,
                    systemParameters: null,
                    deviceType: null
                }));
                
                showAlert(`Found ${digitalMatterDevices.length} Digital Matter devices`, 'success');
                return digitalMatterDevices;
            }
            
            throw new Error('No devices found in response');
        } catch (error) {
            console.error('Error loading Digital Matter devices:', error);
            showAlert('Error loading Digital Matter devices: ' + error.message, 'danger');
            return [];
        }
    }

    /**
     * Get Geotab serial for Digital Matter devices
     */
    async function enrichWithGeotabSerials() {
        showAlert('Getting Geotab serials for Digital Matter devices...', 'info');
        
        for (const device of digitalMatterDevices) {
            try {
                const response = await makeDigitalMatterCall(
                    `/TrackingDevice/GetGeotabSerial?product=${device.productId}&id=${device.serialNumber}`
                );
                
                if (response && response.GeotabSerial) {
                    device.geotabSerial = response.GeotabSerial;
                }
            } catch (error) {
                console.warn(`Could not get Geotab serial for device ${device.serialNumber}:`, error);
            }
        }
        
        const devicesWithGeotab = digitalMatterDevices.filter(d => d.geotabSerial);
        showAlert(`Matched ${devicesWithGeotab.length} devices with Geotab serials`, 'info');
    }

    /**
     * Load Geotab devices and filter Digital Matter devices
     */
    async function loadAndFilterGeotabDevices() {
        try {
            showAlert('Loading Geotab devices...', 'info');
            geotabDevices = await makeGeotabCall("Get", "Device");
            
            // Filter Digital Matter devices that exist in Geotab
            const filteredDMDevices = digitalMatterDevices.filter(dmDevice => {
                if (!dmDevice.geotabSerial) return false;
                
                const geotabDevice = geotabDevices.find(gtDevice => 
                    gtDevice.serialNumber === dmDevice.geotabSerial
                );
                
                if (geotabDevice) {
                    dmDevice.geotabName = geotabDevice.name;
                    dmDevice.geotabId = geotabDevice.id;
                    return true;
                }
                
                return false;
            });
            
            digitalMatterDevices = filteredDMDevices;
            showAlert(`Found ${digitalMatterDevices.length} Digital Matter devices in your Geotab database`, 'success');
            
        } catch (error) {
            console.error('Error loading Geotab devices:', error);
            showAlert('Error loading Geotab devices: ' + error.message, 'danger');
        }
    }

    /**
     * Get battery percentage and device counters
     */
    async function enrichWithBatteryData() {
        showAlert('Getting battery levels for devices...', 'info');
        
        for (const device of digitalMatterDevices) {
            try {
                const response = await makeDigitalMatterCall(
                    `/TrackingDevice/GetBatteryPercentageAndDeviceCounters?product=${device.productId}&id=${device.serialNumber}`
                );
                
                if (response && typeof response.BatteryPercentage !== 'undefined') {
                    device.batteryPercentage = response.BatteryPercentage;
                }
            } catch (error) {
                console.warn(`Could not get battery data for device ${device.serialNumber}:`, error);
            }
        }
    }

    /**
     * Get system parameters for each device
     */
    async function enrichWithSystemParameters() {
        showAlert('Getting system parameters for devices...', 'info');
        
        for (const device of digitalMatterDevices) {
            for (const deviceType of DEVICE_TYPES) {
                try {
                    const response = await makeDigitalMatterCall(
                        `/v1/${deviceType}/Get?product=${device.productId}&id=${device.serialNumber}`
                    );
                    
                    if (response && response.SystemParameters) {
                        device.systemParameters = response.SystemParameters;
                        device.deviceType = deviceType;
                        break; // Found the correct device type, stop trying others
                    }
                } catch (error) {
                    // Continue to next device type
                    continue;
                }
            }
        }
        
        const devicesWithParams = digitalMatterDevices.filter(d => d.systemParameters);
        showAlert(`Retrieved parameters for ${devicesWithParams.length} devices`, 'success');
    }

    /**
     * Load all device data
     */
    async function loadAllDeviceData() {
        try {
            // Step 1: Load Digital Matter devices
            await loadDigitalMatterDevices();
            
            if (digitalMatterDevices.length === 0) {
                showEmptyState();
                return;
            }
            
            // Step 2: Get Geotab serials
            await enrichWithGeotabSerials();
            
            // Step 3: Load and filter Geotab devices
            await loadAndFilterGeotabDevices();
            
            if (digitalMatterDevices.length === 0) {
                showEmptyState();
                return;
            }
            
            // Step 4: Get battery data
            await enrichWithBatteryData();
            
            // Step 5: Get system parameters
            await enrichWithSystemParameters();
            
            // Step 6: Render devices
            filteredDevices = [...digitalMatterDevices];
            renderDevices();
            
        } catch (error) {
            console.error('Error loading device data:', error);
            showAlert('Error loading device data: ' + error.message, 'danger');
            showEmptyState();
        }
    }

    /**
     * Filter devices based on search input
     */
    function filterDevices() {
        const searchTerm = document.getElementById('deviceSearch').value.toLowerCase();
        
        filteredDevices = digitalMatterDevices.filter(device => 
            (device.geotabName && device.geotabName.toLowerCase().includes(searchTerm)) ||
            device.serialNumber.toLowerCase().includes(searchTerm) ||
            (device.geotabSerial && device.geotabSerial.toLowerCase().includes(searchTerm))
        );
        
        renderDevices();
    }

    /**
     * Render devices in the UI
     */
    function renderDevices() {
        const container = document.getElementById('devicesList');
        if (!container) return;
        
        if (filteredDevices.length === 0) {
            showEmptyState();
            return;
        }
        
        const devicesHtml = filteredDevices.map(device => {
            const batteryClass = getBatteryClass(device.batteryPercentage);
            const batteryIcon = getBatteryIcon(device.batteryPercentage);
            
            return `
                <div class="device-card mb-3">
                    <div class="card">
                        <div class="card-body">
                            <div class="row align-items-center">
                                <div class="col-md-6">
                                    <h5 class="card-title mb-1">${device.geotabName || 'Unknown Device'}</h5>
                                    <p class="card-text text-muted mb-1">
                                        <small>Serial: ${device.serialNumber}</small>
                                    </p>
                                    <p class="card-text text-muted mb-0">
                                        <small>Geotab Serial: ${device.geotabSerial || 'N/A'}</small>
                                    </p>
                                </div>
                                <div class="col-md-3 text-center">
                                    ${device.batteryPercentage !== null ? `
                                        <div class="battery-info">
                                            <i class="fas ${batteryIcon} ${batteryClass} fa-2x"></i>
                                            <div class="battery-percentage ${batteryClass}">${device.batteryPercentage}%</div>
                                        </div>
                                    ` : `
                                        <div class="battery-info">
                                            <i class="fas fa-question-circle text-muted fa-2x"></i>
                                            <div class="battery-percentage text-muted">N/A</div>
                                        </div>
                                    `}
                                </div>
                                <div class="col-md-3 text-end">
                                    <button class="btn btn-primary btn-sm me-2" 
                                            onclick="viewDeviceParameters('${device.serialNumber}')"
                                            ${!device.systemParameters ? 'disabled' : ''}>
                                        <i class="fas fa-cog me-1"></i>Parameters
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        container.innerHTML = devicesHtml;
        updateDeviceCount();
    }

    /**
     * Get battery CSS class based on percentage
     */
    function getBatteryClass(percentage) {
        if (percentage === null || percentage === undefined) return 'text-muted';
        if (percentage > 50) return 'text-success';
        if (percentage > 20) return 'text-warning';
        return 'text-danger';
    }

    /**
     * Get battery icon based on percentage
     */
    function getBatteryIcon(percentage) {
        if (percentage === null || percentage === undefined) return 'fa-question-circle';
        if (percentage > 75) return 'fa-battery-full';
        if (percentage > 50) return 'fa-battery-three-quarters';
        if (percentage > 25) return 'fa-battery-half';
        if (percentage > 10) return 'fa-battery-quarter';
        return 'fa-battery-empty';
    }

    /**
     * Show empty state message
     */
    function showEmptyState() {
        const container = document.getElementById('devicesList');
        if (!container) return;
        
        container.innerHTML = `
            <div class="empty-state text-center py-5">
                <i class="fas fa-mobile-alt fa-4x text-muted mb-4"></i>
                <h4 class="text-muted">No Digital Matter Devices Found</h4>
                <p class="text-muted">No Digital Matter devices were found in your Geotab database.</p>
                <button class="btn btn-primary" onclick="refreshDevices()">
                    <i class="fas fa-sync-alt me-2"></i>Refresh Devices
                </button>
            </div>
        `;
    }

    /**
     * Update device count
     */
    function updateDeviceCount() {
        const countEl = document.getElementById('deviceCount');
        if (countEl) {
            countEl.textContent = `${filteredDevices.length} of ${digitalMatterDevices.length} devices`;
        }
    }

    /**
     * View device parameters modal
     */
    window.viewDeviceParameters = function(serialNumber) {
        const device = digitalMatterDevices.find(d => d.serialNumber === serialNumber);
        if (!device || !device.systemParameters) {
            showAlert('No parameters available for this device', 'warning');
            return;
        }
        
        currentEditingDevice = device;
        showParametersModal(device);
    };

    /**
     * Show parameters modal
     */
    function showParametersModal(device) {
        const modal = document.getElementById('parametersModal');
        const modalBody = document.getElementById('parametersModalBody');
        const modalTitle = document.getElementById('parametersModalTitle');
        
        modalTitle.textContent = `Parameters - ${device.geotabName || device.serialNumber}`;
        
        let parametersHtml = '';
        
        for (const [sectionId, sectionData] of Object.entries(device.systemParameters)) {
            const sectionInfo = PARAMETER_DESCRIPTIONS[sectionId];
            
            if (!sectionInfo) continue; // Skip unknown sections
            
            parametersHtml += `
                <div class="parameter-section mb-4">
                    <h5 class="text-primary">${sectionInfo.name}</h5>
                    <p class="text-muted small">${sectionInfo.description}</p>
                    
                    <div class="row">
            `;
            
            for (const [paramKey, paramValue] of Object.entries(sectionData)) {
                const paramDescription = sectionInfo.params[paramKey];
                
                if (!paramDescription) continue; // Skip unknown parameters
                
                parametersHtml += `
                    <div class="col-md-6 mb-3">
                        <label class="form-label small">${paramDescription}</label>
                        <input type="text" 
                               class="form-control form-control-sm" 
                               value="${paramValue}"
                               data-section="${sectionId}"
                               data-param="${paramKey}"
                               onchange="markParameterAsChanged(this)">
                    </div>
                `;
            }
            
            parametersHtml += `
                    </div>
                </div>
            `;
        }
        
        modalBody.innerHTML = parametersHtml;
        
        // Show modal
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();
    }

    /**
     * Mark parameter as changed
     */
    window.markParameterAsChanged = function(input) {
        input.classList.add('changed');
        document.getElementById('saveParametersBtn').disabled = false;
    };

    /**
     * Save device parameters
     */
    window.saveDeviceParameters = async function() {
        if (!currentEditingDevice) return;
        
        const changedInputs = document.querySelectorAll('#parametersModal input.changed');
        if (changedInputs.length === 0) {
            showAlert('No changes detected', 'info');
            return;
        }
        
        try {
            showAlert('Saving device parameters...', 'info');
            
            // Build the parameters object with only changed values
            const updatedParams = {};
            
            changedInputs.forEach(input => {
                const section = input.dataset.section;
                const param = input.dataset.param;
                const value = input.value;
                
                if (!updatedParams[section]) {
                    updatedParams[section] = { Id: section, Params: {} };
                }
                
                updatedParams[section].Params[param] = value;
            });
            
            // Prepare the request body
            const requestBody = {
                Devices: [currentEditingDevice.serialNumber],
                ParamSections: Object.values(updatedParams)
            };
            
            // Make the PUT request
            await makeDigitalMatterCall(
                `/TrackingDevice/SetDeviceParameters/${currentEditingDevice.productId}`,
                'PUT',
                requestBody
            );
            
            // Update local parameters
            Object.entries(updatedParams).forEach(([sectionId, sectionData]) => {
                Object.entries(sectionData.Params).forEach(([paramKey, paramValue]) => {
                    if (currentEditingDevice.systemParameters[sectionId]) {
                        currentEditingDevice.systemParameters[sectionId][paramKey] = paramValue;
                    }
                });
            });
            
            showAlert('Device parameters updated successfully!', 'success');
            
            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('parametersModal'));
            modal.hide();
            
            // Reset button state
            document.getElementById('saveParametersBtn').disabled = true;
            
        } catch (error) {
            console.error('Error saving parameters:', error);
            showAlert('Error saving parameters: ' + error.message, 'danger');
        }
    };

    /**
     * Show alert messages
     */
    function showAlert(message, type = 'info') {
        const alertContainer = document.getElementById('alertContainer');
        if (!alertContainer) return;
        
        const alertId = 'alert-' + Date.now();
        
        const iconMap = {
            'success': 'check-circle',
            'danger': 'exclamation-triangle',
            'warning': 'exclamation-triangle',
            'info': 'info-circle'
        };
        
        const alertHtml = `
            <div class="alert alert-${type} alert-dismissible fade show" id="${alertId}" role="alert">
                <i class="fas fa-${iconMap[type]} me-2"></i>
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;
        
        alertContainer.insertAdjacentHTML('beforeend', alertHtml);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            const alert = document.getElementById(alertId);
            if (alert && typeof bootstrap !== 'undefined' && bootstrap.Alert) {
                const bsAlert = new bootstrap.Alert(alert);
                bsAlert.close();
            }
        }, 5000);
    }

    /**
     * Refresh devices data
     */
    window.refreshDevices = async function() {
        digitalMatterDevices = [];
        filteredDevices = [];
        await loadAllDeviceData();
    };

    /**
     * Setup event listeners
     */
    function setupEventListeners() {
        // Add debounced search functionality
        let searchTimeout;
        
        function debounceSearch() {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                filterDevices();
            }, 300);
        }
        
        // Add event listeners for search input
        const deviceSearch = document.getElementById('deviceSearch');
        if (deviceSearch) {
            deviceSearch.addEventListener('input', debounceSearch);
        }

        // Handle keyboard shortcuts
        document.addEventListener('keydown', function(event) {
            // Ctrl/Cmd + R to refresh devices
            if ((event.ctrlKey || event.metaKey) && event.key === 'r') {
                event.preventDefault();
                loadAllDeviceData();
            }
            
            // Escape to clear search box
            if (event.key === 'Escape') {
                if (deviceSearch && deviceSearch.value) {
                    deviceSearch.value = '';
                    filterDevices();
                }
            }
        });
    }

    return {
        /**
         * initialize() is called only once when the Add-In is first loaded.
         */
        initialize: function (freshApi, freshState, initializeCallback) {
            api = freshApi;
            state = freshState;

            elAddin = document.getElementById('digitalMatterDeviceManager');

            if (state.translate) {
                state.translate(elAddin || '');
            }
            
            initializeCallback();
        },

        /**
         * focus() is called whenever the Add-In receives focus.
         */
        focus: function (freshApi, freshState) {
            api = freshApi;
            state = freshState;

            // Setup event listeners
            setupEventListeners();
            
            // Load device data
            loadAllDeviceData();
            
            // Show main content
            if (elAddin) {
                elAddin.style.display = 'block';
            }

            // Make functions globally accessible
            window.filterDevices = filterDevices;
        },

        /**
         * blur() is called whenever the user navigates away from the Add-In.
         */
        blur: function () {
            // Hide main content
            if (elAddin) {
                elAddin.style.display = 'none';
            }
        }
    };
};