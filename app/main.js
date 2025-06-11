import net from "net";

// You can use print statements as follows for debugging, they'll be visible when running tests.
console.log("Logs from your program will appear here!");

// Uncomment this to pass the first stage
const server = net.createServer((socket) => {
    const httVersion = "HTTP/1.1";
    const statusCode = "200";
    const reasonPhrase = "OK";
    const crlf = "\r\n\r\n";

    socket.write(`${httVersion} ${statusCode} ${reasonPhrase}${crlf}`);
    socket.on("close", () => {
        socket.end();
    });
});

server.listen(4221, "localhost");
