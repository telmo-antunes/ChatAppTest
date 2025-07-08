import React, { useEffect, useRef, useState } from 'react';

const WS_URL = 'ws://localhost:8080';

export default function ChatClient() {
// Stores all received chat messages in order
  const [messages, setMessages] = useState([]);
  // Stores the current input in the text field
  const [input, setInput] = useState('');
  const ws = useRef(null);
  // Keeps track of the last received message ID to avoid duplicates
  const lastReceivedId = useRef(0);

  // Connect to WebSocket
  const connect = () => {
    ws.current = new WebSocket(WS_URL);

    // When WebSocket connection opens
    ws.current.onopen = () => {
      console.log('Connected to server');
      // Send stored messages to new connections
      // Use lastReceivedId to get only missed messages
      ws.current.send(
        JSON.stringify({
          type: 'init',
          payload: { lastReceivedId: lastReceivedId.current },
        })
      );
    };

    // When a message is received from the server
    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'message') {
        // Maintain message order and avoid duplicates
        lastReceivedId.current = data.payload.id;
        // Add new message to the UI
        setMessages((prev) => [...prev, data.payload]);
      }
    };

    // Handle disconnection and reconnect
    ws.current.onclose = () => {
      console.log('Disconnected. Reconnecting in 1s...');
      setTimeout(connect, 1000);
    };

    // Close WebSocket on error
    ws.current.onerror = (err) => {
      console.error('WebSocket error: ', err);
      ws.current.close();
    };
  };


  // Set up connection on component mount
  useEffect(() => {
    connect();
    return () => {
      ws.current?.close();
    };
  }, []);

  // Sends a message to the server (broadcast)
  const sendMessage = () => {
    if (input.trim()) {
      ws.current.send(JSON.stringify({ type: 'message', payload: { text: input } }));
      setInput('');
    }
  };

  return (
    <div style={styles.container}>
      <h2>Chat Room</h2>
      <div style={styles.chatBox}>
        {messages.map((msg) => (
          <div key={msg.id} style={styles.message}>
            <span style={styles.timestamp}>
              {new Date(msg.timestamp).toLocaleTimeString()}:
            </span>{' '}
            {msg.text}
          </div>
        ))}
      </div>
      <div style={styles.inputRow}>
        <input
          style={styles.input}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message..."
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
        />
        <button style={styles.button} onClick={sendMessage}>
          Send
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '600px',
    margin: '40px auto',
    fontFamily: 'Arial, sans-serif',
  },
  chatBox: {
    border: '1px solid #ccc',
    height: '300px',
    overflowY: 'auto',
    padding: '10px',
    backgroundColor: '#f9f9f9',
    marginBottom: '10px',
  },
  message: {
    marginBottom: '5px',
  },
  timestamp: {
    color: '#999',
    fontSize: '0.85em',
  },
  inputRow: {
    display: 'flex',
  },
  input: {
    flex: 1,
    padding: '10px',
    fontSize: '1em',
    borderRadius: '4px 0 0 4px',
    border: '1px solid #ccc',
  },
  button: {
    padding: '10px 20px',
    fontSize: '1em',
    borderRadius: '0 4px 4px 0',
    border: '1px solid #ccc',
    backgroundColor: '#007bff',
    color: 'white',
    cursor: 'pointer',
  },
};