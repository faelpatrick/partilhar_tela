// Server code for screen sharing with WebSocket
const WebSocket = require('ws');
const http = require('http');
const express = require('express');
const app = express();

const PORT = 3000;
const PASSWORD = "12345"; // Temporary password

let broadcaster = null;
const viewers = [];

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Serve static files
app.use(express.static('public'));

// WebSocket connection
wss.on('connection', (ws, req) => {
  let role = "viewer";

  ws.on('message', (message) => {
    const data = JSON.parse(message);

    if (data.type === "auth") {
      if (data.password === PASSWORD) {
        role = "broadcaster";
        broadcaster = ws;
        console.log("Broadcaster connected.");
      } else {
        ws.send(JSON.stringify({ type: "error", message: "Invalid password." }));
        ws.close();
      }
    } else if (data.type === "offer" && broadcaster) {
      // Offer from viewer to broadcaster
      if (role === "viewer" && broadcaster) {
        broadcaster.send(JSON.stringify(data));
      }
    } else if (data.type === "answer" && role === "broadcaster") {
      // Answer from broadcaster to viewer
      const targetViewer = viewers.find((viewer) => viewer.id === data.target);
      if (targetViewer) {
        targetViewer.ws.send(JSON.stringify(data));
      }
    } else if (data.type === "candidate") {
      // Ice candidate
      if (role === "broadcaster") {
        const targetViewer = viewers.find((viewer) => viewer.id === data.target);
        if (targetViewer) {
          targetViewer.ws.send(JSON.stringify(data));
        }
      } else {
        broadcaster.send(JSON.stringify({ ...data, target: ws.id }));
      }
    }
  });

  ws.on('close', () => {
    if (role === "broadcaster") {
      console.log("Broadcaster disconnected.");
      broadcaster = null;
    } else {
      console.log("Viewer disconnected.");
      const index = viewers.findIndex((v) => v.ws === ws);
      if (index !== -1) viewers.splice(index, 1);
    }
  });

  // Assign unique ID for each viewer
  if (role === "viewer") {
    const id = Math.random().toString(36).substr(2, 9);
    ws.id = id;
    viewers.push({ id, ws });
    ws.send(JSON.stringify({ type: "id", id }));
  }
});

server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
