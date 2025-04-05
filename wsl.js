const ws = new WebSocket('ws://localhost:5000');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  switch (data.type) {
    case 'TRANSACTION_CREATED':
      console.log('New transaction:', data.hash);
      break;
    case 'TRANSACTION_CONFIRMED':
      console.log('Transaction confirmed:', data.hash, 'Block:', data.blockNumber);
      break;
  }
};

ws.onopen = () => {
  console.log('Connected to WebSocket server');
};

ws.onclose = () => {
  console.log('Disconnected from WebSocket server');
};