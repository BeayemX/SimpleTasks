const URL = 'wss://' + document.domain + ':8193';
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
            console.log(jsonData['status'])
            if (jsonData['status'] == 'success') {
                loginSuccessful();
            } else {
                loginFailed();
            }
        } else if (jsonData['type'] == 'adding_successful') {
            const newEntryData = jsonData['new_entry'];
            addingEntrySuccessful(newEntryData);
        } else if (jsonData['type'] == 'delete_successful') {
            const deletedIDs = jsonData['deleted_entry_ids']
            deletingEntrySuccessful(deletedIDs);
        } else if (jsonData['type'] == 'change_text_successful') {
            const entryID = jsonData['entry_id'];
            const text = jsonData['text'];
            changeTextSuccessful(entryID, text);
        } else if (jsonData['type'] == 'cut_paste_successful') {
            const oldParentID = jsonData['old_parent_id'];
            const newParentID = jsonData['new_parent_id'];
            const entryID = jsonData['entry_id'];
            const clipboard_type = jsonData['clipboard_type'];
            cutPasteSuccessful(oldParentID, newParentID, entryID, clipboard_type);
        } /*else if (jsonData['type'] == 'copy_paste_successful') {
            const newRootID = jsonData['new_root_id'];
            const newParentID = jsonData['new_parent_id'];
            const clipboardType = jsonData['clipboard_type'];
            const copiedEntryID = jsonData['copied_entry_id'];

            copyPasteSuccessful(copiedEntryID, newParentID, newRootID, clipboardType);
        } */
        else if (jsonData['type'] == 'move_entry_response') {
            const success = jsonData['success'];
            const entryID = jsonData['entry_id'];
            const delta = jsonData['delta'];
            move_entry_response(entryID, delta, success);
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
    ws.res
}
