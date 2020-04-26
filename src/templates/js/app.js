// Configuration
const cutOffLongTexts = false; // This leads to errors when trying to find elements by key (entryName) on the server side

// Constants
const TITLE = "Simple Tasks";
const DELETE_ICON = "&#10060;";
const BACK_ARROW = "&#129120;";

// Members
// let history = []
let historyIndex = 0;

let data = {};
let _currentPath = [];
let selectedEntryIndex = -1; // Always set below 0 when not in use, maybe below-zero-setting not necessary any more when using focus-states

// HTML Elements
let entryElements; // For selecting entries by index

// // Editable
let titleObject;
let input;

// Do after network-update
let pathToEnterWhenReceivingServerUpdate = null;
let selectedIndexAfterUpdate = -1;


// // // // // //
// Data Access //
// // // // // //

function getCurrentPath() {
    let path = [];
    path = path.concat(_currentPath.slice(0, historyIndex));
    return path;
}

function getCurrentData() {
    return accessPathData(getCurrentPath())
}

function getParentData() {
    const parentPath = copyCurrentPath()
    parentPath.pop();
    return accessPathData(parentPath);
}

function accessPathData(path)
{
    let tmpData = data;
    for (let pathElement of path){
        tmpData = tmpData[pathElement];
    }
    return tmpData;
}

function copyCurrentPath() {
    let newPath = []

    for (let part of getCurrentPath())
        newPath.push(part);

    return newPath;
}


// // // // // // //
// Rearrange data //
// // // // // // //

function reparentEntry() {
}

let copyData = {
    'name': '',
    'data': ''
};
let cutData = {
    'execute_cut': false,
    'path': ""
};

function copySelectedEntry() {
    copyData.name = entryElements[selectedEntryIndex].name;
    copyData.data = entryElements[selectedEntryIndex].data;

    cutData.execute_cut = false;
    cutData.path = "";
}

function pasteSelectedEntry() {
    sendPaste();

    if (cutData.execute_cut)  {
        copyData.name = "";
        copyData.data = "";
    }
}

function cutSelectedEntry() {
    copySelectedEntry();
    cutData.execute_cut = true;
    cutData.path = getCurrentPath();
}


// // // // // //
// Input Focus //
// // // // // //
function isFocused(element) {
    return document.activeElement === element;
}

// // // // // // //
// User Interface //
// // // // // // //
function updateDisplayedData() {
    _createEverything(getCurrentData());

    if (pathToEnterWhenReceivingServerUpdate) {
        const tmpPath = pathToEnterWhenReceivingServerUpdate; // Prevent endless recursion
        pathToEnterWhenReceivingServerUpdate = null;

        setPath(tmpPath);
    }

    deselectEntries();
    focusInput();

    if (selectedIndexAfterUpdate >= 0) {
        selectEntryWithIndex(selectedIndexAfterUpdate);
        selectedIndexAfterUpdate = -1;
    }
}


function createEntry(entryName, entryData) {
    const newEntryWrapper = document.createElement('div');
    newEntryWrapper.setAttribute('class', 'entryWrapper');

    // for copying
    newEntryWrapper.name = entryName;
    newEntryWrapper.data = entryData;
    // copy end

    newEntryWrapper.select = () => {
        newEntryWrapper.classList.add('focused');
    };
    newEntryWrapper.deselect = () => {
        newEntryWrapper.classList.remove('focused');
    };

    newEntryWrapper.enter = () => {
         // Enter sub-level
        pushPath(entryName);

        /*
        const stateObj = {
            "currentPath": currentPath;
        }
        history.pushState(stateObj, )
        */
     }

     newEntryWrapper.delete = (askForConfirmationForSubtasks = true) => {
        if (subTasksCounter > 0 && askForConfirmationForSubtasks) {
            if (!confirm("There are sub-tasks, do you really want to delete this?"))
                return;
        }
        delete getCurrentData()[entryName];

        let deletePath = copyCurrentPath();
        deletePath.push(entryName);
        updateDisplayedData();

        send({
            'action': 'delete_entry',
            'path': deletePath
        })
     }


    // Add button to enter sub-level
    const newEntryButton = document.createElement('div');
    let entryText = entryName;
    const maxLength = 256
    if (cutOffLongTexts && entryText.length > maxLength){
        entryText = entryText.substring(0, maxLength) + "..."
    }
    newEntryButton.setAttribute('class', 'entryEnterButton');
    newEntryButton.innerText = entryText;

    newEntryWrapper.appendChild(newEntryButton);

    newEntryButton.onclick = () => {
        newEntryWrapper.enter();
    };

    // Add description
    const description = entryData['description'];
    if (description) {
        const newEntryDescription = document.createElement('div');
        newEntryDescription.innerText = description;
        newEntryWrapper.appendChild(newEntryDescription);
    }

    let subTasksCounter = 0;
    function countSubTasks(subData) {
        for (let key of Object.keys(subData)) {
            subTasksCounter += 1;
            countSubTasks(subData[key]);
        }
    }

    countSubTasks(entryData);

    if (subTasksCounter > 0){
        const subTasksCounterLabel = document.createElement('div');
        subTasksCounterLabel.setAttribute('class', 'icon subcounter');
        subTasksCounterLabel.innerText = subTasksCounter;
        newEntryWrapper.appendChild(subTasksCounterLabel);
    }

    // Add delete button
    const deleteButton = document.createElement('div');
    deleteButton.setAttribute('class', 'icon deletebutton');
    deleteButton.innerHTML = DELETE_ICON;
    newEntryWrapper.appendChild(deleteButton);

    deleteButton.onclick = () => {
        newEntryWrapper.delete();
    };

    contentContainer.appendChild(newEntryWrapper);
    entryElements.push(newEntryWrapper);
}

