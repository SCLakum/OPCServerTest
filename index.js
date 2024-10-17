const express = require("express");
const path = require('path');
const { createServer } = require('node:http');
const { Server } = require('socket.io');
const cors = require('cors');
const MyFrontend = "https://scada-online-test-frontend.vercel.app"; // Replace with your hosted frontend URL
const { connectToOpcUaClient, MyScada } = require("./modules/opcUa");

const port = 3000;
const app = express();
const server = createServer(app);
const io = new Server(server, {
    cors: {
        origin: MyFrontend, // Replace with the exact URL where your index.html is hosted
        methods: ["GET", "POST"],
        credentials: true // Include if you are using cookies or need credentials
    }
});

// Connect to OPC UA client
connectToOpcUaClient();

// Middleware setup
app.use(express.json());
app.use(cors({
    origin: MyFrontend, // Same as above
    methods: ["GET", "POST"],
    credentials: true // Include if needed
}));

// Serve static files from the 'public' directory
// app.use(express.static(path.join(__dirname, 'public')));

// Serve the index.html file
app.get('/', (req, res) => {
    res.send(MyScada);
});

// Handle Socket.IO connections
io.on('connection', (socket) => {
    console.log('A user connected');

    // Send the MyScada value every second to the connected client
    const interval = setInterval(() => {
        socket.emit('scadaData', MyScada);
    }, 1000);

    socket.on('disconnect', () => {
        console.log('User disconnected');
        clearInterval(interval); // Clear interval when user disconnects
    });
});

// Start the server
server.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
