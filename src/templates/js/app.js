// Configuration
const cutOffLongTexts = false; // This leads to errors when trying to find elements by key (entryName) on the server side
const startFolded = true;
const maxPathInfoEntryLength = 10;

// Constants
const TITLE = "Simple Tasks";
const DELETE_ICON = "&#10060;";
// const BACK_ARROW = "&#129120;";
const BACK_ARROW = "../";
const STARTING_ENTRY_ID = 'StartingEntryID';
const MENU_ICON = "&#8942;";

// // Focus
const FOCUS_INPUT_LINE = "input";
const FOCUS_TITLE = "title";
const FOCUS_CONTENT = "content";
const FOCUS_EDIT_ENTRY_TEXT = "entry";

// Members
let data = {};
let currentSceneRootEntry;

// // Element list workaround
const USE_ELEMENT_LIST_WORKAROUND = true;
let elementIndexList = [];
let elementIndexListIndex = 0;

// // Starting path
let startingEntryID;
let jumpIntoNewlyCreatedEntry = false;

// // Focus
let currentFocus = FOCUS_CONTENT;
let currentlySelectedElement = null;

// // Editable
let titleObject;
let input;

let initialized = false;
let isMobileAgent = false;

// // Node IDs / Navigation
const ROOT_ID = "root"
let topLevelID = ROOT_ID;

// // Clipboard
const CLIPBOARD_TYPE_CUT = "cut";
const CLIPBOARD_TYPE_COPY = "copy"; // Will not be used.
const CLIPBOARD_TYPE_EMPTY = "empty";

let clipboard = {
    "entry_id": -1,
    "type": CLIPBOARD_TYPE_EMPTY
}

// // Input
const keyHandlers = {}; // Is filled in index.html

// Caching
// // Easier Access
let entriesByID = {};
let elementsByID = {};


function init() {
    if( /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ) {
        isMobileAgent = true;
        console.log("Using mobile client: ", navigator.userAgent)
    }

    createToolBar();
    createMenu();

    window.onpopstate = function(event) {
        const state = event.state;
        if (state) {
            const theID = event.state.topLevelID
            if (theID){
                restoreHistory(theID);
            }
        } else {
            console.log("No history!")
        }
    }

    initialized = true;
}

function afterInitialDataLoaded() {
    setupStartingPath();
}

function setupStartingPath() {
    let savedStartingEntryID = localStorage.getItem(STARTING_ENTRY_ID);
    startingEntryID = topLevelID;

    if (savedStartingEntryID) {
        if (entryDoesExist(savedStartingEntryID)) {
            startingEntryID = savedStartingEntryID;
        } else {
            clearStartingPath();
        }
    }

    // setPath(_currentPath);
    // setCurrentTopLevel(topLevelID);

    setCurrentTopLevel(startingEntryID);
}

function entryDoesExist(entryID) {
    return getElementByID(entryID) !== undefined;
}

// // // // // //
// Data Access //
// // // // // //

function getDataByID(entryID) {
    return entriesByID[entryID];
}
function getElementByID(entryID) {
    return elementsByID[entryID];
}

function setDataComingFromServer(newData) {
    console.log("Setting data from server");
    console.log(newData);

    data = newData;

    entriesByID[data['id']] = data;

    function iterate(parentEntryData) {
        entriesByID[parentEntryData.id] = parentEntryData;
        for (let entry of parentEntryData['entries']) {
            iterate(entry);
        }
    }

    iterate(data);
}

function restoreHistory(entryID){
    setCurrentTopLevel(entryID, false);
}

function setCurrentTopLevel(newTopLevelID, writeHistory = true) {
    topLevelID = newTopLevelID;

    if (writeHistory) {
        console.log("set history", getDataByID(topLevelID)['text'])
        window.history.pushState({
            "topLevelID": topLevelID
        }, getDataByID(topLevelID)['text'], "")
    }

    _createEverything(getDataByID(topLevelID))

    // Start subtask-container visible, if there are no entries yet.
    // This prevents a bug when entering entry without sub-entries and then adding subentries,
    // where subentries would not show up (sub-entry container would have style.display=none)
    if (currentSceneRootEntry.subTasks.length == 0) {
        currentSceneRootEntry.unfold();
    }

    let pathInfoText = "";
    const spacer = "&nbsp;/&nbsp;";
    function createPathInfoText(entryData) {
        if (entryData.parent_id) {
            let pathEntryText = entryData.text;
            if (entryData.text.length > maxPathInfoEntryLength) {
                pathEntryText = pathEntryText.split(' ')[0];
            }
            // pathEntryText = pathEntryText.substring(0, maxPathInfoEntryLength)

            pathInfoText = pathEntryText + spacer + pathInfoText;
            createPathInfoText(getDataByID(entryData.parent_id));
        }
    }
    createPathInfoText(currentSceneRootEntry.data);
    pathInfoText = spacer + pathInfoText.slice(0, -spacer.length)
    pathInfo.innerHTML = pathInfoText;
}

