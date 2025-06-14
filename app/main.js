import net from "net";
import fs from "fs";
import path from "path";
import zlib from "zlib";

console.log("server is running...");

const crlf = "\r\n";
const workingDir = process.cwd();
const dirArgIndex = process.argv.indexOf("--directory");
const baseDirectory =
    dirArgIndex !== -1 ? process.argv[dirArgIndex + 1] : workingDir;

// --- status lines ---
const get_statusline_200 = () => {
    const httVersion = "HTTP/1.1";
    const statusCode = "200";
    const reasonPhrase = "OK";
    return `${httVersion} ${statusCode} ${reasonPhrase}${crlf}`;
};

const statusline_404 = () => {
    const httVersion = "HTTP/1.1";
    const statusCode = "404";
    const reasonPhrase = "Not Found";
    const body = "404 Not Found";

    const content_type = `Content-Type: text/plain${crlf}`;
    const content_length = `Content-Length: ${body.length}${crlf}`;

    return `${httVersion} ${statusCode} ${reasonPhrase}${crlf}${content_type}${content_length}${crlf}${body}`;
};

// --- headers ---
const get_response_header = (
    content,
    type = "text/plain",
    compression_type,
    connection_type,
) => {
    const content_type = `Content-Type: ${type}${crlf}`;
    const contentLength = Buffer.isBuffer(content)
        ? content.length
        : Buffer.byteLength(content, "utf8");
    const content_length = `Content-Length: ${contentLength}${crlf}`;

    let headers = content_type + content_length;

    if (compression_type) {
        headers += `Content-Encoding: ${compression_type}${crlf}`;
    }

    if (connection_type) {
        headers += `Connection: ${connection_type}${crlf}`;
    }

    return headers + crlf;
};

// --- body ---
const get_response_body = (content) => {
    return content;
};

const getEndPoint = (str) => {
    const str_length = str.split("/").length;
    return str.split("/")[str_length - 1];
};

const getBody = (content) => {
    return content[content.length - 1];
};

const parseHeader = (request) => {
    const lines = request.split(crlf);

    let headers = {};

    for (let i = 1; i < lines.length; i++) {
        let line = lines[i];

        if (line != "") {
            let [key, value] = line.split(": ");
            headers[key.toLowerCase()] = value;
        }
    }

    return headers;
};

const server = net.createServer((socket) => {
    socket.on("data", (data) => {
        const request = data.toString();
        const request_line = request.split(crlf)[0];
        const [method, slug] = request_line.split(" ");
        const headers = parseHeader(request);
        const acceptEncoding = headers["accept-encoding"];
        const connectionType =
            headers["connection"] === "close" ? "close" : undefined;
        console.log(headers["connection"]);

        if (method == "GET") {
            if (slug === "/") {
                const content = "";

                const status_line = get_statusline_200();
                const header = get_response_header(
                    content,
                    "text/plain",
                    undefined,
                    connectionType,
                );
                const body = get_response_body(content);

                const response = `${status_line}${header}${body}`;
                socket.write(response);
            } else if (slug.startsWith("/echo/")) {
                const content = getEndPoint(slug);
                const status_line = get_statusline_200();

                const shouldCompress =
                    acceptEncoding && acceptEncoding.includes("gzip");

                let responseContent;
                let compressionType;

                if (shouldCompress) {
                    // compressed content
                    responseContent = zlib.gzipSync(content);
                    compressionType = "gzip";
                } else {
                    // uncompressed content
                    responseContent = content;
                    compressionType = undefined;
                }

                const header = get_response_header(
                    responseContent,
                    "text/plain",
                    compressionType,
                    connectionType,
                );

                const statusAndHeaders = status_line + header;
                const statusAndHeadersBuffer = Buffer.from(
                    statusAndHeaders,
                    "utf8",
                );
                const contentBuffer = Buffer.isBuffer(responseContent)
                    ? responseContent
                    : Buffer.from(responseContent, "utf8");

                const response = Buffer.concat([
                    statusAndHeadersBuffer,
                    contentBuffer,
                ]);
                socket.write(response);
            } else if (slug.startsWith("/user-agent")) {
                const lines = data.toString().split(crlf);
                const [user_agent] = lines.filter((line) =>
                    line.toLowerCase().startsWith("user-agent"),
                );
                const [_, content] = user_agent.split(" ");

                const status_line = get_statusline_200();
                const header = get_response_header(
                    content,
                    "text/plain",
                    undefined,
                    connectionType,
                );
                const body = get_response_body(content);

                const response = `${status_line}${header}${body}`;
                console.log(response);

                socket.write(response);
            } else if (slug.startsWith("/files/")) {
                const fileName = getEndPoint(slug);
                const pathName = path.join(baseDirectory, fileName);

                if (fs.existsSync(pathName)) {
                    const fileContent = fs.readFileSync(pathName, "utf8");
                    const content = fileContent;
                    const status_line = get_statusline_200();
                    const header = get_response_header(
                        content,
                        "application/octet-stream",
                        undefined,
                        connectionType,
                    );
                    const body = get_response_body(content);

                    const response = `${status_line}${header}${body}`;

                    socket.write(response);
                } else {
                    const status_line = statusline_404();
                    socket.write(status_line);
                }
            } else {
                socket.write(statusline_404());
            }
        } else if (method == "POST") {
            if (slug.startsWith("/files/")) {
                const content = data.toString().split(crlf);

                const fileName = getEndPoint(slug);
                const body = getBody(content);

                const pathName = path.join(baseDirectory, fileName);

                const fd = fs.openSync(pathName, "w");
                fs.writeSync(fd, body);
                fs.closeSync(fd);

                console.log(content, fileName, body, pathName, "data");

                socket.write("HTTP/1.1 201 Created\r\n\r\n");
            }
        }

        if (headers["connection"] == "close") {
            socket.end();
        }
    });
});

server.listen(4221, "localhost");
