exports.handler = async (event, context) => {
  const DM_API_BASE = 'https://api.oemserver.com/v1';
  const DM_API_TOKEN = 'hUpEcwaVfthLqxMOP8MirN.tFoswRLau5YFaBRTicD_vUt2TKc8_LefBgLK7J1a02w7.1';

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      }
    };
  }

  try {
    const { serial } = event.queryStringParameters || {};
    
    if (!serial) {
      throw new Error('Serial parameter is required');
    }

    // Create expiry date 1 hour from now
    const expiryDate = new Date();
    expiryDate.setHours(expiryDate.getHours() + 1);

    const requestBody = {
      MessageType: 3,
      CANAddress: 4294967295,
      Data: [3],
      ExpiryDateUTC: expiryDate.toISOString()
    };

    const response = await fetch(`${DM_API_BASE}/AsyncMessaging/Send?serial=${serial}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DM_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: error.message })
    };
  }
};