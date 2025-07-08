const WebSocket = require('./node_modules/ws');

const PORT = 8080;
const wss = new WebSocket.Server({ port: PORT });

let messages = []; // All messages with IDs for later clients
let nextMessageId = 1;

// Tracks connected clients and their last received message ID
const clients = new Map(); // Map<WebSocket, { lastReceivedId: number }>

console.log(`Chat server running on ws://localhost:${PORT}`);

// Send a batch of messages to a client, skipping ones it already received
function sendMissingMessages(ws, lastReceivedId) {
  const unseenMessages = messages.filter(msg => msg.id > lastReceivedId);
  unseenMessages.forEach(msg => ws.send(JSON.stringify({ type: 'message', payload: msg })));
}

wss.on('connection', (ws) => {
  console.log('New client connected');

  // Wait for client to identify with last received message ID
  ws.on('message', (data) => {
    let message;
    try {
      message = JSON.parse(data);
    } catch (e) {
      ws.send(JSON.stringify({ type: 'error', payload: 'Invalid JSON' }));
      return;
    }

    // Handle client initialization || New client sends last received ID
    if (message.type === 'init') {
      const lastReceivedId = message.payload?.lastReceivedId || 0;
      // Store client metadata for future use
      clients.set(ws, { lastReceivedId });
      // Send only messages the client hasn't seen yet
      sendMissingMessages(ws, lastReceivedId);
      return;
    }

    // Broadcast message to all connected clients
    if (message.type === 'message') {
      const newMessage = {
        id: nextMessageId++, // Unique message ID to maintain order
        text: message.payload.text,
        timestamp: Date.now(), // Timestamp for ordering/UX
      };
      // Store in memory for new clients 
      messages.push(newMessage);

      // Broadcast to all connected clients
      for (let [client, meta] of clients.entries()) {
        try {
          // Send the message to each client
          client.send(JSON.stringify({ type: 'message', payload: newMessage }));
          // Update last received ID for that client
          meta.lastReceivedId = newMessage.id;
        } catch (err) {
          console.log('Error sending to client, removing...');
          clients.delete(client);
        }
      }
    }
  });

  // Handle disconnections
  ws.on('close', () => {
    console.log('Client disconnected');
    clients.delete(ws);
  });
});