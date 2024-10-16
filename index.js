const express = require("express");
const { createServer } = require('node:http');
const { Server } = require('socket.io');
const cors = require('cors');
const MyFrontend = "http://127.0.0.1:5500"
const {connectToOpcUaClient, MyScada} = require("./modules/opcUa");

const port = 8080;
const app = express();
const server = createServer(app);
const io = new Server(server, {
    cors: {
        origin: MyFrontend, // Replace with the exact URL where your index.html is hosted
        methods: ["GET", "POST"],
        credentials: true // Optional, include if you are using cookies or need credentials
    }
});

app.get("/ConnectOPC", (req, res) => {
    connectToOpcUaClient();
});


app.use(express.json());
app.use(cors({
    origin: MyFrontend, // Same as above
    methods: ["GET", "POST"],
    credentials: true // Optional, include if needed
}));

app.get("/", (req, res) => {
    res.send(MyScada);
});

io.on('connection', (socket) => {
    console.log('A user connected');

    // Send the MyScada value every second to the connected client
    setInterval(() => {
        socket.emit('scadaData', MyScada);
    }, 1000);

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

// app.listen(port,()=>{
//     console.log("Server start");
// })
server.listen(port, () => {
    console.log(`server running at http://localhost:${port}`);
});