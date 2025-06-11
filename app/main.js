import { Socket } from "dgram";
import net from "net";

// You can use print statements as follows for debugging, they'll be visible when running tests.
console.log("Logs from your program will appear here!");

const crlf = "\r\n\r\n";

const statusline_200 = () => {
    const httVersion = "HTTP/1.1";
    const statusCode = "200";
    const reasonPhrase = "OK";
    const response = `${httVersion} ${statusCode} ${reasonPhrase}${crlf}`;

    return response;
};

const statusline_404 = () => {
    const httVersion = "HTTP/1.1";
    const statusCode = "404";
    const reasonPhrase = "Not Found";

    const response = `${httVersion} ${statusCode} ${reasonPhrase}${crlf}`;

    return response;
};

// GET /index.html HTTP/1.1\r\nHost: localhost:4221\r\nUser-Agent: curl/7.64.1\r\nAccept: */*\r\n\r\n
// GET /abcdefg HTTP/1.1
// Host: localhost:4221
// User-Agent: curl/8.12.1
// Accept: */*

const server = net.createServer((socket) => {
    socket.on("data", (data) => {
        const request = data.toString();
        const request_line = request.split(crlf)[0];
        const [method, slug] = request_line.split(" ");
        console.log(method, slug);

        if (slug == "/") {
            socket.write(statusline_200());
        } else {
            socket.write(statusline_404());
        }
    });
});

server.listen(4221, "localhost");
