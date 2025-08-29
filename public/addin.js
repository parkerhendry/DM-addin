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
            'fDisableMoveLogs': 'Log During Movement - Record locations while moving (disable to save battery).',
            'fEnableMoveUploads': 'Upload During Movement - Sends updates while moving. ⚠️ Increases battery use.'
        }
        }
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
                }
            } catch (error) {
                console.warn(`Could not get system parameters for device ${device.serialNumber}:`, error);
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

    /**
     * Generate dropdown options based on parameter type
     */
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
        
        // Scroll to the parameters section
        const paramsElement = document.getElementById(`params-${device.serialNumber}`);
        if (paramsElement) {
            paramsElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }

    // Replace the existing generateDropdownOptions function:
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
                        { value: '0', label: '0 - Movement (accelerometer) based' },
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
                
            case 'bInTripUploadMinSec':
            case 'bInTripLogMinSec':
            case 'bMoveUploadMinSec':
                // 1 minute to 60 minutes (in seconds)
                for (let minutes = 1; minutes <= 60; minutes++) {
                    const seconds = minutes * 60;
                    options.push({ 
                        value: seconds.toString(), 
                        label: `${seconds} sec (${minutes} min)` 
                    });
                }
                break;
                
            case 'bMoveLogMinSec':
                // 30 seconds to 30 minutes (in seconds)
                const moveLogOptions = [30, 60, 120, 180, 300, 600, 900, 1200, 1500, 1800];
                moveLogOptions.forEach(seconds => {
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
     * Mark parameter as changed - Enhanced version with visual feedback
     */
    window.markParameterAsChanged = function(input) {
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