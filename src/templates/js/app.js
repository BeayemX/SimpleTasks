// Configuration
const cutOffLongTexts = false; // This leads to errors when trying to find elements by key (entryName) on the server side
const startFolded = true;

// Constants
const TITLE = "Simple Tasks";
const DELETE_ICON = "&#10060;";
// const BACK_ARROW = "&#129120;";
const BACK_ARROW = "../";
const STARTING_PATH = 'StartingPath';
const MENU_ICON = "&#8942;";

// // Focus
const FOCUS_INPUT_LINE = "input";
const FOCUS_TITLE = "title";
const FOCUS_CONTENT = "content";

// Members
let _currentPath = [];
let historyIndex = 0; // TODO remove occurences? Needed for slicing? could .lenght be used?

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
let initialized = false;

let isMobileAgent = false;

function init() {
    if( /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ) {
        isMobileAgent = true;
        console.log("Using mobile client: ", navigator.userAgent)
    }

    createToolBar();
    createMenu();

    window.onpopstate = function(event) {
        restorePath(event.state.path);
    }

    startingPath = localStorage.getItem(STARTING_PATH);

    if (startingPath) {
        startingPath = JSON.parse(startingPath);

        if (dataPathDoesExists(startingPath)) {
            _currentPath = startingPath;
        } else {
            clearStartingPath();
        }
    }

    initialized = true;
    setPath(_currentPath);
}

function dataPathDoesExists(path) {
    if (accessPathData(path)) {
        return true;
    } else {
        return false;
    }
}

// // // // // //
// Data Access //
// // // // // //

