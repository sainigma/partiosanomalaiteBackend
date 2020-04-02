const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', function connection(ws) {
  ws.send('uusi')
  ws.on('message', function incoming(message) {
    if( message === 'yk' ){
      ws.send('yk ok')
    }else ws.send('vastaanotettu')
    console.log('received: %s', message);
  });
});
