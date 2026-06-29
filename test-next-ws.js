const { WebSocket } = require('ws');
const ws = new WebSocket("ws://localhost:3000/");
ws.on('open', () => { console.log("Connected!"); ws.close(); });
ws.on('error', (err) => console.log("Error:", err.message));
ws.on('unexpected-response', (req, res) => console.log("Unexpected response:", res.statusCode));