function createInputLine() {
    input = document.createElement('input');
    input.onclick = () => {
    }
    input.onkeypress = (e) => {
        const actualInputValue = input.value.trim();
        if (actualInputValue == "")
            return;

        if (e.key == 'Enter') {
            const newEntryText = actualInputValue;
            input.value = '';

            if (e.shiftKey) {
                pathToEnterWhenReceivingServerUpdate = copyCurrentPath()
                pathToEnterWhenReceivingServerUpdate.push(newEntryText);
            }

            addEntry(newEntryText);
        }

    }
    inputLine.appendChild(input);
}

function focusInput() {
    deselectEntries();
    input.focus();
}

function _createEverything(contentData) {
    contentContainer.innerText = "";

    createTitle();

    const entries = contentData;
    entryElements = [];
    for (let key in entries) {
        const entry = entries[key];
        createEntry(key, entry);
    }
}

function getTitle() {
    const currPath = getCurrentPath();
    return currPath[currPath.length -1];
}

function isAtRootLevel() {
    return historyIndex == 0;
}

function createTitle() {
    titleBar.innerHTML = '';

    if (!isAtRootLevel()) {
        // Create back button
        const backButton = document.createElement('div');
        backButton.setAttribute('class', 'backbutton');
        backButton.innerHTML = BACK_ARROW;

        backButton.onclick = () => {
            goBack();
        }

        titleBar.appendChild(backButton);
    }

    // Create title text
    titleObject = document.createElement('div');
    titleObject.setAttribute('class', 'title');
    if (!isAtRootLevel())
        titleObject.setAttribute('contenteditable', true);

    let actualTitle = getTitle();
    if (actualTitle)
    {
        const maxLength = 60;
        if (cutOffLongTexts && actualTitle.length > maxLength)
        {
            actualTitle = actualTitle.substring(0, maxLength) + "..."
        }
    }
    else
    {
        actualTitle = TITLE;
    }

    titleObject.innerText = actualTitle;

    const originalText = actualTitle;

    titleObject.onblur = () => {
        if (titleObject.innerText == originalText)
            return;

        if (!titleObject.innerText) {
            titleObject.innerText = originalText;
        } else {
            sendRename(originalText, titleObject.innerText);
        }
    }
    titleObject.onkeydown = (e) => {
        if (e.key == 'Escape') {
            titleObject.innerText = originalText;
            focusInput();
            return false;
        }
        if (e.key == 'Enter') {
            focusInput(); // this will call the onblur function
            return false;
        }
    }
    titleBar.appendChild(titleObject);
}


// // // // // // // // // //
// WebSocket Communication //
// // // // // // // // // //

 function addEntry(text){
    const sendData = {
        'action': 'add_entry',
        'path': getCurrentPath(),
        'text': text
    }
    send(sendData);
}

function moveEntry(delta) {
    if (entryElements.length == 0)
        return;

    let newPosition = selectedEntryIndex + delta;
    newPosition = clamp(0, entryElements.length - 1, newPosition);

    if (newPosition != selectedEntryIndex) {
        send({
            "action": 'move_entry',
            "path": getCurrentPath(),
            "currentIndex": selectedEntryIndex,
            "newIndex": newPosition
        })
    }
    selectedIndexAfterUpdate = newPosition;
}

function sendRename(oldName, newName) {
    const path = copyCurrentPath();
    path.pop();

    send({
        'action': 'rename_entry',
        'path': path,
        'old': oldName,
        'new': newName
    })

    pathToEnterWhenReceivingServerUpdate = path;
    pathToEnterWhenReceivingServerUpdate.push(newName)
}