function getCurrentTopLevelID() {
    return topLevelID;
}

function getCurrentData() {
    return accessPathData(getCurrentTopLevelID())
}

function getParentPath() {
    const parentPath = copyCurrentPath();
    parentPath.pop();
    return parentPath;
}

function accessPathData(entryID)
{
    return getDataByID(entryID)
    let tmpData = data;
    for (let pathElement of path){
        tmpData = tmpData[pathElement];
    }
    return tmpData;
}

function copyCurrentPath() {
    return copyPath(getCurrentTopLevelID());
}

// // // // // // //
// Rearrange data //
// // // // // // //

function reparentEntry() {
}

function clearCut() {
    if (clipboard.type == CLIPBOARD_TYPE_CUT) { // there is already an element marked for cutting
        getElementByID(clipboard.entry_id).unmarkCut();
    }
}

function cutSelectedEntry() {
    if (currentlySelectedElement) {
        clearCut();

        clipboard.entry_id = currentlySelectedElement.entry_id;
        clipboard.type = CLIPBOARD_TYPE_CUT;
        currentlySelectedElement.markCut();
    }
}
/*
function copySelectedEntry() {
    if (currentlySelectedElement) {
        clearCut();
        clipboard.entry_id = currentlySelectedElement.entry_id;
        clipboard.type = CLIPBOARD_TYPE_COPY;
    }
} // */

function pasteEntry() {
    if (clipboard.type == CLIPBOARD_TYPE_EMPTY)
        return;

    // Find paste target
    let pasteID;
    if (currentlySelectedElement)
        pasteID = currentlySelectedElement.entry_id;
    else
        pasteID = currentSceneRootEntry.entry_id;

    // Prevent cut-pasting into itself
    if (clipboard.type == CLIPBOARD_TYPE_CUT) {
        if (pasteID == clipboard.entry_id)
            return;
    }

    // Execute paste on server
    sendPaste(pasteID);
}


// // // // // // //
// User Interface //
// // // // // // //
function updateDisplayedData() {
    const tmpInit = initialized;
    if (!tmpInit)
        init();

    _createEverything(getCurrentData());
    rebuildElementIndexList();

    if (!tmpInit)
        afterInitialDataLoaded();
}

function addEntryFromInput(jumpInto) {
    const potentialText = input.value;
    const actualInputValue = potentialText.trim();

    if (actualInputValue == "")
        return;

    const newEntryText = actualInputValue;
    input.value = '';

    if (jumpInto) {
        jumpIntoNewlyCreatedEntry = true;
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
        if (startingEntryID == getCurrentTopLevelID())
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
    return getDataByID(getCurrentTopLevelID())['text'];
    let currPath = getCurrentTopLevelID();
    let actualTitle = currPath[currPath.length -1];
    return actualTitle
}

function isAtRootLevel() {
    const topLevelEntry = getDataByID(getCurrentTopLevelID());

    if (topLevelEntry) {
        return topLevelEntry.parent_id == null;
    }

    return true;
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
            sendRename(getCurrentTopLevelID(), titleObject.innerText);
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
        sendDelete(getCurrentTopLevelID(), currentSceneRootEntry.subTasks.length > 0);
    }]);

    buttons.push(["Paste on current top level", () => {
        sendPaste(getCurrentTopLevelID());
    }]);


    buttons.push(["Use light thme", () => { setLightTheme(); }]);
    buttons.push(["Use dark thme", () => { setDarkTheme(); }]);

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
        'parent_id': getCurrentSelectedEntryID(),
        'text': text
    }
    console.log("sendData")
    console.log(sendData)
    send(sendData);
}

