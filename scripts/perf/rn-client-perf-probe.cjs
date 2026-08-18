const http = require('http');
const WebSocket = require('ws');

const metroHost = process.env.METRO_HOST || '127.0.0.1';
const metroPort = Number(process.env.METRO_PORT || 8081);
const expression = process.argv.slice(2).join(' ');

if (!expression) {
  process.stderr.write('Usage: node rn-client-perf-probe.cjs <expression>\n');
  process.exit(2);
}

function fail(error) {
  process.stderr.write(`${error instanceof Error ? error.message : error}\n`);
  process.exit(1);
}

http
  .get(`http://${metroHost}:${metroPort}/json/list`, response => {
    let body = '';
    response.setEncoding('utf8');
    response.on('data', chunk => {
      body += chunk;
    });
    response.on('end', () => {
      let targets;
      try {
        targets = JSON.parse(body);
      } catch (error) {
        fail(error);
        return;
      }

      const target = targets.find(candidate => candidate.webSocketDebuggerUrl);
      if (!target) {
        fail('No React Native debugger target is connected to Metro.');
        return;
      }

      const socket = new WebSocket(target.webSocketDebuggerUrl, {
        headers: { Origin: `http://${metroHost}:${metroPort}` },
      });
      const requestId = 1;
      const timeout = setTimeout(() => {
        socket.close();
        fail('Timed out waiting for the React Native runtime.');
      }, 10_000);

      socket.on('open', () => {
        socket.send(
          JSON.stringify({
            id: requestId,
            method: 'Runtime.evaluate',
            params: {
              expression,
              returnByValue: true,
              awaitPromise: true,
            },
          }),
        );
      });
      socket.on('message', data => {
        const message = JSON.parse(String(data));
        if (message.id !== requestId) return;

        clearTimeout(timeout);
        if (message.result?.exceptionDetails) {
          fail(
            message.result.exceptionDetails.exception?.description ||
              message.result.exceptionDetails.text ||
              'Runtime evaluation failed.',
          );
          return;
        }

        process.stdout.write(
          `${JSON.stringify(message.result?.result?.value ?? null)}\n`,
        );
        socket.close();
      });
      socket.on('error', fail);
    });
  })
  .on('error', fail);