function sendPaste() {
    if (!copyData['data'])
        return

    const sendData = {
        'action': 'paste_data',
        'path': getCurrentPath(),
        'data': copyData,
        'cut_data': cutData
    }
    send(sendData);
}


// // // // // // // // // //
// Path and History Stuff  //
// // // // // // // // // //

function setPath(path) {
    _currentPath = path;
    historyIndex = _currentPath.length;
    updateDisplayedData();
}

function pushPath(path) {
    _currentPath = getCurrentPath(); // remove forward-history
    _currentPath.push(path);

    historyIndex = _currentPath.length;

    updateDisplayedData();
}

function changeHistory(delta) {
    const originalHistoryIndex = historyIndex;
    historyIndex = clamp(0, _currentPath.length, historyIndex + delta);

    if (originalHistoryIndex != historyIndex) {
        updateDisplayedData();
    }
}

function goBack() {
    changeHistory(-1);
}

function goForward() {
    changeHistory(1);
}

function deselectEntries() {
    for (let element of entryElements)
        element.deselect();

    selectedEntryIndex = -1;
}

function selectEntry(delta) {
    if (entryElements.length == 0)
        return;

    let newIndex = selectedEntryIndex;
    newIndex += delta;
    newIndex = clamp(0, entryElements.length - 1, newIndex);

    deselectEntries();
    selectEntryWithIndex(newIndex);
}

function selectEntryWithIndex(newIndex) {
    if (isFocused(titleObject))
        return

    if (selectedEntryIndex >= 0)
        deselectEntries();

    input.blur();
    titleObject.blur();

    selectedEntryIndex = newIndex;
    entryElements[selectedEntryIndex].select();
}



// // // // // // // //
// Keyboard Handler  //
// // // // // // // //

function globalKeyDownHandler(e) {
    if (e.key == 'Tab') {
        focusInput();
        return false;
    } else if (e.key == 'ArrowLeft') {
        if (e.altKey){
            goBack();
            return false;
        } else {
            if (selectedEntryIndex >= 0)
                moveEntry(-1);
        }
    } else if (e.key == 'ArrowRight') {
        if (e.altKey) {
            goForward();
            return false;
        } else {
            if (selectedEntryIndex >= 0)
                moveEntry(1);
        }
    } else if (e.key == 'ArrowUp') {
        if (e.altKey)
            moveEntry(-1);
        else
            selectEntry(-1);
    } else if (e.key == 'ArrowDown') {
        if (e.altKey)
            moveEntry(1);
        else
            selectEntry(1);
    } else if (e.key == 'Escape') {
        deselectEntries();
    } else if (e.key == 'Home') {
        if (entryElements.length > 0 && (selectedEntryIndex >= 0 || input.value.length == 0)) // so button can still be used in input field
            selectEntryWithIndex(0);
    } else if (e.key == 'End') {
        if (entryElements.length > 0 && (selectedEntryIndex >= 0 || input.value.length == 0)) // so button can still be used in input field
            selectEntryWithIndex(entryElements.length - 1);
    } else if (e.key == 'Enter') {
        if (selectedEntryIndex >= 0) {
            entryElements[selectedEntryIndex].enter();
            return false;
        }
    } else if (e.key == 'Delete') {
        if (selectedEntryIndex >= 0) {
            entryElements[selectedEntryIndex].delete(askForConfirmationForSubtasks = !e.shiftKey);
            return false;
        }
    } else if (e.key == 'Backspace') {
        if (!isFocused(input)) {
            goBack();
        }
    } else if (e.key == 'F2') {
        deselectEntries();
        titleObject.focus(); // Does not focus title bar in root screen
        if (isFocused(titleObject)) // Therefore this should not be executed then
            document.execCommand('selectAll', false, null);

    } else if (e.key == 'c' && e.ctrlKey) {
        if (selectedEntryIndex >= 0)
            copySelectedEntry();
    } else if (e.key == 'v' && e.ctrlKey) {
        if (selectedEntryIndex >= 0)
            pasteSelectedEntry();
    } else if (e.key == 'x' && e.ctrlKey) {
        if (selectedEntryIndex >= 0)
            cutSelectedEntry();
    } else {
        if (!isFocused(titleObject)){
            if (e.key == 'Shift' || e.key == 'Control' || e.key == 'Alt') {

            } else {
                focusInput();
            }
            // console.log(e.key)
        }
    }
}


// // // // // //
// Utilities   //
// // // // // //


function clamp(min, max, value) {
    return Math.max(min, Math.min(max, value));
}

function find(text) {
}