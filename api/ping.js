exports.handler = async function(event, context) {
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ok: true, ts: new Date().toISOString(), path: event.path })
  };
};