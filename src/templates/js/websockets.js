// const URL = 'ws://localhost:8193';
const URL = 'ws://' + document.domain + ':8193';

const RECONNECT_TIMEOUT = 2500;
let ws;

function connectToWebSocket() {
    ws = new WebSocket(URL);
    // Connect to websockets

    ws.addEventListener('open', (event) => {
        console.log("Connected");
    });

    ws.addEventListener('message', (event) => {
        // console.log("Message: ", event.data);
        const jsonData = JSON.parse(event.data);

        if (jsonData['type'] == 'connection_established') {
            console.log("Connected. SocketID: ", jsonData['id']);
            initialLogin();
        } else if (jsonData['type'] == 'update_data') {
            setDataComingFromServer(jsonData['data']);
            updateDisplayedData();
        } else if (jsonData['type'] == 'login_response') {
            if (jsonData['status'] == 'success') {
                loginSuccessful();
            } else {
                loginFailed();
            }
        }
    });

    ws.addEventListener('close', (event) => {
        console.log("Close");
        setTimeout(() => {
            console.log("Trying to reconnect...")
            connectToWebSocket()
        }, RECONNECT_TIMEOUT);
    });

    ws.addEventListener('error', (event) => {
        console.log("Error connecting.");
    });
}

function send(sendData) {
    sendData['client_id'] = clientID;
    ws.send(JSON.stringify(sendData));
}
