// Configuration
const cutOffLongTexts = false; // This leads to errors when trying to find elements by key (entryName) on the server side
const startFolded = true;

// Constants
const TITLE = "Simple Tasks";
const DELETE_ICON = "&#10060;";
// const BACK_ARROW = "&#129120;";
const BACK_ARROW = "../";

// // Focus
const FOCUS_INPUT_LINE = "input";
const FOCUS_TITLE = "title";
const FOCUS_CONTENT = "content";

// Members
// let history = []
let _currentPath = [];
let historyIndex = 0;

let data = {};
let selectedEntryIndex = 0; // TODO remove all occurences
let previousSelectedEntryIndex = -1; // TODO move into entry class?

// // Focus
let currentFocus = FOCUS_CONTENT;
let currentlySelectedElement = null;


// // Editable
let titleObject;
let input;

// Do after network-update
let pathToEnterWhenReceivingServerUpdate = null;
let selectedIndexAfterUpdate = -1; // TODO move to entry class?


let isMobileAgent = false;

function init() {
    if( /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ) {
        isMobileAgent = true;
        console.log("Using mobile client: ", navigator.userAgent)
    }

    window.onpopstate = function(event) {
        restorePath(event.state.path);
    }

    setPath(_currentPath);
}

// // // // // //
// Data Access //
// // // // // //

function setDataComingFromServer(newData) {
    data = newData;
}

function getCurrentPath() {
    let path = [];
    let sliceStart = 0;
    path = path.concat(_currentPath.slice(sliceStart, historyIndex));

    path = []
    for (let part of _currentPath.slice(sliceStart, historyIndex))
    {
        if (part) // HACK necessary for root element, because it has no parent and it causes the first value of the _currentPath to be 'undefined'
            path.push(part)
    }

    return path;
}

function getCurrentData() {
    return accessPathData(getCurrentPath())
}

function getParentPath() {
    const parentPath = copyCurrentPath();
    parentPath.pop();
    return parentPath;
}

function accessPathData(path)
{
    let tmpData = data;
    for (let pathElement of path){
        tmpData = tmpData[pathElement];
    }
    return tmpData;
}

function copyPath(path) {
    let newPath = []

    for (let part of path) {
        if (part) // HACK necessary for root element, because it has no parent and it causes the first value of the _currentPath to be 'undefined'
            newPath.push(part);
    }

    return newPath;
}

function copyCurrentPath() {
    return copyPath(getCurrentPath());
}

function getElementByPath(path) {
    console.log("getElementByPath")
    let currentElement = currentSceneRoot;
    let currentPath = getCurrentPath(); // currentElement.getElementPath();

    while (currentPath.length > 0) {
        if (path[path.length - 1] == currentPath[currentPath.length -1]) {
            path.pop();
            currentPath.pop();
        } else {
            break;
        }
    }

    // for (let part of currentPath)
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
    copyData.name = currentlySelectedElement.name;
    copyData.data = currentlySelectedElement.data;

    cutData.execute_cut = false;
    cutData.path = "";
}

function pasteEntry(pasteIntoSelectedEntry) {
    console.log("pasteEntry", pasteIntoSelectedEntry)
    sendPaste(pasteIntoSelectedEntry);

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

    if (selectedIndexAfterUpdate >= 0) {
        currentlySelectedElement.selectEntryWithIndex(selectedIndexAfterUpdate);
        selectedIndexAfterUpdate = -1;
    }
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
    input.onfocus = () => { setFocus(FOCUS_INPUT_LINE);}
    input.onblur = () => { setFocus(null);}
    inputLine.appendChild(input);
}

function getTitle() {
    let currPath = getCurrentPath();
    let actualTitle = currPath[currPath.length -1];
    return actualTitle
}

function isAtRootLevel() {
    return historyIndex == 0;
}

