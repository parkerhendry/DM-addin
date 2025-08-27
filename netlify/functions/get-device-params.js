exports.handler = async (event, context) => {
  const DM_API_BASE = 'https://api.oemserver.com/v1';
  const DM_API_TOKEN = 'hUpEcwaVfthLqxMOP8MirN.tFoswRLau5YFaBRTicD_vUt2TKc8_LefBgLK7J1a02w7.1';

  try {
    const { deviceType, product, id } = event.queryStringParameters;

    if (!deviceType || !product || !id) {
      throw new Error('DeviceType, Product and ID parameters are required');
    }

    const response = await fetch(`${DM_API_BASE}/v1/${deviceType}/Get?product=${product}&id=${id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${DM_API_TOKEN}`,
        'Content-Type': 'application/json'
      }
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