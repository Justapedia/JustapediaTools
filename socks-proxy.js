const { Client } = require('ssh2');
const net = require('net');
const dns = require('dns');

const sshConfig = {
  host: process.env.SSH_HOST || 'tools.justapedia.org',
  port: parseInt(process.env.SSH_PORT || '22'),
  username: process.env.SSH_USER || 'Sourav',
  password: process.env.SSH_PASSWORD || 'oomi3wek8iengeeL'
};

const SOCKS_PORT = parseInt(process.env.SOCKS_PORT || '1080');
const SOCKS_HOST = process.env.SOCKS_HOST || '127.0.0.1'; // Default to localhost for security
const conn = new Client();

function resolveToIPv4(domain) {
    return new Promise((resolve) => {
        if (net.isIP(domain)) {
            resolve(domain);
            return;
        }
        dns.resolve4(domain, (err, addresses) => {
            if (err || !addresses || addresses.length === 0) {
                // If resolution fails, return original (let SSH server handle it or fail)
                resolve(domain);
            } else {
                // Return first IPv4 address
                console.log(`Resolved ${domain} to ${addresses[0]}`);
                resolve(addresses[0]);
            }
        });
    });
}

conn.on('ready', () => {
  console.log('SSH Connection :: ready');

  const server = net.createServer((socket) => {
    socket.on('error', (err) => {
      // Ignore client connection errors (common when browser/app cancels request)
      // console.error('Client Socket Error:', err.message); 
    });

    socket.once('data', (data) => {
      // SOCKS5 greeting
      if (!data || data[0] !== 0x05) {
        socket.end();
        return;
      }
      // Respond: Version 5, No Auth (0x00)
      socket.write(Buffer.from([0x05, 0x00]));

      socket.once('data', async (data) => {
        // Expecting CONNECT command (0x01)
        if (!data || data[0] !== 0x05 || data[1] !== 0x01) { 
            socket.end(); 
            return;
        }

        let remoteAddr = '';
        let remotePort = 0;
        let originalAddr = '';

        try {
            if (data[3] === 0x01) { // IPv4
                remoteAddr = data.slice(4, 8).join('.');
                remotePort = data.readUInt16BE(8);
                originalAddr = remoteAddr;
            } else if (data[3] === 0x03) { // Domain name
                const addrLen = data[4];
                remoteAddr = data.slice(5, 5 + addrLen).toString();
                remotePort = data.readUInt16BE(5 + addrLen);
                originalAddr = remoteAddr;
            } else {
                // IPv6 or others not supported
                socket.end();
                return;
            }
        } catch (e) {
            console.error('Error parsing SOCKS header', e);
            socket.end();
            return;
        }

        // Force IPv4 resolution
        const finalAddr = await resolveToIPv4(remoteAddr);
        console.log(`Proxy request to ${originalAddr}:${remotePort} -> ${finalAddr}:${remotePort}`);

        conn.forwardOut(socket.remoteAddress || '127.0.0.1', socket.remotePort || 12345, finalAddr, remotePort, (err, stream) => {
            if (err) {
                console.error('SSH Forward Error:', err.message);
                // Reply failure
                try {
                  socket.write(Buffer.from([0x05, 0x01, 0x00, 0x01, 0,0,0,0, 0,0]));
                } catch(e) {}
                socket.end();
                return;
            }
            
            stream.on('error', (err) => {
               // console.error('Upstream Connection Error:', err.message);
               socket.end();
            });

            // Reply success
            try {
              socket.write(Buffer.from([0x05, 0x00, 0x00, 0x01, 0,0,0,0, 0,0]));
              socket.pipe(stream).pipe(socket);
            } catch(e) {
              console.error('Pipe Error:', e);
            }
        });
      });
    });
  });

  server.listen(SOCKS_PORT, SOCKS_HOST, () => {
    console.log(`SOCKS5 Proxy listening on ${SOCKS_HOST}:${SOCKS_PORT}`);
  });

  server.on('error', (err) => {
    console.error('SOCKS Server error:', err);
    conn.end();
  });
});

conn.on('error', (err) => {
  console.error('SSH Connection Error:', err);
  // Reconnect logic could be added here
});

conn.on('end', () => {
  console.log('SSH Connection :: ended');
});

conn.on('close', () => {
  console.log('SSH Connection :: closed');
});

conn.connect(sshConfig);