function createTitle() {
    titleBar.innerHTML = '';

    //*
    if (!isAtRootLevel()) {
        // Create back button
        const backButton = document.createElement('div');
        backButton.setAttribute('class', 'backbutton');
        backButton.innerHTML = BACK_ARROW;

        backButton.onclick = () => {
            // goBack();
            goUp();
        }

        titleBar.appendChild(backButton);
    }//*/

    // Create title text
    titleObject = document.createElement('div');
    titleObject.setAttribute('class', 'title');
    if (!isAtRootLevel()) {
        titleObject.setAttribute('contenteditable', true);
        titleObject.onfocus = () => {
            setFocus(FOCUS_TITLE);
        };
        titleObject.onblur = () => {
            setFocus(null);
        };
    }

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
    titleObject.originalText = actualTitle;

    titleObject.onblur = () => {
        if (titleObject.innerText == titleObject.originalText)
            return;

        if (!titleObject.innerText) {
            titleObject.innerText = titleObject.originalText;
        } else {
            sendRename(titleObject.originalText, titleObject.innerText);
        }
    }
    titleBar.appendChild(titleObject);

    // Add delete button
    if (!isAtRootLevel()) {
        // Create back button
        const backButton = document.createElement('div');
        backButton.setAttribute('class', 'deletebutton');
        backButton.innerHTML = "X";

        backButton.onclick = () => {
            const deleteExecuted = sendDelete(getCurrentPath(), currentSceneRoot.subTasks.length > 0);
            if (deleteExecuted)
                setPath(getParentPath());
        }

        titleBar.appendChild(backButton);
    }

}