function setDataComingFromServer(newData) {
    console.log("Setting data from server")
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

function pasteEntry() {
    let pasteIntoSelectedEntry = currentlySelectedElement != null;

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
    if (!initialized)
        init();

    _createEverything(getCurrentData());

    if (pathToEnterWhenReceivingServerUpdate) {
        const tmpPath = pathToEnterWhenReceivingServerUpdate; // Prevent endless recursion
        pathToEnterWhenReceivingServerUpdate = null;

        setPath(tmpPath);
    }

    rebuildElementIndexList();

    if (selectedIndexAfterUpdate >= 0) {
        // currentlySelectedElement.selectEntryWithIndex(selectedIndexAfterUpdate);
        elementIndexListIndex = selectedIndexAfterUpdate;
        selectElementIndexListElementByIndex(selectedIndexAfterUpdate);

        selectedIndexAfterUpdate = -1;
    }

}

function addEntryFromInput(jumpInto) {
    const potentialText = input.value;
    const actualInputValue = potentialText.trim();

    if (actualInputValue == "")
        return;

    const newEntryText = actualInputValue;
    input.value = '';

    if (jumpInto) {
        pathToEnterWhenReceivingServerUpdate = copyCurrentPath()
        pathToEnterWhenReceivingServerUpdate.push(newEntryText);
    }

    addEntry(newEntryText);
}

function createInputLine() {
    // Create Logo
    let homebutton = document.createElement('div');
    let icon = document.createElement('img');
    homebutton.setAttribute('id', "homebutton");
    icon.setAttribute('src', "images/icon-192.png");
    homebutton.appendChild(icon);

    homebutton.onclick = () => {  // TODO use long press?
        if (startingPath)
            clearStartingPath();
        else
            makeCurrentPathStartingPath();
    };

    input = document.createElement('input');
    input.onclick = () => {
    }

    input.onkeypress = (e) => {
        if (e.key == 'Enter') {
            addEntryFromInput(e.shiftKey);
        }
    }

    input.onfocus = () => { setFocus(FOCUS_INPUT_LINE);}
    input.onblur = () => { setFocus(null);}

    const sendButtonWrapper = document.createElement('div');
    const sendButton = document.createElement('button');
    sendButton.innerText = "Add";
    sendButton.onclick = () => {
        addEntryFromInput();
    }
    sendButtonWrapper.appendChild(sendButton);

    // Add to app
    inputLine.appendChild(homebutton);
    inputLine.appendChild(input);
    inputLine.appendChild(sendButtonWrapper);
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

    /*
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
    let titleObject = document.createElement('div');
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

    const titleActionButton = document.createElement('div');
    titleActionButton.setAttribute('class', 'titleactionbutton');

    titleActionButton.innerHTML = MENU_ICON;
    titleActionButton.onclick = toggleMenu;

    titleBar.appendChild(titleActionButton);
}

function toggleMenu() {
    if (menuscreen.style.display == 'none')
        menuscreen.style.display = 'flex';
    else
        menuscreen.style.display = 'none';
}

function createMenu() {
    menuscreen.style.display = 'none';
    menubackgroundclicker.onclick = toggleMenu;

    const buttons = [];
    // buttons.push(["Name", () => {}]); // Template

    if (DEBUG) {
        /*
        buttons.push(["Toogle debug", () => {
            DEBUG = !DEBUG;
            alert("Debug: " + DEBUG);
        }]); // */

        buttons.push(["Add rand entry", () => { addEntry("test"); }])
        buttons.push(["Toggle global menu", () => {
            if (globalToolbar.style.display == 'none')
            globalToolbar.style.display = 'flex';
            else
            globalToolbar.style.display = 'none';
        }])
    }

    buttons.push(["Delete current level", () => {
        if (isAtRootLevel()) {
            alert("Can't delete root level");
            return;
        }
        const deleteExecuted = sendDelete(getCurrentPath(), currentSceneRoot.subTasks.length > 0);
        if (deleteExecuted)
            setPath(getParentPath());
    }]);


    buttons.push(["Logout", () => {
        clearCredentials();
        window.history.go();
    }]);




    for (let button of buttons) {
        const buttonElement = document.createElement('button');
        buttonElement.innerText = button[0];
        buttonElement.onclick = button[1];
        menu.appendChild(buttonElement);
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

function sendLogin(userName) {
    send({
        'action': 'login',
        'client_id': userName
    })
}

function createToolBar() {
    function addButtonsToToolbar(btns, tbar) {
        for (let button of btns) {
            const buttonWrapper = document.createElement('div');

            const buttonLabel = document.createElement('div');
            buttonLabel.innerText = button[0];

            buttonWrapper.onclick = button[1];
            buttonWrapper.appendChild(buttonLabel);

            tbar.appendChild(buttonWrapper);
        }
    }

    let buttons = [];
    // buttons.push("Add", () => {}) // Template
    // buttons.push(["Enter", () => { currentlySelectedElement.enter(); }])
    buttons.push(["Cut", () => { cutSelectedEntry(); }])
    buttons.push(["Copy", () => { copySelectedEntry(); }])
    buttons.push(["Paste", () => { pasteEntry(); }])
    buttons.push(["Up", () => { currentlySelectedElement.moveEntry(-1); }])
    buttons.push(["Down", () => { currentlySelectedElement.moveEntry(1); }])
    // buttons.push(["Delete", () => { currentlySelectedElement.delete(); }])

    addButtonsToToolbar(buttons, selectionToolbar);

    buttons = [];
    buttons.push(["Add", () => {alert("test")}]); // Template

    addButtonsToToolbar(buttons, globalToolbar);
    globalToolbar.style.display = 'none'

    // global
    toolbarDefaultStyleDisplay = selectionToolbar.style.display;
}

function showToolbar(value = true) {
    if (value)
        selectionToolbar.style.display = toolbarDefaultStyleDisplay;
    else
        selectionToolbar.style.display = "none";
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

    if (oldFocus == FOCUS_CONTENT) {
        if (currentlySelectedElement){
            currentlySelectedElement.deselect();
            elementIndexListIndex = -1;
        }
    }
    else if (oldFocus == FOCUS_TITLE)
        titleObject.blur();

    if (currentFocus == FOCUS_INPUT_LINE) {
        input.focus();
    } else if (currentFocus == FOCUS_CONTENT) {
        contentContainer.focus();
        if (USE_ELEMENT_LIST_WORKAROUND) {
        } else {
            if (previousSelectedEntryIndex >= 0) {
                currentlySelectedElement.selectEntryWithIndex(previousSelectedEntryIndex);
            }
        }
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
        if (USE_ELEMENT_LIST_WORKAROUND)
            selectElementIndexListElementByIndex(elementIndexList.length - 1);
        else
            currentlySelectedElement.selectEntryWithIndex(currentlySelectedElement.subTasks.length - 1);
        return false;
    } else if (e.key == 'ArrowDown') {
        if (USE_ELEMENT_LIST_WORKAROUND)
            selectElementIndexListElementByIndex(0);
        else
            currentlySelectedElement.selectEntryWithIndex(0);

        return false;
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
        currentlySelectedElement.stepOut();
    } else if (e.key == 'ArrowRight' && e.altKey == false) {
        //currentlySelectedElement.unfold();
        currentlySelectedElement.stepInto();
    } else if (e.key == ' ') {
        currentlySelectedElement.toggleFold();
    } else if (e.key == 'ArrowUp') {
        if (e.altKey) {
            if (currentlySelectedElement) {
                selectedIndexAfterUpdate = Math.max(0, elementIndexListIndex -1);
                currentlySelectedElement.moveEntry(-1);
            }
        } else if (e.ctrlKey) {
            scrollView(-1);
        } else {
            if (USE_ELEMENT_LIST_WORKAROUND)
                selectNextItemInElementIndexList(-1);
            else
                currentlySelectedElement.selectEntry(-1);
        }
    } else if (e.key == 'ArrowDown') {
        if (e.altKey) {
            if (currentlySelectedElement) {
                selectedIndexAfterUpdate = Math.min(elementIndexList.length - 1, elementIndexListIndex + 1);
                currentlySelectedElement.moveEntry(1);
            }
        } else if (e.ctrlKey) {
            scrollView(1)
        } else {
            if (USE_ELEMENT_LIST_WORKAROUND)
                selectNextItemInElementIndexList(1);
            else
                currentlySelectedElement.selectEntry(1);
        }
    } else if (e.key == 'Home') {
        if (USE_ELEMENT_LIST_WORKAROUND){
            if (currentlySelectedElement !== elementIndexList[0])
                selectElementIndexListElementByIndex(0);
        }
        else {
            if (currentlySelectedElement) {
                currentlySelectedElement.selectEntryWithIndex(0);
            }
        }
    } else if (e.key == 'End') {
        if (USE_ELEMENT_LIST_WORKAROUND)
        {
            if (currentlySelectedElement !== elementIndexList[elementIndexList.length - 1])
                selectElementIndexListElementByIndex(elementIndexList.length - 1);
        }
        else {
            if (currentlySelectedElement) {
                currentlySelectedElement.selectEntryWithIndex(currentlySelectedElement.subTasks.length - 1);
            }
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
        pasteEntry();
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
    } else if (e.key == 'l' && e .ctrlKey && DEBUG) {
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
    currentlySelectedElement.deselect();

    updateHomeIcon();
}

function updateHomeIcon() {
    if (startingPath){
        document.querySelector('#homebutton').classList.add('customstartingpath');
    } else {
        document.querySelector('#homebutton').classList.remove('customstartingpath');
    }
}


// This keeps a list of all elements sorted by their entry order into the DOM tree
// TODO Maybe it would be better to make it work without this.
// Entry-class should handle all the logic
const USE_ELEMENT_LIST_WORKAROUND = true;

let elementIndexList = [];
let elementIndexListIndex = 0;

function selectNextItemInElementIndexList(delta) {
    const newIndex = clamp(0, elementIndexList.length -1, elementIndexListIndex + delta)

    if (elementIndexListIndex != newIndex)
        selectElementIndexListElementByIndex(newIndex);
}

function selectElementIndexListElementByIndex(index) {
    elementIndexListIndex = index;
    elementIndexList[index].select();
}

function rebuildElementIndexList(keepCounter) {
    elementIndexList = [];

    if (!keepCounter)
        elementIndexListIndex = 0;

    function work(node) {
        elementIndexList.push(node);

        if (!node.folded && node.subTasks.length > 0) {
            for (let subnode of node.subTasks) {
                work(subnode);
            }
        }
    }

    work(currentSceneRoot);
    elementIndexList.shift(); // remove first element (root element)
}

function setElementIndexListIndexToElement(entry){
    for (let i=0; i<elementIndexList.length; ++i) {
        if (elementIndexList[i] === entry) {
            elementIndexListIndex = i;
            return;
        }
    }
}

let startingPath;
function makeCurrentPathStartingPath() {
    startingPath = getCurrentPath();
    localStorage.setItem(STARTING_PATH, JSON.stringify(startingPath));

    updateHomeIcon();
}

function clearStartingPath() {
    startingPath = null;
    localStorage.removeItem(STARTING_PATH);
    updateHomeIcon();
}