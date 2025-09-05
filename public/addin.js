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
    const NETLIFY_BASE_URL = 'https://sunny-lolly-97f343.netlify.app/';
    
    // Global variables for device management
    let digitalMatterDevices = [];
    let geotabDevices = [];
    let filteredDevices = [];
    let currentEditingDevice = null;

    const CLIENT_MAPPING = {
        "regendiesel": "Regen Diesel Repair",
        "decimacorp": "Decima Corp",
        "pavlovmedia": "Pavlov Media",
        "rnwbl": "RNWBL",
        "aitransport": "Spartan Carrier Group",
        "dataone": "Data One",
        "pumpman": "Pumpman Phoenix",
        "erling_sales_and_service": "Erling Sales and Service",
        "cressydoor": "Cressy Door",
        "bigcityleasing": "BigCity Leasing",
        "foothillsconstruction": "Foothills Construction",
        "reynolds_fence": "Reynolds Fence",
        "traxxisdemo": "Traxxis Demo"
    };

    // Parameter descriptions from the provided paste
    const PARAMETER_DESCRIPTIONS = {
    // Yabby34G
    'Yabby34G': {
        '2000': {
        name: 'Basic Tracking',
        description: 'Set how often your device records location data and uploads it.',
        params: {
            'bPeriodicUploadHrMin': 'Heartbeat Interval - How often the device checks in when idle (minutes). ⚠️ Shorter times use more battery.',
            'bInTripUploadMinSec': 'Upload While Moving - How often the device sends updates during a trip (seconds). ⚠️ More frequent uploads use more battery.',
            'bInTripLogMinSec': 'GPS Fix Frequency - How often the device records a GPS point during a trip (seconds). ⚠️ More frequent logging gives more detail but reduces battery life.',
            'fGpsPowerMode': 'GPS Power Mode - Choose whether to save battery or prioritize GPS accuracy.',
            'bTrackingMode': 'Tracking Method - Select how the device detects and tracks trips.'
        }
        },
        '2100': {
        name: 'Advanced Tracking',
        description: 'Control when the device uploads data during trips.',
        params: {
            'fUploadOnStart': 'Upload at Trip Start - Sends data immediately when a trip begins.',
            'fUploadDuring': 'Upload During Trip - Sends updates while moving (uses the In-Trip Upload setting). ⚠️ Increases battery use.',
            'fUploadOnEnd': 'Upload at Trip End - Sends data immediately after the trip finishes.'
        }
        }
    },

    // Oyster34G
    'Oyster34G': {
        '2000': {
        name: 'Basic Tracking',
        description: 'Set how often your device records location data and uploads it.',
        params: {
            'bPeriodicUploadHrMin': 'Heartbeat Interval - How often the device checks in when idle (minutes). ⚠️ Shorter times use more battery.',
            'bInTripUploadMinSec': 'Upload While Moving - How often the device sends updates during a trip (seconds). ⚠️ More frequent uploads use more battery.',
            'bInTripLogMinSec': 'GPS Fix Frequency - How often the device records a GPS point during a trip (seconds). ⚠️ More frequent logging gives more detail but reduces battery life.',
            'fGpsPowerMode': 'GPS Power Mode - Choose whether to save battery or prioritize GPS accuracy.',
            'bTrackingMode': 'Tracking Method - Select how the device detects and tracks trips.'
        }
        },
        '2100': {
        name: 'Advanced Tracking',
        description: 'Control when the device uploads data during trips.',
        params: {
            'fUploadOnStart': 'Upload at Trip Start - Sends data immediately when a trip begins.',
            'fUploadDuring': 'Upload During Trip - Sends updates while moving (uses the In-Trip Upload setting). ⚠️ Increases battery use.',
            'fUploadOnEnd': 'Upload at Trip End - Sends data immediately after the trip finishes.'
        }
        }
    },

    // Oyster2
    'Oyster2': {
        '2000': {
        name: 'Basic Tracking',
        description: 'Set how often your device records location data and uploads it.',
        params: {
            'bPeriodicUploadHrMin': 'Heartbeat Interval - How often the device checks in when idle (minutes). ⚠️ Shorter times use more battery.',
            'bInTripUploadMinSec': 'Upload While Moving - How often the device sends updates during a trip (seconds). ⚠️ More frequent uploads use more battery.',
            'bInTripLogMinSec': 'GPS Fix Frequency - How often the device records a GPS point during a trip (seconds). ⚠️ More frequent logging gives more detail but reduces battery life.'
        }
        },
        '2100': {
        name: 'Advanced Tracking',
        description: 'Control how trips are detected and when uploads happen.',
        params: {
            'fPeriodicOnly': 'Heartbeat Only - Disable movement tracking so the device only sends periodic check-ins.',
            'fJostleTrips': 'Accelerometer Trips - Use motion detection instead of GPS movement to detect trips.',
            'fUploadOnStart': 'Upload at Trip Start - Sends data immediately when a trip begins.',
            'fUploadDuring': 'Upload During Trip - Sends updates while moving (uses the In-Trip Upload setting). ⚠️ Increases battery use.',
            'fUploadOnEnd': 'Upload at Trip End - Sends data immediately after the trip finishes.'
        }
        }
    },

    // YabbyEdge
    'YabbyEdge': {
        '2000': {
        name: 'Basic Tracking',
        description: 'Set how often your device scans for location and uploads results.',
        params: {
            'bPeriodicUploadHrMin': 'Heartbeat Interval - How often the device checks in when idle (minutes). ⚠️ Shorter times use more battery.',
            'bMoveLogMinSec': 'Movement Logging Interval - How often the device takes a location scan while moving (seconds). ⚠️ More frequent scans reduce battery life.',
            'bMoveUploadMinSec': 'Movement Upload Interval - How often the device uploads data while moving (seconds). ⚠️ More frequent uploads reduce battery life.',
            'bTrackingMode': 'Tracking Method - Select whether the device reports based on movement or a fixed time schedule.'
        }
        },
        '2400': {
        name: 'Movement Detection',
        description: 'Control how the device reacts when movement starts and stops.',
        params: {
            'fUploadOnStart': 'Upload on Movement Start - Sends an update right when movement begins.',
            'fUploadOnEnd': 'Upload on Movement End - Sends an update right after movement stops.',
            'fDisableMoveLogs': 'Log During Movement - Record locations while moving. ⚠️ Increases battery use.',
            'fEnableMoveUploads': 'Upload During Movement - Sends updates while moving. ⚠️ Increases battery use.'
        }
        }
    }
    };

    /**
     * Template configurations for different tracking modes
     */
    const PARAMETER_TEMPLATES = {
        'daily-update': {
            name: 'Daily Update',
            description: 'Device checks in once per day, no movement tracking',
            settings: {
                'bPeriodicUploadHrMin': '1440',
                'bTrackingMode': '1', // Will be mapped appropriately per device
                'bInTripUploadMinSec': '3600',
                'bInTripLogMinSec': '3600',
                'fUploadOnStart': '0',
                'fUploadOnEnd': '0',
                'fUploadDuring': '0',
                'fDisableMoveLogs': '1' // Only applies to YabbyEdge
            }
        },
        'start-stop': {
            name: 'Start + Stop',
            description: 'Tracks trip start and end points only',
            settings: {
                'bPeriodicUploadHrMin': '1440',
                'bTrackingMode': '0', // Movement based
                'bInTripUploadMinSec': '3600',
                'bInTripLogMinSec': '3600',
                'fUploadOnStart': '1',
                'fUploadOnEnd': '1',
                'fUploadDuring': '0',
                'fDisableMoveLogs': '1' // Only applies to YabbyEdge
            }
        },
        'movement-tracking': {
            name: 'Movement Tracking',
            description: 'Full trip tracking with regular updates during movement',
            settings: {
                'bPeriodicUploadHrMin': '1440',
                'bTrackingMode': '0', // Movement based
                'bInTripUploadMinSec': '1800',
                'bInTripLogMinSec': '300',
                'fUploadOnStart': '1',
                'fUploadOnEnd': '1',
                'fUploadDuring': '1',
                'fDisableMoveLogs': '0' // Only applies to YabbyEdge
            }
        },
        'custom': {
            name: 'Custom',
            description: 'Configure each parameter individually',
            settings: {}
        }
    };

    // Add this constant after the existing CLIENT_MAPPING constant:
    const PRODUCT_ID_TO_DEVICE_TYPE = {
        '87': 'Oyster34G',
        '77': 'Oyster2', 
        '85': 'YabbyEdge',
        '97': 'Yabby34G'
    };

    function getCurrentGeotabDatabase() {
        return new Promise((resolve, reject) => {
            api.getSession(function(session) {
                console.log('session:', session);
                if (session && session.database) {
                    resolve(session.database);
                } else {
                    reject(new Error('No database found in session'));
                }
            });
        });
    }

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
        } else if (endpoint.includes('/AsyncMessaging/Send')) {
            const params = new URLSearchParams(endpoint.split('?')[1]);
            url = `${NETLIFY_BASE_URL}/api/send-recovery-mode?${params}`;
        } else if (endpoint.includes('/AsyncMessaging/Get')) {
            const params = new URLSearchParams(endpoint.split('?')[1]);
            url = `${NETLIFY_BASE_URL}/api/get-recovery-mode?${params}`;
        } else if (endpoint.includes('/AsyncMessaging/Cancel')) {
            const params = new URLSearchParams(endpoint.split('?')[1]);
            url = `${NETLIFY_BASE_URL}/api/cancel-recovery-mode?${params}`;
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
            
            // Get current Geotab database
            const currentDatabase = await getCurrentGeotabDatabase();
            if (!currentDatabase) {
                throw new Error('Could not determine current Geotab database');
            }
            
            const currentClient = CLIENT_MAPPING[currentDatabase.toLowerCase()];
            if (!currentClient) {
                throw new Error(`No client mapping found for database: ${currentDatabase}`);
            }
            
            showAlert(`Filtering for client: ${currentClient}`, 'info');
            
            const response = await makeDigitalMatterCall('/TrackingDevice/GetDeviceList');
            
            if (response && response.Devices) {
                // Filter devices by client field
                const clientDevices = response.Devices.filter(device => 
                    device.Client && device.Client === currentClient
                );
                
                digitalMatterDevices = clientDevices.map(device => ({
                    serialNumber: device.SerialNumber,
                    productId: device.ProductId,
                    client: device.Client,
                    geotabSerial: null,
                    batteryPercentage: null,
                    systemParameters: null,
                    deviceType: null
                }));
                
                showAlert(`Found ${digitalMatterDevices.length} Digital Matter devices for ${currentClient}`, 'success');
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
        if (digitalMatterDevices.length === 0) {
            return;
        }
        
        showAlert('Getting Geotab serials for filtered Digital Matter devices...', 'info');
        
        for (const device of digitalMatterDevices) {
            try {
                const response = await makeDigitalMatterCall(
                    `/TrackingDevice/GetGeotabSerial?product=${device.productId}&id=${device.serialNumber}`
                );

                console.log('Geotab serial response for device', device.serialNumber, response);
                
                if (response && response.GeotabSerial) {
                    device.geotabSerial = response.GeotabSerial;
                }
            } catch (error) {
                console.warn(`Could not get Geotab serial for device ${device.serialNumber}:`, error);
            }
        }
        
        const devicesWithGeotab = digitalMatterDevices.filter(d => d.geotabSerial);
        showAlert(`Matched ${devicesWithGeotab.length} devices with Geotab serials`, 'success');
    }

    /**
     * Load Geotab devices and filter Digital Matter devices
     */
    async function loadAndEnrichWithGeotabData() {
        try {
            showAlert('Loading Geotab device information...', 'info');
            geotabDevices = await makeGeotabCall("Get", "Device");
            
            // Enrich Digital Matter devices with Geotab names and IDs
            let enrichedCount = 0;
            digitalMatterDevices.forEach(dmDevice => {
                if (dmDevice.geotabSerial) {
                    const geotabDevice = geotabDevices.find(gtDevice => 
                        gtDevice.serialNumber === dmDevice.geotabSerial
                    );
                    
                    if (geotabDevice) {
                        dmDevice.geotabName = geotabDevice.name;
                        dmDevice.geotabId = geotabDevice.id;
                        enrichedCount++;
                    }
                }
            });
            
            showAlert(`Enriched ${enrichedCount} devices with Geotab information`, 'success');
            
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
            // Determine device type from product ID
            const deviceType = PRODUCT_ID_TO_DEVICE_TYPE[device.productId];
            
            if (!deviceType) {
                console.warn(`Unknown product ID ${device.productId} for device ${device.serialNumber}`);
                continue;
            }
            
            try {
                const response = await makeDigitalMatterCall(
                    `/v1/${deviceType}/Get?product=${device.productId}&id=${device.serialNumber}`
                );
                
                if (response && response.SystemParameters) {
                    device.systemParameters = response.SystemParameters;
                    device.deviceType = deviceType;
                    device.recoveryModeStatus = response.RecoveryMode; // Add recovery mode status
                }
            } catch (error) {
                console.warn(`Could not get system parameters for device ${device.serialNumber}:`, error);
            }
        }
        
        const devicesWithParams = digitalMatterDevices.filter(d => d.systemParameters);
        const devicesInRecovery = digitalMatterDevices.filter(d => d.recoveryModeStatus === true);
        showAlert(`Retrieved parameters for ${devicesWithParams.length} devices (${devicesInRecovery.length} in recovery mode)`, 'success');
    }

    /**
     * Get recovery mode queues for each device
     */
    async function enrichWithRecoveryModeQueues() {
        showAlert('Getting recovery mode queues for devices...', 'info');
        
        for (const device of digitalMatterDevices) {
            try {
                const response = await makeDigitalMatterCall(`/AsyncMessaging/Get?serial=${device.serialNumber}`);
                
                // Filter for recovery mode messages (MessageType = 3 and CANAddress = 4294967295)
                const recoveryModeQueues = response.filter(item => 
                    item.MessageType === 3 && item.CANAddress === 4294967295
                );
                
                device.recoveryModeQueues = recoveryModeQueues;
            } catch (error) {
                console.warn(`Could not get recovery mode queues for device ${device.serialNumber}:`, error);
                device.recoveryModeQueues = [];
            }
        }
        
        const devicesWithQueues = digitalMatterDevices.filter(d => d.recoveryModeQueues && d.recoveryModeQueues.length > 0);
        showAlert(`Retrieved recovery mode queues for ${digitalMatterDevices.length} devices (${devicesWithQueues.length} have active queues)`, 'success');
    }

    /**
     * Load all device data - Modified to include recovery mode queues
     */
    async function loadAllDeviceData() {
        try {
            // Step 1: Load Digital Matter devices (now filtered by client)
            await loadDigitalMatterDevices();
            
            if (digitalMatterDevices.length === 0) {
                showEmptyState();
                return;
            }
            
            // Step 2: Get Geotab serials (only for filtered devices)
            await enrichWithGeotabSerials();
            
            // Step 3: Load Geotab devices and enrich (renamed function)
            await loadAndEnrichWithGeotabData();
            
            // Filter out devices without Geotab matches
            const devicesWithGeotabMatch = digitalMatterDevices.filter(d => d.geotabName);
            if (devicesWithGeotabMatch.length === 0) {
                showEmptyState();
                return;
            }
            
            digitalMatterDevices = devicesWithGeotabMatch;
            showAlert(`Final count: ${digitalMatterDevices.length} matched devices`, 'success');
            
            // Step 4: Get battery data
            await enrichWithBatteryData();
            
            // Step 5: Get system parameters
            await enrichWithSystemParameters();
            
            // Step 6: Get recovery mode queues
            await enrichWithRecoveryModeQueues();
            
            // Step 7: Render devices
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
                                    <button class="btn btn-primary btn-sm me-2 mb-1" 
                                            onclick="viewDeviceParameters('${device.serialNumber}')"
                                            ${!device.systemParameters ? 'disabled' : ''}>
                                        <i class="fas fa-cog me-1"></i>Parameters
                                    </button>
                                    <button class="btn btn-warning btn-sm mb-1" 
                                            onclick="viewRecoveryMode('${device.serialNumber}')">
                                        <i class="fas fa-life-ring me-1"></i>Recovery Mode
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
     * View device parameters - modified to show inline instead of modal
     */
    window.viewDeviceParameters = function(serialNumber) {
        const device = digitalMatterDevices.find(d => d.serialNumber === serialNumber);
        if (!device || !device.systemParameters) {
            showAlert('No parameters available for this device', 'warning');
            return;
        }
        
        currentEditingDevice = device;
        
        // Check if parameters are already being shown for this device
        const existingParams = document.getElementById(`params-${serialNumber}`);
        if (existingParams) {
            // Toggle visibility
            if (existingParams.style.display === 'none') {
                existingParams.style.display = 'block';
            } else {
                existingParams.style.display = 'none';
            }
            return;
        }
        
        showParametersInline(device);
    };

    function showParametersInline(device) {
        // Find the device card
        const deviceCards = document.querySelectorAll('.device-card');
        let targetCard = null;
        
        deviceCards.forEach(card => {
            const cardText = card.textContent;
            if (cardText.includes(device.serialNumber)) {
                targetCard = card;
            }
        });
        
        if (!targetCard) return;
        
        // Get parameter descriptions for this device type
        const deviceTypeParams = PARAMETER_DESCRIPTIONS[device.deviceType];
        if (!deviceTypeParams) {
            showAlert(`No parameter definitions found for device type: ${device.deviceType}`, 'warning');
            return;
        }
        
        // Helper function to format parameter descriptions with styled disclaimers
        function formatParameterDescription(description) {
            // Split by warning emoji to separate main description from disclaimers
            const parts = description.split('⚠️');
            
            if (parts.length === 1) {
                // No disclaimer, return as is
                return description;
            }
            
            const mainDescription = parts[0].trim();
            const disclaimers = parts.slice(1).map(part => part.trim()).filter(part => part.length > 0);
            
            let formattedHtml = mainDescription;
            
            disclaimers.forEach(disclaimer => {
                formattedHtml += ` <span class="parameter-disclaimer">⚠️ ${disclaimer}</span>`;
            });
            
            return formattedHtml;
        }
        
        let parametersHtml = `
            <div id="params-${device.serialNumber}" class="device-parameters mt-3">
                <div class="parameters-container">
                    <div class="parameters-header mb-4">
                        <div class="d-flex align-items-center justify-content-between">
                            <div>
                                <h5 class="text-primary mb-1">
                                    <i class="fas fa-cog me-2"></i>Device Parameters
                                </h5>
                                <p class="text-muted mb-0">${device.geotabName || device.serialNumber} - ${device.deviceType || 'Unknown Type'}</p>
                            </div>
                            <button class="btn btn-outline-secondary btn-sm" onclick="hideDeviceParameters('${device.serialNumber}')">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    </div>
                    
                    <!-- Template Selector -->
                    <div class="template-selector-section mb-4">
                        <div class="template-header mb-3">
                            <h6 class="text-secondary mb-2">
                                <i class="fas fa-palette me-2"></i>Configuration Template
                            </h6>
                            <p class="text-muted small mb-3">Choose a preset configuration or customize individual parameters.</p>
                        </div>
                        
                        <div class="template-selection mb-3">
                            <select class="form-select template-selector" 
                                    data-device="${device.serialNumber}"
                                    data-device-type="${device.deviceType}"
                                    onchange="handleTemplateChange(this)">
                                <option value="custom">Custom - Configure each parameter individually</option>
                                <option value="daily-update">Daily Update - Device checks in once per day, no movement tracking</option>
                                <option value="start-stop">Start + Stop - Tracks trip start and end points only</option>
                                <option value="movement-tracking">Movement Tracking - Full trip tracking with regular updates</option>
                            </select>
                        </div>
                        <div id="custom-warning-${device.serialNumber}" class="alert alert-danger d-none mb-3">
                            <strong>Warning:</strong> Modifying parameters will affect the performance and battery life of devices.
                            <br>
                            Please contact Traxxis GPS before modifying if you are unsure about these settings.
                        </div>
                    </div>
                    
                    <div class="parameters-content">
        `;
        
        for (const [sectionId, sectionData] of Object.entries(device.systemParameters)) {
            const sectionInfo = deviceTypeParams[sectionId];
            
            if (!sectionInfo) continue; // Skip unknown sections
            
            parametersHtml += `
                <div class="parameter-section mb-4">
                    <div class="section-header mb-3">
                        <h6 class="section-title">${sectionInfo.name}</h6>
                        <p class="section-description">${sectionInfo.description}</p>
                    </div>
                    
                    <div class="parameters-grid">
            `;
            
            for (const [paramKey, paramValue] of Object.entries(sectionData)) {
                const paramDescription = sectionInfo.params[paramKey];
                
                if (!paramDescription) continue; // Skip unknown parameters
                
                const [paramName, ...descParts] = paramDescription.split(' - ');
                const paramDesc = descParts.join(' - ');
                
                // Format the parameter description with styled disclaimers
                const formattedParamDesc = formatParameterDescription(paramDesc);
                
                // Check if this parameter should use a dropdown
                const dropdownOptions = generateDropdownOptions(paramKey, paramValue, device.deviceType);
                
                if (dropdownOptions) {
                    // Generate dropdown
                    let optionsHtml = '';
                    dropdownOptions.forEach(option => {
                        const selected = option.value === paramValue.toString() ? 'selected' : '';
                        optionsHtml += `<option value="${option.value}" ${selected}>${option.label}</option>`;
                    });
                    
                    parametersHtml += `
                        <div class="parameter-field">
                            <label class="parameter-label">${paramName}</label>
                            <select class="form-select parameter-input" 
                                    data-section="${sectionId}"
                                    data-param="${paramKey}"
                                    data-device="${device.serialNumber}"
                                    data-original-value="${paramValue}"
                                    onchange="markParameterAsChanged(this)"
                                    title="${paramDescription}">
                                ${optionsHtml}
                            </select>
                            <div class="parameter-description">${formattedParamDesc}</div>
                        </div>
                    `;
                } else {
                    // Use text input for parameters without specific dropdown options
                    parametersHtml += `
                        <div class="parameter-field">
                            <label class="parameter-label">${paramName}</label>
                            <input type="text" 
                                class="form-control parameter-input" 
                                value="${paramValue}"
                                data-section="${sectionId}"
                                data-param="${paramKey}"
                                data-device="${device.serialNumber}"
                                data-original-value="${paramValue}"
                                onchange="markParameterAsChanged(this)"
                                title="${paramDescription}">
                            <div class="parameter-description">${formattedParamDesc}</div>
                        </div>
                    `;
                }
            }
            
            parametersHtml += `
                    </div>
                </div>
            `;
        }
        
        parametersHtml += `
                    </div>
                    
                    <div class="parameters-actions">
                        <div class="d-flex justify-content-between align-items-center">
                            <div class="action-buttons">
                                <button class="btn btn-primary me-2" 
                                        id="save-${device.serialNumber}" 
                                        onclick="saveDeviceParameters('${device.serialNumber}')" 
                                        disabled>
                                    <i class="fas fa-save me-2"></i>Save Changes
                                </button>
                                <button class="btn btn-outline-secondary" 
                                        onclick="hideDeviceParameters('${device.serialNumber}')">
                                    <i class="fas fa-times me-2"></i>Cancel
                                </button>
                            </div>
                            <div class="changes-indicator" id="changes-${device.serialNumber}" style="display: none;">
                                <small class="text-warning">
                                    <i class="fas fa-exclamation-circle me-1"></i>Unsaved changes
                                </small>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Insert the parameters after the card
        targetCard.insertAdjacentHTML('afterend', parametersHtml);
        
        // Detect and set initial template state
        const detectedTemplate = detectCurrentTemplate(device);
        const templateSelector = document.querySelector(`[data-device="${device.serialNumber}"].template-selector`);
        if (templateSelector) {
            templateSelector.value = detectedTemplate;
            
            // Show/hide warning and set input states based on detected template
            toggleCustomWarning(device.serialNumber, detectedTemplate === 'custom');
            if (detectedTemplate !== 'custom') {
                enableParameterInputs(device.serialNumber, false);
            }
        }
        
        // Scroll to the parameters section
        const paramsElement = document.getElementById(`params-${device.serialNumber}`);
        if (paramsElement) {
            paramsElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }

    /**
     * Map device-agnostic parameter names to device-specific parameter names
     */
    function getDeviceSpecificParamName(genericParamName, deviceType) {
        const paramMapping = {
            'bInTripUploadMinSec': {
                'YabbyEdge': 'bMoveUploadMinSec',
                'default': 'bInTripUploadMinSec'
            },
            'bInTripLogMinSec': {
                'YabbyEdge': 'bMoveLogMinSec',
                'default': 'bInTripLogMinSec'
            },
            'fUploadDuring': {
                'YabbyEdge': 'fEnableMoveUploads',
                'default': 'fUploadDuring'
            },
            'fDisableMoveLogs': {
                'YabbyEdge': 'fDisableMoveLogs',
                'default': null // This parameter doesn't exist on non-YabbyEdge devices
            },
            'fGpsPowerMode': {
                'YabbyEdge': null, // This parameter doesn't exist on YabbyEdge devices
                'default': 'fGpsPowerMode'
            }
        };

        const mapping = paramMapping[genericParamName];
        if (!mapping) {
            return genericParamName; // No mapping needed, use as-is
        }

        return mapping[deviceType] || mapping['default'];
    }

    /**
     * Get device-specific template settings based on device type
     */
    function getDeviceSpecificTemplateSettings(templateSettings, deviceType) {
        const deviceSettings = {};

        for (const [genericParamName, value] of Object.entries(templateSettings)) {
            const deviceSpecificParamName = getDeviceSpecificParamName(genericParamName, deviceType);
            
            // Skip parameters that don't exist on this device type
            if (deviceSpecificParamName === null) {
                continue;
            }

            // Handle special cases for bTrackingMode
            if (genericParamName === 'bTrackingMode') {
                if (deviceType === 'YabbyEdge') {
                    // YabbyEdge: 0=Movement based, 1=Periodic Update
                    // Map template values: 0->0, 1->1, 2->1 (both 1 and 2 map to 1)
                    deviceSettings[deviceSpecificParamName] = (value === '0') ? '0' : '1';
                } else {
                    // Other devices: 0=GPS Movement, 1=Jostle, 2=Periodic Update
                    // Template value 1 (from daily-update) should map to 2 for non-Edge devices
                    if (value === '1') {
                        deviceSettings[deviceSpecificParamName] = '2';
                    } else {
                        deviceSettings[deviceSpecificParamName] = value;
                    }
                }
            } else {
                deviceSettings[deviceSpecificParamName] = value;
            }
        }

        return deviceSettings;
    }

    /**
     * Detect which template matches current device parameters
     */
    function detectCurrentTemplate(device) {
        if (!device.systemParameters || !PARAMETER_TEMPLATES) {
            console.log("No systemParameters or PARAMETER_TEMPLATES. Returning 'custom'");
            return 'custom';
        }

        console.log("System Parameters:", device.systemParameters);
        console.log("Device Type:", device.deviceType);

        // Check each template to see if it matches current parameters
        for (const [templateId, template] of Object.entries(PARAMETER_TEMPLATES)) {
            if (templateId === 'custom') continue;

            console.log(`\nChecking template: ${templateId}`);
            
            // Get device-specific template settings
            const deviceSpecificSettings = getDeviceSpecificTemplateSettings(template.settings, device.deviceType);
            console.log("Device-specific template settings:", deviceSpecificSettings);
            
            let matches = true;

            for (const [paramKey, templateValue] of Object.entries(deviceSpecificSettings)) {
                console.log(`  Looking for paramKey: ${paramKey}, expected value: ${templateValue}`);

                // Find the parameter in device data
                let currentValue = null;
                for (const [sectionId, sectionData] of Object.entries(device.systemParameters)) {
                    if (sectionData[paramKey] !== undefined) {
                        currentValue = sectionData[paramKey].toString();
                        console.log(`    Found in section '${sectionId}': currentValue = ${currentValue}`);
                        break;
                    }
                }

                if (currentValue === null) {
                    console.log(`    ❌ paramKey '${paramKey}' not found in device.systemParameters`);
                    matches = false;
                    break;
                }

                if (currentValue !== templateValue.toString()) {
                    console.log(`    ❌ Value mismatch for '${paramKey}': expected '${templateValue}', got '${currentValue}'`);
                    matches = false;
                    break;
                } else {
                    console.log(`    ✅ Match for '${paramKey}': '${currentValue}'`);
                }
            }

            if (matches) {
                console.log(`✅ Template '${templateId}' matches!`);
                return templateId;
            } else {
                console.log(`Template '${templateId}' did not match.`);
            }
        }

        console.log("No templates matched. Returning 'custom'");
        return 'custom';
    }

    /**
     * Toggle custom template warning visibility
     */
    function toggleCustomWarning(deviceSerial, show) {
        const warning = document.getElementById(`custom-warning-${deviceSerial}`);
        if (warning) {
            if (show) {
                warning.classList.remove('d-none');
            } else {
                warning.classList.add('d-none');
            }
        }
    }

    /**
     * Apply template settings to parameter inputs - UPDATED VERSION with device-specific mapping
     */
    function applyParameterTemplate(templateId, deviceSerial, deviceType) {
        const template = PARAMETER_TEMPLATES[templateId];
        
        if (!template || templateId === 'custom') {
            // Enable all inputs for custom mode
            enableParameterInputs(deviceSerial, true);
            return;
        }
        
        // Disable all parameter inputs FIRST
        enableParameterInputs(deviceSerial, false);
        
        // Apply template settings WITHOUT triggering change events
        const paramsContainer = document.getElementById(`params-${deviceSerial}`);
        if (!paramsContainer) return;
        
        // Set a flag to prevent markParameterAsChanged from switching to custom
        paramsContainer.setAttribute('data-applying-template', 'true');
        
        // Get device-specific template settings
        const deviceSpecificSettings = getDeviceSpecificTemplateSettings(template.settings, deviceType);
        
        Object.entries(deviceSpecificSettings).forEach(([paramKey, paramValue]) => {
            const input = paramsContainer.querySelector(`[data-param="${paramKey}"]`);
            if (input) {
                input.value = paramValue;
                
                // Mark as changed if different from original, but don't switch template
                const originalValue = input.getAttribute('data-original-value') || input.defaultValue;
                if (input.value !== originalValue) {
                    input.classList.add('changed');
                    
                    // Enable save button
                    const saveButton = document.getElementById(`save-${deviceSerial}`);
                    if (saveButton) {
                        saveButton.disabled = false;
                    }
                    
                    // Show changes indicator
                    const changesIndicator = document.getElementById(`changes-${deviceSerial}`);
                    if (changesIndicator) {
                        changesIndicator.style.display = 'block';
                    }
                    
                    // Add visual feedback to the parameter field
                    const parameterField = input.closest('.parameter-field');
                    if (parameterField) {
                        parameterField.classList.add('field-changed');
                    }
                }
            }
        });
        
        // Remove the flag after applying template
        setTimeout(() => {
            paramsContainer.removeAttribute('data-applying-template');

            toggleCustomWarning(deviceSerial, templateId === 'custom');
        }, 100);
    }

    /**
     * Enable or disable parameter inputs - FIXED VERSION
     */
    function enableParameterInputs(deviceSerial, enable) {
        const paramsContainer = document.getElementById(`params-${deviceSerial}`);
        if (!paramsContainer) return;
        
        // Select all parameter inputs but NOT the template selector
        const inputs = paramsContainer.querySelectorAll('.parameter-input:not(.template-selector)');
        
        inputs.forEach(input => {
            input.disabled = !enable;
            
            if (enable) {
                input.classList.remove('template-disabled');
                // Re-enable pointer events and remove visual disabled state
                input.style.pointerEvents = '';
                input.style.backgroundColor = '';
                input.style.borderColor = '';
                input.style.color = '';
                input.style.opacity = '';
            } else {
                input.classList.add('template-disabled');
                // Apply disabled styling
                input.style.pointerEvents = 'none';
                input.style.backgroundColor = '#f8f9fa';
                input.style.borderColor = '#e9ecef';
                input.style.color = '#6c757d';
                input.style.opacity = '0.65';
            }
        });
    }

    /**
     * Generate dropdown options based on parameter type - UPDATED VERSION
     */
    function generateDropdownOptions(paramKey, currentValue, deviceType) {
        let options = [];
        
        switch (paramKey) {
            case 'fGpsPowerMode':
                options = [
                    { value: '0', label: '0 - Low Power' },
                    { value: '1', label: '1 - Performance' }
                ];
                break;
                
            case 'bTrackingMode':
                if (deviceType === 'YabbyEdge') {
                    options = [
                        { value: '0', label: '0 - Movement based' },
                        { value: '1', label: '1 - Periodic Update' }
                    ];
                } else {
                    options = [
                        { value: '0', label: '0 - GPS Movement Trips' },
                        { value: '1', label: '1 - Jostle Trips' },
                        { value: '2', label: '2 - Periodic Update' }
                    ];
                }
                break;
                
            // Yes/No parameters
            case 'fUploadOnStart':
            case 'fUploadDuring':
            case 'fUploadOnEnd':
            case 'fUploadOnJostle':
            case 'fAvoidGpsWander':
            case 'fCellTowerFallback':
            case 'fPeriodicOnly':
            case 'fJostleTrips':
            case 'fEnableMoveUploads':
            case 'fDisableWakeFilter':
            case 'fDisableLogFilter':
                options = [
                    { value: '0', label: '0 - No' },
                    { value: '1', label: '1 - Yes' }
                ];
                break;
                
            // Inverted Yes/No parameters (0=Yes, 1=No)
            case 'fNoGpsFreshen':
            case 'fDisableMoveLogs':
                options = [
                    { value: '0', label: '0 - Yes' },
                    { value: '1', label: '1 - No' }
                ];
                break;
                
            case 'bDigital':
                options = [
                    { value: '255', label: '255 - None' },
                    { value: '0', label: '0 - Emulated Ignition (0)' },
                    { value: '1', label: '1 - Input 1' },
                    { value: '2', label: '2 - Input 2' },
                    { value: '3', label: '3 - Input 3' },
                    { value: '4', label: '4 - Input 4' },
                    { value: '5', label: '5 - Input 5' },
                    { value: '6', label: '6 - Input 6' },
                    { value: '7', label: '7 - Input 7' },
                    { value: '8', label: '8 - Input 8' },
                    { value: '9', label: '9 - Input 9' }
                ];
                break;
                
            case 'bPeriodicUploadHrMin':
                // 2 hours to 24 hours, even numbers only (in minutes)
                for (let hours = 2; hours <= 24; hours += 2) {
                    const minutes = hours * 60;
                    options.push({ 
                        value: minutes.toString(), 
                        label: `${minutes} min (${hours} hours)` 
                    });
                }
                break;
                
            // UPDATED: Limited movement logging and upload options
            case 'bInTripUploadMinSec':
            case 'bInTripLogMinSec':
            case 'bMoveUploadMinSec':
            case 'bMoveLogMinSec':
                const limitedOptions = [
                    { minutes: 5, seconds: 300 },
                    { minutes: 15, seconds: 900 },
                    { minutes: 30, seconds: 1800 },
                    { minutes: 60, seconds: 3600 }
                ];
                
                limitedOptions.forEach(option => {
                    options.push({ 
                        value: option.seconds.toString(), 
                        label: `${option.seconds} sec (${option.minutes} min)` 
                    });
                });
                break;
                
            case 'bGpsTimeoutMinSec':
                // 5 seconds to 2 minutes (120 seconds)
                const timeoutOptions = [5, 10, 15, 20, 30, 45, 60, 75, 90, 105, 120];
                timeoutOptions.forEach(seconds => {
                    if (seconds >= 60) {
                        const minutes = Math.floor(seconds / 60);
                        const remainingSeconds = seconds % 60;
                        const label = remainingSeconds > 0 ? 
                            `${seconds} sec (${minutes}m ${remainingSeconds}s)` : 
                            `${seconds} sec (${minutes} min)`;
                        options.push({ value: seconds.toString(), label });
                    } else {
                        options.push({ 
                            value: seconds.toString(), 
                            label: `${seconds} sec` 
                        });
                    }
                });
                break;
                
            case 'bMoveEndTimeSec_10':
                // 1 minute to 20 minutes (in seconds)
                for (let minutes = 1; minutes <= 20; minutes++) {
                    const seconds = minutes * 60;
                    options.push({ 
                        value: seconds.toString(), 
                        label: `${seconds} sec (${minutes} min)` 
                    });
                }
                break;
                
            case 'bOnceOffUploadDelayMinutes':
                // 0 to 20 minutes
                for (let minutes = 0; minutes <= 20; minutes++) {
                    const label = minutes === 0 ? '0 min (Disabled)' : `${minutes} min`;
                    options.push({ 
                        value: minutes.toString(), 
                        label 
                    });
                }
                break;
                
            case 'bGpsFixMultiplier':
                // 0 to 10 (reasonable range for multiplier)
                for (let i = 0; i <= 10; i++) {
                    const label = i === 0 ? '0 (Disabled)' : i === 1 ? '1 (Default)' : i.toString();
                    options.push({ 
                        value: i.toString(), 
                        label 
                    });
                }
                break;
                
            default:
                // For any parameter not specifically handled, return null to use text input
                return null;
        }
        
        return options;
    }

    /**
     * Handle template selection change - FIXED VERSION
     */
    window.handleTemplateChange = function(selectElement) {
        const templateId = selectElement.value;
        const deviceSerial = selectElement.dataset.device;
        const deviceType = selectElement.dataset.deviceType;
        
        // Ensure the dropdown shows the correct value
        selectElement.value = templateId;
        
        // Apply the template
        applyParameterTemplate(templateId, deviceSerial, deviceType);
    };

    /**
     * Mark parameter as changed - FIXED VERSION with template awareness
     */
    window.markParameterAsChanged = function(input) {
        // Don't mark template selector as changed
        if (input.classList.contains('template-selector')) {
            return;
        }
        
        // Check if we're currently applying a template
        const paramsContainer = input.closest('.device-parameters');
        if (paramsContainer && paramsContainer.getAttribute('data-applying-template') === 'true') {
            // Don't switch to custom mode when applying template
            input.classList.add('changed');
            return;
        }
        
        input.classList.add('changed');
        const deviceSerial = input.dataset.device;
        
        // Enable save button
        const saveButton = document.getElementById(`save-${deviceSerial}`);
        if (saveButton) {
            saveButton.disabled = false;
        }
        
        // Show changes indicator
        const changesIndicator = document.getElementById(`changes-${deviceSerial}`);
        if (changesIndicator) {
            changesIndicator.style.display = 'block';
        }
        
        // Add visual feedback to the parameter field
        const parameterField = input.closest('.parameter-field');
        if (parameterField) {
            parameterField.classList.add('field-changed');
        }
        
        // Only switch to custom if user manually changed a parameter (not during template application)
        const templateSelector = document.querySelector(`[data-device="${deviceSerial}"].template-selector`);
        if (templateSelector && templateSelector.value !== 'custom') {
            // User manually changed a parameter while a template was selected
            // Switch to custom mode and enable all inputs
            templateSelector.value = 'custom';
            enableParameterInputs(deviceSerial, true);
        }
    };

    window.hideDeviceParameters = function(serialNumber) {
        const paramsElement = document.getElementById(`params-${serialNumber}`);
        if (paramsElement) {
            paramsElement.remove();
        }
        currentEditingDevice = null;
    };

    /**
     * Save device parameters - Enhanced version with better feedback
     */
    window.saveDeviceParameters = async function(serialNumber = null) {
        // If no serialNumber provided, use currentEditingDevice (for backward compatibility)
        const device = serialNumber ? 
            digitalMatterDevices.find(d => d.serialNumber === serialNumber) : 
            currentEditingDevice;
        
        if (!device) return;
        
        const paramsContainer = document.getElementById(`params-${device.serialNumber}`);
        if (!paramsContainer) return;
        
        const changedInputs = paramsContainer.querySelectorAll('.parameter-input.changed');
        if (changedInputs.length === 0) {
            showAlert('No changes detected', 'info');
            return;
        }
        
        try {
            showAlert('Saving device parameters...', 'info');
            
            // Disable save button during save
            const saveButton = document.getElementById(`save-${device.serialNumber}`);
            if (saveButton) {
                saveButton.disabled = true;
                saveButton.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Saving...';
            }
            
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
                Devices: [device.serialNumber],
                ParamSections: Object.values(updatedParams)
            };
            
            // Make the PUT request
            await makeDigitalMatterCall(
                `/TrackingDevice/SetDeviceParameters/${device.productId}`,
                'PUT',
                requestBody
            );
            
            // Update local parameters
            Object.entries(updatedParams).forEach(([sectionId, sectionData]) => {
                Object.entries(sectionData.Params).forEach(([paramKey, paramValue]) => {
                    if (device.systemParameters[sectionId]) {
                        device.systemParameters[sectionId][paramKey] = paramValue;
                    }
                });
            });
            
            showParamStatus(device.serialNumber, 'Parameters updated successfully!', 'success');
            
            // Remove changed classes and visual indicators
            changedInputs.forEach(input => {
                input.classList.remove('changed');
                const parameterField = input.closest('.parameter-field');
                if (parameterField) {
                    parameterField.classList.remove('field-changed');
                }
            });
            
            // Hide changes indicator
            const changesIndicator = document.getElementById(`changes-${device.serialNumber}`);
            if (changesIndicator) {
                changesIndicator.style.display = 'none';
            }
            
            // Restore save button
            if (saveButton) {
                saveButton.disabled = true;
                saveButton.innerHTML = '<i class="fas fa-save me-2"></i>Save Changes';
            }
            
        } catch (error) {
            console.error('Error saving parameters:', error);
            showParamStatus(device.serialNumber, 'Error saving parameters: ' + error.message, 'error');
            
            // Restore save button on error
            const saveButton = document.getElementById(`save-${device.serialNumber}`);
            if (saveButton) {
                saveButton.disabled = false;
                saveButton.innerHTML = '<i class="fas fa-save me-2"></i>Save Changes';
            }
        }
    };

    /**
     * Show status bar notification (replaces toast system)
     */
    function showAlert(message, type = 'info') {
        // Remove existing status bar if present
        const existingBar = document.querySelector('.status-bar');
        if (existingBar) {
            hideStatusBar();
        }
        
        const iconMap = {
            'success': 'check-circle',
            'danger': 'exclamation-triangle',
            'warning': 'exclamation-triangle',
            'info': 'info-circle'
        };
        
        const statusBarHtml = `
            <div class="status-bar status-${type}" id="statusBar">
                <div class="status-bar-content">
                    <i class="fas fa-${iconMap[type]}"></i>
                    <span>${message}</span>
                </div>
                <button class="status-bar-close" onclick="hideStatusBar()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        document.body.insertAdjacentHTML('afterbegin', statusBarHtml);
        document.body.classList.add('status-bar-active');
        
        // Show with animation
        setTimeout(() => {
            const statusBar = document.getElementById('statusBar');
            if (statusBar) {
                statusBar.classList.add('show');
            }
        }, 10);
        
        // Auto-hide after 4 seconds for non-error messages
        if (type !== 'danger') {
            setTimeout(() => {
                hideStatusBar();
            }, 4000);
        }
    }

    /**
     * Hide status bar
     */
    window.hideStatusBar = function() {
        const statusBar = document.querySelector('.status-bar');
        if (statusBar) {
            statusBar.classList.remove('show');
            setTimeout(() => {
                statusBar.remove();
                document.body.classList.remove('status-bar-active');
            }, 300);
        }
    };

    /**
     * Show inline parameter status message
     */
    function showParamStatus(deviceSerial, message, type = 'success') {
        const paramsContainer = document.getElementById(`params-${deviceSerial}`);
        if (!paramsContainer) return;
        
        // Remove existing status messages
        const existingMessages = paramsContainer.querySelectorAll('.param-status-message');
        existingMessages.forEach(msg => msg.remove());
        
        const iconMap = {
            'success': 'check-circle',
            'error': 'exclamation-triangle'
        };
        
        const statusHtml = `
            <div class="param-status-message param-${type}">
                <i class="fas fa-${iconMap[type]}"></i>
                <span>${message}</span>
            </div>
        `;
        
        // Insert before the actions section
        const actionsDiv = paramsContainer.querySelector('.parameters-actions');
        if (actionsDiv) {
            actionsDiv.insertAdjacentHTML('beforebegin', statusHtml);
            
            // Auto-remove after 4 seconds
            setTimeout(() => {
                const statusMsg = paramsContainer.querySelector('.param-status-message');
                if (statusMsg) {
                    statusMsg.style.animation = 'slideInUp 0.3s ease reverse';
                    setTimeout(() => statusMsg.remove(), 300);
                }
            }, 4000);
        }
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

    /**
     * View recovery mode queues for a device
     */
    window.viewRecoveryMode = async function(serialNumber) {
        const device = digitalMatterDevices.find(d => d.serialNumber === serialNumber);
        if (!device) {
            showAlert('Device not found', 'danger');
            return;
        }
        
        // Check if recovery mode is already being shown for this device
        const existingRecovery = document.getElementById(`recovery-${serialNumber}`);
        if (existingRecovery) {
            // Toggle visibility
            if (existingRecovery.style.display === 'none') {
                existingRecovery.style.display = 'block';
            } else {
                existingRecovery.style.display = 'none';
            }
            return;
        }
        
        await showRecoveryModeInline(device);
    };

    /**
     * Show recovery mode interface inline
     */
    async function showRecoveryModeInline(device) {
        // Use pre-loaded recovery mode queues instead of making an API call
        const recoveryModeQueues = device.recoveryModeQueues || [];
        
        showRecoveryModeUI(device, recoveryModeQueues);
    }

    /**
     * Show recovery mode UI - Modified to handle current recovery mode status
     */
    function showRecoveryModeUI(device, queues) {
        // Find the device card
        const deviceCards = document.querySelectorAll('.device-card');
        let targetCard = null;
        
        deviceCards.forEach(card => {
            const cardText = card.textContent;
            if (cardText.includes(device.serialNumber)) {
                targetCard = card;
            }
        });
        
        if (!targetCard) return;
        
        // Create default expiry date (1 hour from now)
        const defaultExpiry = new Date();
        defaultExpiry.setHours(defaultExpiry.getHours() + 1);
        const defaultExpiryString = defaultExpiry.toISOString().slice(0, 16); // Format for datetime-local input
        
        // Check if device is currently in recovery mode
        const isInRecoveryMode = device.recoveryModeStatus === true;
        
        // Check if there are any active queues (this will disable the main action buttons)
        const hasActiveQueues = queues.length > 0;
        
        let recoveryHtml = `
            <div id="recovery-${device.serialNumber}" class="recovery-mode mt-3">
                <div class="recovery-container">
                    <div class="recovery-header mb-4">
                        <div class="d-flex align-items-center justify-content-between">
                            <div>
                                <h5 class="text-warning mb-1">
                                    <i class="fas fa-life-ring me-2"></i>Recovery Mode
                                </h5>
                                <p class="text-muted mb-0">${device.geotabName || device.serialNumber}</p>
                                ${isInRecoveryMode ? `
                                    <span class="badge bg-danger mt-1">
                                        <i class="fas fa-exclamation-triangle me-1"></i>Recovery Mode
                                    </span>
                                ` : `
                                    <span class="badge bg-success mt-1">
                                        <i class="fas fa-check-circle me-1"></i>Normal Mode
                                    </span>
                                `}
                            </div>
                            <button class="btn btn-outline-secondary btn-sm" onclick="hideRecoveryMode('${device.serialNumber}')">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    </div>
                    
                    <!-- Battery Usage Warning -->
                    <div class="alert alert-danger mb-4">
                        <div class="d-flex align-items-start">
                            <i class="fas fa-exclamation-triangle me-2 mt-1"></i>
                            <div>
                                <strong>Warning:</strong> Enabling recovery mode will cause the device to update much more frequently and use significantly more battery power until its expiration date. Use this feature only when necessary for device recovery.
                            </div>
                        </div>
                    </div>
                    
                    <div class="recovery-content">
                        <div class="recovery-actions mb-4">
                            <div class="row align-items-end">
                                <div class="col-md-6">
                                    <label for="expiryDate-${device.serialNumber}" class="form-label fw-semibold">
                                        Expiration Date & Time (EST)
                                    </label>
                                    <input type="datetime-local" 
                                        class="form-control" 
                                        id="expiryDate-${device.serialNumber}" 
                                        value="${defaultExpiryString}"
                                        min="${new Date().toISOString().slice(0, 16)}"
                                        ${isInRecoveryMode || hasActiveQueues ? 'disabled' : ''}>
                                </div>
                                <div class="col-md-6">
                                    ${isInRecoveryMode ? `
                                        <button class="btn btn-danger" 
                                                onclick="cancelCurrentRecoveryMode('${device.serialNumber}')"
                                                ${hasActiveQueues ? 'disabled' : ''}>
                                            <i class="fas fa-stop me-2"></i>Cancel Recovery Mode
                                        </button>
                                    ` : `
                                        <button class="btn btn-warning" 
                                                onclick="triggerRecoveryMode('${device.serialNumber}')"
                                                ${hasActiveQueues ? 'disabled' : ''}>
                                            <i class="fas fa-play me-2"></i>Trigger Recovery Mode
                                        </button>
                                    `}
                                    ${hasActiveQueues ? `
                                        <div class="text-muted small mt-2">
                                            <i class="fas fa-info-circle me-1"></i>
                                            Action disabled while queue entries are active
                                        </div>
                                    ` : ''}
                                </div>
                            </div>
                        </div>
        `;
        
        if (queues.length > 0) {
            recoveryHtml += `
                        <!-- Queue Update Disclaimer -->
                        <div class="alert alert-info mb-3">
                            <div class="d-flex align-items-start">
                                <i class="fas fa-info-circle me-2 mt-1"></i>
                                <div>
                                    <strong>Note:</strong> Queue changes will not take effect until the device updates again.
                                </div>
                            </div>
                        </div>
                        
                        <div class="recovery-queues">
                            <h6 class="mb-3">Active Recovery Mode Queues (${queues.length})</h6>
                            <div class="table-responsive">
                                <table class="table table-sm table-hover">
                                    <thead class="table-warning">
                                        <tr>
                                            <th>Status</th>
                                            <th>Expiration Date (EST)</th>
                                            <th>Pending Action</th>
                                            <th>Controls</th>
                                        </tr>
                                    </thead>
                                    <tbody>
            `;
            
            queues.forEach(queue => {
                const expiryDate = formatDateTimeEST(queue.ExpiryDateUTC);
                console.log("Original expiry date:", queue.ExpiryDateUTC, "Formatted:", expiryDate);
                const statusBadge = getStatusBadge(queue.MessageStatus);
                
                // Determine what action this queue entry will perform
                // If device is currently in recovery mode, queue entries will change it to normal mode
                // If device is currently in normal mode, queue entries will change it to recovery mode
                let pendingAction;
                let actionIcon;
                let actionClass;
                
                if (isInRecoveryMode) {
                    pendingAction = "Change to normal mode";
                    actionIcon = "fas fa-check-circle";
                    actionClass = "text-success";
                } else {
                    pendingAction = "Enable recovery mode";
                    actionIcon = "fas fa-exclamation-triangle";
                    actionClass = "text-warning";
                }
                
                recoveryHtml += `
                                        <tr>
                                            <td>${statusBadge}</td>
                                            <td>${expiryDate}</td>
                                            <td>
                                                <span class="${actionClass}">
                                                    <i class="${actionIcon} me-2"></i>${pendingAction}
                                                </span>
                                            </td>
                                            <td>
                                                <button class="btn btn-danger btn-sm" 
                                                        onclick="cancelRecoveryMode('${device.serialNumber}', '${queue.MessageId}')">
                                                    <i class="fas fa-times me-1"></i>Cancel
                                                </button>
                                            </td>
                                        </tr>
                `;
            });
            
            recoveryHtml += `
                                    </tbody>
                                </table>
                            </div>
                        </div>
            `;
        } else {
            recoveryHtml += `
                        <div class="recovery-empty text-center py-4">
                            <i class="fas fa-inbox fa-3x text-muted mb-3"></i>
                            <p class="text-muted mb-0">No active recovery mode queues</p>
                        </div>
            `;
        }
        
        recoveryHtml += `
                    </div>
                </div>
            </div>
        `;
        
        // Insert the recovery mode UI after the card
        targetCard.insertAdjacentHTML('afterend', recoveryHtml);
        
        // Scroll to the recovery mode section
        const recoveryElement = document.getElementById(`recovery-${device.serialNumber}`);
        if (recoveryElement) {
            recoveryElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }

    /**
     * Format datetime from UTC ISO string to EST
     */
    function formatDateTimeEST(isoString) {
        // Force interpret as UTC by appending Z if missing
        const utcString = isoString.endsWith("Z") ? isoString : isoString + "Z";
        const date = new Date(utcString);

        return date.toLocaleString('en-US', {
            timeZone: 'America/New_York',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    }


    /**
     * Get status badge HTML based on message status
     */
    function getStatusBadge(status) {
        const statusMap = {
            'Pending': 'bg-warning text-dark',
            'Sent': 'bg-success',
            'Failed': 'bg-danger',
            'Cancelled': 'bg-secondary',
            'Expired': 'bg-dark'
        };
        
        const badgeClass = statusMap[status] || 'bg-info';
        return `<span class="badge ${badgeClass}">${status}</span>`;
    }

    /**
     * Cancel current recovery mode for a device
     */
    window.cancelCurrentRecoveryMode = async function(serialNumber) {
        try {
            showAlert('Cancelling current recovery mode...', 'info');
            
            // Create expiry date 1 year from now
            const expiryDate = new Date();
            expiryDate.setFullYear(expiryDate.getFullYear() + 1);
            
            const requestBody = {
                MessageType: 3,
                CANAddress: 4294967295,
                Data: [1], // Cancel recovery mode
                ExpiryDateUTC: expiryDate.toISOString()
            };
            
            await makeDigitalMatterCall(`/AsyncMessaging/Send?serial=${serialNumber}`, 'POST', requestBody);
            
            showAlert('Recovery mode cancelled successfully!', 'success');
            
            // Update the device's recovery mode status and queues
            const device = digitalMatterDevices.find(d => d.serialNumber === serialNumber);
            if (device) {
                try {
                    // Refresh device parameters to get updated recovery mode status
                    const deviceType = PRODUCT_ID_TO_DEVICE_TYPE[device.productId];
                    if (deviceType) {
                        const response = await makeDigitalMatterCall(
                            `/v1/${deviceType}/Get?product=${device.productId}&id=${device.serialNumber}`
                        );
                        if (response && response.SystemParameters) {
                            device.systemParameters = response.SystemParameters;
                            device.recoveryModeStatus = response.RecoveryMode;
                        }
                    }
                    
                    // Refresh recovery mode queues
                    const queueResponse = await makeDigitalMatterCall(`/AsyncMessaging/Get?serial=${serialNumber}`);
                    const recoveryModeQueues = queueResponse.filter(item => 
                        item.MessageType === 3 && item.CANAddress === 4294967295
                    );
                    device.recoveryModeQueues = recoveryModeQueues;
                    
                    // Re-render devices to update badge count
                    renderDevices();
                } catch (error) {
                    console.warn('Could not refresh device status after cancelling recovery mode');
                }
            }
            
            // Refresh the recovery mode display
            setTimeout(() => {
                hideRecoveryMode(serialNumber);
                viewRecoveryMode(serialNumber);
            }, 1000);
            
        } catch (error) {
            console.error('Error cancelling current recovery mode:', error);
            showAlert('Error cancelling recovery mode: ' + error.message, 'danger');
        }
    };

    /**
     * Trigger recovery mode for a device
     */
    window.triggerRecoveryMode = async function(serialNumber) {
        try {
            // Get the expiry date from the input
            const expiryInput = document.getElementById(`expiryDate-${serialNumber}`);
            if (!expiryInput) {
                showAlert('Error: Could not find expiration date input', 'danger');
                return;
            }
            
            const expiryValue = expiryInput.value;
            if (!expiryValue) {
                showAlert('Please select an expiration date and time', 'warning');
                return;
            }
            
            // Convert to Date object and validate it's in the future
            const expiryDate = new Date(expiryValue);
            const now = new Date();
            
            if (expiryDate <= now) {
                showAlert('Expiration date must be in the future', 'warning');
                return;
            }
            
            showAlert('Triggering recovery mode...', 'info');
            
            // Pass the expiry date to the API call
            const requestBody = {
                MessageType: 3,
                CANAddress: 4294967295,
                Data: [3],
                ExpiryDateUTC: expiryDate.toISOString()
            };
            
            await makeDigitalMatterCall(`/AsyncMessaging/Send?serial=${serialNumber}`, 'POST', requestBody);
            
            showAlert(`Recovery mode triggered successfully! Expires: ${expiryDate.toLocaleString()}`, 'success');
            
            // Update the device's recovery mode status and queues
            const device = digitalMatterDevices.find(d => d.serialNumber === serialNumber);
            if (device) {
                try {
                    // Refresh device parameters to get updated recovery mode status
                    const deviceType = PRODUCT_ID_TO_DEVICE_TYPE[device.productId];
                    if (deviceType) {
                        const response = await makeDigitalMatterCall(
                            `/v1/${deviceType}/Get?product=${device.productId}&id=${device.serialNumber}`
                        );
                        if (response && response.SystemParameters) {
                            device.systemParameters = response.SystemParameters;
                            device.recoveryModeStatus = response.RecoveryMode;
                        }
                    }
                    
                    // Refresh recovery mode queues
                    const queueResponse = await makeDigitalMatterCall(`/AsyncMessaging/Get?serial=${serialNumber}`);
                    const recoveryModeQueues = queueResponse.filter(item => 
                        item.MessageType === 3 && item.CANAddress === 4294967295
                    );
                    device.recoveryModeQueues = recoveryModeQueues;
                    
                    // Re-render devices to update badge count
                    renderDevices();
                } catch (error) {
                    console.warn('Could not refresh device status after triggering recovery mode');
                }
            }
            
            // Refresh the recovery mode display
            setTimeout(() => {
                hideRecoveryMode(serialNumber);
                viewRecoveryMode(serialNumber);
            }, 1000);
            
        } catch (error) {
            console.error('Error triggering recovery mode:', error);
            showAlert('Error triggering recovery mode: ' + error.message, 'danger');
        }
    };

    /**
     * Cancel a recovery mode queue - Modified to refresh local data
     */
    window.cancelRecoveryMode = async function(serialNumber, messageId) {
        try {
            showAlert('Cancelling recovery mode queue...', 'info');
            
            await makeDigitalMatterCall(`/AsyncMessaging/Cancel?serial=${serialNumber}&id=${messageId}`);
            
            showAlert('Recovery mode queue cancelled successfully!', 'success');
            
            // Update the device's recovery mode queues
            const device = digitalMatterDevices.find(d => d.serialNumber === serialNumber);
            if (device) {
                try {
                    const response = await makeDigitalMatterCall(`/AsyncMessaging/Get?serial=${serialNumber}`);
                    const recoveryModeQueues = response.filter(item => 
                        item.MessageType === 3 && item.CANAddress === 4294967295
                    );
                    device.recoveryModeQueues = recoveryModeQueues;
                    
                    // Re-render devices to update badge count
                    renderDevices();
                } catch (error) {
                    console.warn('Could not refresh recovery mode queues after cancelling');
                }
            }
            
            // Refresh the recovery mode display
            setTimeout(() => {
                hideRecoveryMode(serialNumber);
                viewRecoveryMode(serialNumber);
            }, 1000);
            
        } catch (error) {
            console.error('Error cancelling recovery mode:', error);
            showAlert('Error cancelling recovery mode: ' + error.message, 'danger');
        }
    };

    /**
     * Hide recovery mode interface
     */
    window.hideRecoveryMode = function(serialNumber) {
        const recoveryElement = document.getElementById(`recovery-${serialNumber}`);
        if (recoveryElement) {
            recoveryElement.remove();
        }
    };

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