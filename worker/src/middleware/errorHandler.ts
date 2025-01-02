export function errorHandler(error: unknown, corsHeaders: Record<string, string>): Response {
  console.error('Error:', error);
  
  const response = new Response(
    JSON.stringify({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    }),
    {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    }
  );
  
  return response;
} 