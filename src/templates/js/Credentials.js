const LOCAL_STORAGE_CLIENT_ID = 'ClientID';

let clientID;

function initialLogin() {
    clientID = localStorage.getItem(LOCAL_STORAGE_CLIENT_ID);
    sendLogin();
}

function requestLogin() {
    while (clientID == null || clientID == '') {
        clientID = prompt("UserID", '');
        sendLogin();
    }
}

function clearCredentials() {
    localStorage.removeItem(LOCAL_STORAGE_CLIENT_ID)
}

function loginSuccessful() {
    console.log("Login successful")
    localStorage.setItem(LOCAL_STORAGE_CLIENT_ID, clientID);

    send({
        'action': 'request_data'
    })
}

function loginFailed() {
    console.log("Login failed")
    clientID = "";
    requestLogin();
}