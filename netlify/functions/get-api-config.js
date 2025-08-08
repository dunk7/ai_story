exports.handler = async (event, context) => {
  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Get environment variables from Netlify
    const grokApiKey = process.env.GROK_API_KEY;
    const novitaApiKey = process.env.NOVITA_API_KEY;

    // Check if environment variables are set
    if (!grokApiKey || !novitaApiKey) {
      console.error('Missing environment variables:', {
        hasGrok: !!grokApiKey,
        hasNovita: !!novitaApiKey
      });
      
      return {
        statusCode: 500,
        body: JSON.stringify({ 
          error: 'API keys not configured. Please set GROK_API_KEY and NOVITA_API_KEY environment variables in Netlify.' 
        })
      };
    }

    // Return the API configuration
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      },
      body: JSON.stringify({
        grokApiKey: grokApiKey,
        novitaApiKey: novitaApiKey
      })
    };
  } catch (error) {
    console.error('Error in get-api-config function:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Internal server error' 
      })
    };
  }
};