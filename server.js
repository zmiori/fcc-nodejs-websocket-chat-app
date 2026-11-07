import http from 'http';
import fs from 'fs';
import { WebSocketServer } from 'ws';
import path from "path"

const PORT = 3001;

const server = http.createServer((req, res) => {
    // fs.readFile("./public/index.html", (err, data) => {
    //     res.writeHead(200, { "Content-Type": "text/html" })
    //     res.end(data);

    // })

    if (req.url === '/' || req.url === '/index.html') {
        fs.readFile("./public/index.html", (err, data) => {
            if (err) {
                res.writeHead(500);
                return res.end("Error loading index.html");
            }
            res.writeHead(200, { "Content-Type": "text/html" });
            res.end(data);
        });
    } 
    else {
        const safeUrl = path.normalize(req.url).replace(/^(\.\.(\/|\\|$))+/, '');
        const filePath = path.join("./public", safeUrl);

        fs.readFile(filePath, (err, data) => {
            if (err) {
                res.writeHead(404, { "Content-Type": "text/plain" });
                res.end("404 Not Found");
                return;
            }

            let contentType = "text/plain";
            if (filePath.endsWith(".js")) contentType = "application/javascript";
            if (filePath.endsWith(".css")) contentType = "text/css";

            res.writeHead(200, { "Content-Type": contentType });
            res.end(data);
        });
    }

})

const wss = new WebSocketServer({ server });

wss.on("connection", (socket, req) => {
    const username = new URL(req.url, "http://localhost").searchParams.get(
        "username",
    );

    const activeClients = [...(wss.clients || [])]?.filter(c => c.readyState === WebSocket.OPEN)
    activeClients.forEach(c => { c.send(JSON.stringify({ "type": "system", "text": username + " joined" })) })

    socket.on("message", (rawData) => {
        const parsed = JSON.parse(rawData.toString())
        const { username, text } = parsed;

        const activeClients = [...(wss.clients || [])]?.filter(c => c.readyState === WebSocket.OPEN)
        activeClients.forEach(c => { c.send(JSON.stringify({ type: 'chat', username, text })) })

    })

    socket.on("close", () => {
        const activeClients = [...(wss.clients || [])]?.filter(c => c.readyState === WebSocket.OPEN)
        activeClients.forEach(c => { c.send(JSON.stringify({ type: 'system', text: username + ' left' })) })

    })
})



server.listen(PORT, () => console.log(`Chat server running at http://localhost:${PORT}`))