function sendRename(entryID, newName) {
    send({
        'action': 'change_text',
        'entry_id': entryID,
        'text': newName
    })
}

function sendPaste(targetPasteID) {
    const sendData = {
        'action': 'paste_entry',
        'target_id': targetPasteID,
        'entry_id': clipboard.entry_id,
        'type': clipboard.type
    }
    send(sendData);
}

function sendDelete(entryID, askConfirmation) {
    if (askConfirmation) {
        if (!confirm("There are sub-tasks, do you really want to delete this? (" + entryID + ")"))
            return false;
    }

    send({
        'action': 'delete_entry',
        'entry_id': entryID
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
    buttons.push(["Delete", () => { currentlySelectedElement.delete(); }])
    buttons.push(["Cut", () => { cutSelectedEntry(); }])
    // buttons.push(["Copy", () => { copySelectedEntry(); }])
    buttons.push(["Paste", () => { pasteEntry(); }])
    buttons.push(["Down", () => { sendMoveEntry(currentlySelectedElement.entry_id, 1); }])
    buttons.push(["Up", () => { sendMoveEntry(currentlySelectedElement.entry_id, -1); }])

    addButtonsToToolbar(buttons, selectionToolbar);

    buttons = [];
    buttons.push(["Add", () => {alert("test")}]); // Template

    addButtonsToToolbar(buttons, globalToolbar);
    globalToolbar.style.display = 'none'

    // global
    toolbarDefaultStyleDisplay = selectionToolbar.style.display;
}

function sendMoveEntry(entryID, delta){
    send({
        "action": 'move_entry',
        "entry_id": entryID,
        "delta": delta
    })
}

function showToolbar(value = true) {
    if (value && isMobileAgent)
        selectionToolbar.style.display = toolbarDefaultStyleDisplay;
    else
        selectionToolbar.style.display = "none";
}


// // // // // // // // // //
// Path and History Stuff  //
// // // // // // // // // //

function goUp() {
    if (currentSceneRootEntry.parentID) {
        setCurrentTopLevel(currentSceneRootEntry.parentID);
    }
}

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
            //currentlySelectedElement.deselect();
            //elementIndexListIndex = -1;
        }
    }
    else if (oldFocus == FOCUS_TITLE)
        titleObject.blur();

    if (currentFocus == FOCUS_INPUT_LINE) {
        input.focus();
    } else if (currentFocus == FOCUS_CONTENT) {
        contentContainer.focus();
    } else if (currentFocus == FOCUS_TITLE) {
        titleObject.focus();
    }
}

// // // // // // // //
// Keyboard Handler  //
// // // // // // // //

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
    } else if (e.key == 'Escape') {
        setFocus(FOCUS_CONTENT);
        return false;
    }
    return true;
}