function scrollTop() {
    contentContainer.scrollTop = 0;
}
function scrollBottom() {
    contentContainer.scrollTop = contentContainer.scrollHeight;
}
function scrollView(delta) {
    contentContainer.scrollTop += delta * 50;
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

function sendPaste(pasteIntoSelectedEntry) {
    if (!copyData['data'])
        return
    let pastePath = currentlySelectedElement.getElementPath(); // Paste into selected object
    if (!pasteIntoSelectedEntry) {
        pastePath.pop(); // Paste next to selected object
    }

    const sendData = {
        'action': 'paste_data',
        'path': pastePath,
        'data': copyData,
        'cut_data': cutData
    }
    send(sendData);
}

function sendDelete(deletePath, askConfirmation) {
    if (askConfirmation) {
        if (!confirm("There are sub-tasks, do you really want to delete this?"))
            return false;
    }

    send({
        'action': 'delete_entry',
        'path': deletePath
    })

    return true;
}


// // // // // // // // // //
// Path and History Stuff  //
// // // // // // // // // //
function restorePath(path) {
    _currentPath = path;
    historyIndex = _currentPath.length;
    updateDisplayedData();
}

function setPath(path) {
    restorePath(path);

    window.history.pushState({
        "path": _currentPath
    }, _currentPath.join("/"), "")
}

function changeHistory(delta) {
    const originalHistoryIndex = historyIndex;
    historyIndex = clamp(0, _currentPath.length, historyIndex + delta);

    if (originalHistoryIndex != historyIndex) {
        updateDisplayedData();
    }
}

function goUp() {
    changeHistory(-1);
}
/*
function goBack() {
    //changeHistory(-1);
    window.history.back();
}

function goForward() {
    window.history.forward();
}
*/

// // // // // //
// Input Focus //
// // // // // //

function setFocus(focus) {
    const oldFocus = currentFocus;
    currentFocus = focus;
    if (oldFocus == currentFocus)
        return;

    if (!currentFocus)
        currentFocus = FOCUS_CONTENT;

    if (oldFocus == FOCUS_CONTENT)
        currentlySelectedElement.deselectEntries();
    else if (oldFocus == FOCUS_TITLE)
        titleObject.blur();

    if (currentFocus == FOCUS_INPUT_LINE) {
        input.focus();
    } else if (currentFocus == FOCUS_CONTENT) {
        contentContainer.focus();
        if (previousSelectedEntryIndex >= 0)
            currentlySelectedElement.selectEntryWithIndex(previousSelectedEntryIndex);
    } else if (currentFocus == FOCUS_TITLE) {
        titleObject.focus();
    }
}

// // // // // // // //
// Keyboard Handler  //
// // // // // // // //
const keyHandlers = {};

function inputLineKeyDownHandler(e) {
    if (e.key == 'ArrowUp') {
        if (currentlySelectedElement) {
            currentlySelectedElement.selectEntryWithIndex(entryElements.length - 1);
            return false;
        }
    } else if (e.key == 'ArrowDown') {
        if (currentlySelectedElement){
            currentlySelectedElement.selectEntryWithIndex(0);
            return false;
        }
    }
    return true;
}

function titleKeyDownHandler(e) {
    if (e.key == 'Escape') {
        titleObject.innerText = titleObject.originalText;
        setFocus(null);
    } else if (e.key == 'Enter') {
        setFocus(null);
    } else {
        return true;
    }

    return false;
}
function contentKeyDownHandler(e) {
    if (e.key == 'ArrowLeft' && e.altKey == false) {
        // currentlySelectedElement.fold();
        // currentlySelectedElement.stepOut();
        currentlySelectedElement.stepOut();
    } else if (e.key == 'ArrowRight' && e.altKey == false) {
        //currentlySelectedElement.unfold();
        currentlySelectedElement.stepInto();
    } else if (e.key == ' ') {
        currentlySelectedElement.toggleFold();
    } else if (e.key == 'ArrowUp') {
        if (e.altKey) {
            currentlySelectedElement.moveEntry(-1);
        } else if (e.ctrlKey) {
            scrollView(-1);
        } else {
            currentlySelectedElement.selectEntry(-1);
        }
    } else if (e.key == 'ArrowDown') {
        if (e.altKey) {
            currentlySelectedElement.moveEntry(1);
        } else if (e.ctrlKey) {
            scrollView(1)
        } else {
            currentlySelectedElement.selectEntry(1);
        }
    } else if (e.key == 'Home') {
        if (currentlySelectedElement) {
            currentlySelectedElement.selectEntryWithIndex(0);
        }
    } else if (e.key == 'End') {
        if (currentlySelectedElement) {
            currentlySelectedElement.selectEntryWithIndex(currentlySelectedElement.subTasks.length - 1);
        }
    } else if (e.key == 'Enter') {
        currentlySelectedElement.enter();
    } else if (e.key == 'Delete') {
        currentlySelectedElement.delete(askForConfirmationForSubtasks = !e.shiftKey);
    } else if (e.key == 'Backspace') {
        goBack();
    } else if (e.key == 'c' && e.ctrlKey) {
        if (currentlySelectedElement)
            copySelectedEntry();
    } else if (e.key.toLowerCase() == 'v' && e.ctrlKey) {
        pasteEntry(e.shiftKey);
    } else if (e.key == 'x' && e.ctrlKey) {
        if (currentlySelectedElement)
            cutSelectedEntry();
    } else if (e.key == 'PageUp') {
        scrollTop();
    } else if (e.key == 'PageDown') {
        scrollBottom();
    } else {
        return true;
    }

    return false;
}

function globalKeyDownHandler(e) {
    if (e.key == 'Tab') {
        if (currentFocus == FOCUS_CONTENT)
            setFocus(FOCUS_INPUT_LINE)
        else
            setFocus(FOCUS_CONTENT)
        return false;
    } else if (e.key == 'F2') {
        if (!isAtRootLevel()) {
            //deselectEntries();

            setFocus(FOCUS_TITLE);
            document.execCommand('selectAll', false, null);
        }
    } else if (e.key == 'l' && e .ctrlKey) {
        console.clear();
        return false;
    } else if (e.key == 'F12') {

    } else {
        if (currentFocus) {
            if(keyHandlers[currentFocus](e) === false)
                return false;
        }
        if (!(e.key == 'Shift' || e.key == 'Control' || e.key == 'Alt')){
            if (currentFocus == FOCUS_CONTENT) {
                setFocus(FOCUS_INPUT_LINE);
            }
        }
    }

    // console.log(e.key)
}


// // // // // //
// Utilities   //
// // // // // //


function clamp(min, max, value) {
    return Math.max(min, Math.min(max, value));
}

function find(text) {
}












let currentSceneRoot;
// Treat root level just like any other entry to unify workflow for top-level entries with subtasks
function _createEverything(contentData) {
    contentContainer.innerText = "";

    createTitle();

    let parPath = getCurrentPath();
    if (parPath)
        parPath.pop();
    console.log("Create everything for path", getCurrentPath())

    currentSceneRoot = new Entry(
        entryName = getTitle(),
        entryData = contentData,
        parentElement = null,
        parentContainer = null,
        parentPath = parPath,
        subtasksContainer = contentContainer
    );
    currentlySelectedElement = currentSceneRoot

    currentlySelectedElement.stepInto();
}