function entryKeyDownHandler(e) {
    if (e.key == 'Escape') {
        if (currentlySelectedElement) {
            currentlySelectedElement.resetTextChanges();
            setFocus(null);
        }
    } else if (e.key == 'Enter') {
        currentlySelectedElement.updateTextOnServer();
        setFocus(null);
    } else {
        return true;
    }

    return false;
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
        if (currentlySelectedElement)
            currentlySelectedElement.stepOut();
    } else if (e.key == 'ArrowRight' && e.altKey == false) {
        //currentlySelectedElement.unfold();
        if (currentlySelectedElement)
            currentlySelectedElement.stepInto();
    } else if (e.key == ' ') {
        if (currentlySelectedElement)
            currentlySelectedElement.toggleFold();
    } else if (e.key == 'ArrowUp') {
        if (e.altKey) {
            if (currentlySelectedElement) {
                sendMoveEntry(currentlySelectedElement.entry_id, -1)
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
                sendMoveEntry(currentlySelectedElement.entry_id, +1)
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
    } else if (e.key == 'Escape') {
        if (currentlySelectedElement) {
            // elementIndexListIndex = -1;
            currentSceneRootEntry.select();
        }
    } else if (e.key == 'Enter') {
        if (currentlySelectedElement)
            currentlySelectedElement.enter();
    } else if (e.key == 'Backspace') {
        goUp();
    } else if (e.key == 'Delete') {
        if (currentlySelectedElement)
            currentlySelectedElement.delete(askForConfirmationForSubtasks = !e.shiftKey);
    } /*else if (e.key == 'c' && e.ctrlKey) {
        if (currentlySelectedElement)
            copySelectedEntry();
    } */ else if (e.key.toLowerCase() == 'v' && e.ctrlKey) {
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
        if (currentlySelectedElement) {
            setFocus(FOCUS_EDIT_ENTRY_TEXT);
            currentlySelectedElement.makeEditable();
            // document.execCommand('selectAll', false, null);
        } else {
            if (!isAtRootLevel()) {
                setFocus(FOCUS_TITLE);
                document.execCommand('selectAll', false, null);
            }
        }
    } else if (e.key == 'l' && e .ctrlKey) { //  && DEBUG) {
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

// Treat root level just like any other entry to unify workflow for top-level entries with subtasks
function _createEverything(contentData) {
    contentContainer.innerText = "";
    elementsByID = {};

    createTitle();

    console.log("Create everything for", getCurrentTopLevelID())

    currentSceneRootEntry = new Entry(
        entryData = contentData,
        parentContainer = null,
        subtasksContainer = contentContainer
    );

    currentlySelectedElement = currentSceneRootEntry

    currentlySelectedElement.stepInto();
    currentlySelectedElement.deselect();

    updateHomeIcon();

    if (clipboard.type == CLIPBOARD_TYPE_CUT) {
        const cuttingElement = getElementByID(clipboard.entry_id);
        if (cuttingElement)
            cuttingElement.markCut();
    }
}

function updateHomeIcon() {
    if (startingEntryID === ROOT_ID){
        document.querySelector('#homebutton').classList.remove('customstartingpath');
    } else {
        document.querySelector('#homebutton').classList.add('customstartingpath');
    }
}


// This keeps a list of all elements sorted by their entry order into the DOM tree
// TODO Maybe it would be better to make it work without this.
// Entry-class should handle all the logic
function selectNextItemInElementIndexList(delta) {
    const newIndex = clamp(0, elementIndexList.length -1, elementIndexListIndex + delta)

    if (elementIndexListIndex != newIndex || currentlySelectedElement != elementIndexList[newIndex])
        selectElementIndexListElementByIndex(newIndex);
}

function selectElementIndexListElementByIndex(index) {
    elementIndexListIndex = index;
    const contender = elementIndexList[index]
    if (contender)
        contender.select();
}

function rebuildElementIndexList(keepCounter) {
    elementIndexList = [];

    if (!keepCounter)
        elementIndexListIndex = 0;

    function work(entry) {
        elementIndexList.push(entry);

        if (!entry.folded && entry.subTasks.length > 0) {
            for (let subtask of entry.subTasks) {
                work(subtask);
            }
        }
    }

    work(currentSceneRootEntry);
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

function makeCurrentPathStartingPath() {
    startingEntryID = getCurrentTopLevelID()
    localStorage.setItem(STARTING_ENTRY_ID, startingEntryID);

    updateHomeIcon();
}

function clearStartingPath() {
    startingEntryID = ROOT_ID;
    localStorage.removeItem(STARTING_ENTRY_ID);

    updateHomeIcon();
}

function getCurrentSelectedEntryID() {
    if (currentlySelectedElement) {
        return currentlySelectedElement.entry_id;
    }
    return currentSceneRootEntry.entry_id;
}

// Actions on server successful
function addingEntrySuccessful(newEntryData) {
    const entryID = newEntryData['id'];
    const parentID = newEntryData['parent_id'];

    const parentData = getDataByID(parentID)
    const parentElement = getElementByID(parentID);

    entriesByID[entryID] = newEntryData;
    parentData['entries'].push(newEntryData);
    parentElement.addSubTask(entryID);
    if (parentElement.folded)
        parentElement.unfold();

    rebuildElementIndexList(); // TODO should this keep index?

    // FIXME Should not need to deselect and re-select current selection.
    // Needed to be able to use arrow keys after adding child for navigation
    parentElement.deselect();
    if (jumpIntoNewlyCreatedEntry) {
        getElementByID(entryID).enter();
        setFocus(FOCUS_INPUT_LINE);
        jumpIntoNewlyCreatedEntry = false;
    } else {
        parentElement.select();
    }
}

function deletingEntrySuccessful(deletedIDs) {
    const parent = getElementByID(getDataByID(deletedIDs[0])['parent_id'])

    for (let delID of deletedIDs) {
        delete elementsByID[delID];
        delete entriesByID[delID];
    }

    parent.removeSubTask(deletedIDs[0]);
    rebuildElementIndexList(true);

    if (elementIndexList.length > 0)
        selectElementIndexListElementByIndex(clamp(0, elementIndexList.length - 1, elementIndexListIndex));
}

function changeTextSuccessful(entryID, newText) {
    const data = getDataByID(entryID);
    data['text'] = newText;

    if (getCurrentTopLevelID() === entryID)
        createTitle();
    else
        getElementByID(entryID).setText(newText);
}

function cutPasteSuccessful(oldParentID, newParentID, entryID, clipboard_type) {
    if (clipboard_type == CLIPBOARD_TYPE_CUT) {
        clipboard.type = CLIPBOARD_TYPE_EMPTY;
        clipboard.entry_id = -1; // Probably not necessary when type is set to empty
    }

    // Update data
    const oldParentElement = getElementByID(oldParentID);
    if (oldParentElement) { // Prevent error when navigating to another task where oldParentElement is not part of the tree any more
        oldParentElement.removeSubTask(entryID);
    } else {
        // delete from data only if element is not visible
        // if element is visible, data-entry-deletion will be done in the element itself
        const oldParentData = getDataByID(oldParentID);
        const entryToDelete = getDataByID(entryID)
        const deleteIndex = oldParentData['entries'].indexOf(entryToDelete);
        oldParentData['entries'].splice(deleteIndex, 1);
    }

    const newParent = getElementByID(newParentID);
    const newParentData = getDataByID(newParentID);

    newParentData['entries'].push(getDataByID(entryID));
    newParent.addSubTask(entryID); // Update visuals

    const pastedEntry = getElementByID(entryID);
    const pastedEntryData = getDataByID(entryID);
    pastedEntryData['parent_id'] = newParentID;
    pastedEntry.parentID = newParentID;

    // Visual updates
    newParent.unfold();
    rebuildElementIndexList(true);
    getElementByID(entryID).select();
}
/*
function copyPasteSuccessful(copiedEntryID, newParentID, newRootID, clipboardType) {
    // console.log(copiedEntryID, newParentID, newRootID, clipboardType);

    const dataToCopy = getDataByID(copiedEntryID);
    const newParentData = getDataByID(newParentID);

    newParentData.addSubTask(getDataByID(copiedEntryID));
}
//*/
function move_entry_response(entryID, delta, success) {
    const entryElement = getElementByID(entryID);
    if (success) {
        entryElement.deselect(); // Required, otherwise next .select() will not be visible, because visually it will be deselected

        entryElement.moveEntry(delta);
        rebuildElementIndexList();

        entryElement.select(); // Required, without this, the newly rebuilt selection index will not be used
    }
}

function setLightTheme() {
    var html = document.getElementsByTagName('html')[0];
    html.style.setProperty("--tasksGreen", "#398513ff");
    html.style.setProperty("--outerContentBackground", "#ccc");
    html.style.setProperty("--entryBackground", "#ccc");
    html.style.setProperty("--entryBorder", "#aaa");
    html.style.setProperty("--subEntriesBackground", "#fff2");
    html.style.setProperty("--subTasksCounterLabel", "#0003");
    html.style.setProperty("--bodyBackground", "#aaa");
    html.style.setProperty("--inputElementsBackground", "#fafafa");
    html.style.setProperty("--dashedCut", "#000");
    html.style.setProperty("--fontColor", "#111");
}

function setDarkTheme() {
    var html = document.getElementsByTagName('html')[0];
    html.style.setProperty("--tasksGreen", "#398513ff");
    html.style.setProperty("--outerContentBackground", "#292b2f");
    html.style.setProperty("--entryBackground", "#2f3136");
    html.style.setProperty("--entryBorder", "#5559");
    html.style.setProperty("--subEntriesBackground", "#0001");
    html.style.setProperty("--subTasksCounterLabel", "#fff3");
    html.style.setProperty("--bodyBackground", "#36393f");
    html.style.setProperty("--inputElementsBackground", "#40444b");
    html.style.setProperty("--dashedCut", "#ddd");
    html.style.setProperty("--fontColor", "#fafafa");
}
