// Configuration
const cutOffLongTexts = false; // This leads to errors when trying to find elements by key (entryName) on the server side

// Constants
const TITLE = "Simple Tasks";
const DELETE_ICON = "&#10060;";
const BACK_ARROW = "&#129120;";

// // Focus
const FOCUS_INPUT_LINE = "input";
const FOCUS_TITLE = "title";
const FOCUS_CONTENT = "content";

// Members
// let history = []
let historyIndex = 0;

let data = {};
let _currentPath = [];
let selectedEntryIndex = -1;
let previousSelectedEntryIndex = -1;

// // Focus
let currentFocus = FOCUS_CONTENT;


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

function copyPath(path) {
    let newPath = []

    for (let part of path)
        newPath.push(part);

    return newPath;
}

function copyCurrentPath() {
    return copyPath(getCurrentPath());
}

function reassignIndices() {
    let indexCounter = 0;
    for (let element of entryElements) {
        element.index = indexCounter;
        indexCounter += 1;
    }
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
    // focusInput();

    if (selectedIndexAfterUpdate >= 0) {
        selectEntryWithIndex(selectedIndexAfterUpdate);
        selectedIndexAfterUpdate = -1;
    }
}


function createEntry(entryName, entryData, parentElement, parentContainer, parentPath) {
    const newEntryWrapper = document.createElement('div');
    newEntryWrapper.setAttribute('class', 'entryWrapper');

    const actualTask = document.createElement('div');
    actualTask.setAttribute('class', 'actualTask');
    newEntryWrapper.appendChild(actualTask);

    const subTasks = document.createElement('div');
    subTasks.setAttribute('class', 'subTasks');
    newEntryWrapper.appendChild(subTasks);

    // for copying
    newEntryWrapper.name = entryName;
    newEntryWrapper.data = entryData;
    // copy end

    newEntryWrapper.select = () => {
        newEntryWrapper.classList.add('focused');
        newEntryWrapper.scrollIntoView(false);
    };
    newEntryWrapper.deselect = () => {
        newEntryWrapper.classList.remove('focused');
    };

    newEntryWrapper.enter = () => {
         // Enter sub-level
        const tmpParentPath = copyPath(parentPath);
        tmpParentPath.push(entryName);
        setPath(tmpParentPath);

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


    // Add sub-tasks functionality
    newEntryWrapper.folded = true;
    newEntryWrapper.subTasks = []
    newEntryWrapper.unfold = () => {
        if (newEntryWrapper.folded === false) { // Already unfolded
            if (newEntryWrapper.subTasks.length > 0)
                selectEntry(1);
            return;
        }

        newEntryWrapper.folded = false;

        const targetPath = getCurrentPath();
        targetPath.push(entryName);

        let insertIndex = selectedEntryIndex + 1;
        for (let subtaskKey in entryData) {
            const subTaskParentPath = copyPath(parentPath);
            subTaskParentPath.push(entryName);

            let newSubTaskElement = createEntry(subtaskKey, entryData[subtaskKey], newEntryWrapper, subTasks, subTaskParentPath);
            newEntryWrapper.subTasks.push(newSubTaskElement);
            entryElements.splice(insertIndex, 0, newSubTaskElement);
            newSubTaskElement.index = insertIndex;
            insertIndex += 1;
        }
        reassignIndices();
    }

    newEntryWrapper.fold = () => {
        if (newEntryWrapper.folded === true || newEntryWrapper.subTasks.length == 0) {
            if (parentElement)
                selectEntryWithIndex(parentElement.index)
            return;
        }

        newEntryWrapper.folded = true;

        for (let subTaskElement of newEntryWrapper.subTasks) {
            subTaskElement.fold();
            subTasks.removeChild(subTaskElement);
            delete subTaskElement;

            const deleteIndex = entryElements.indexOf(subTaskElement);
            entryElements.splice(deleteIndex, 1);
        }
        newEntryWrapper.subTasks = []
        reassignIndices();
    }

    newEntryWrapper.toggleFold = () => {
        if (newEntryWrapper.folded)
            newEntryWrapper.unfold();
        else
            newEntryWrapper.fold();
    }

    // Add main part to show text and enter sub-level
    const newEntryButton = document.createElement('div');
    let entryText = entryName;
    const maxLength = 256
    if (cutOffLongTexts && entryText.length > maxLength){
        entryText = entryText.substring(0, maxLength) + "..."
    }
    newEntryButton.setAttribute('class', 'entryEnterButton');
    newEntryButton.innerText = entryText;

    actualTask.appendChild(newEntryButton);

    newEntryButton.onclick = () => {
        newEntryWrapper.enter();
    };

    // Count subtasks
    let subTasksCounter = 0;
    function countSubTasks(subData) {
        for (let key of Object.keys(subData)) {
            subTasksCounter += 1;
            countSubTasks(subData[key]);
        }
    }

    countSubTasks(entryData);

    // Add sub tasks counter label
    if (subTasksCounter > 0) {
        const subTasksCounterLabel = document.createElement('div');
        subTasksCounterLabel.setAttribute('class', 'icon subcounter');
        subTasksCounterLabel.innerText = subTasksCounter;
        actualTask.appendChild(subTasksCounterLabel);

        subTasksCounterLabel.onclick = () => {
            newEntryWrapper.toggleFold();
        }

    }

    // Add delete button
    const deleteButton = document.createElement('div');
    deleteButton.setAttribute('class', 'icon deletebutton');
    deleteButton.innerHTML = DELETE_ICON;
    actualTask.appendChild(deleteButton);

    deleteButton.onclick = () => {
        newEntryWrapper.delete();
    };

    parentContainer.appendChild(newEntryWrapper);
    return newEntryWrapper;
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

function _createEverything(contentData) {
    contentContainer.innerText = "";

    createTitle();

    const entries = contentData;
    entryElements = [];
    for (let key in entries) {
        const entry = entries[key];

        let newEntryElement = createEntry(key, entry, null, contentContainer, getCurrentPath());
        entryElements.push(newEntryElement);
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

    previousSelectedEntryIndex = selectedEntryIndex;
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
    if (newIndex >= 0)
        deselectEntries();

    input.blur();
    titleObject.blur();

    selectedEntryIndex = newIndex;
    entryElements[selectedEntryIndex].select();
    setFocus(FOCUS_CONTENT);
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

    if (oldFocus == FOCUS_CONTENT)
        deselectEntries();
    else if (oldFocus == FOCUS_TITLE)
        titleObject.blur();

    if (currentFocus == FOCUS_INPUT_LINE) {
        input.focus();
    } else if (currentFocus == FOCUS_CONTENT) {
        contentContainer.focus();
        if (previousSelectedEntryIndex >= 0)
            selectEntryWithIndex(previousSelectedEntryIndex);
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
        if (entryElements.length > 0) {
            selectEntryWithIndex(entryElements.length - 1);
            return false;
        }
    } else if (e.key == 'ArrowDown') {
        if (entryElements.length > 0){
            selectEntryWithIndex(0);
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
    if (e.key == 'ArrowLeft') {
        entryElements[selectedEntryIndex].fold();
    } else if (e.key == 'ArrowRight') {
        entryElements[selectedEntryIndex].unfold();
    } else if (e.key == ' ') {
        entryElements[selectedEntryIndex].toggleFold();
    } else if (e.key == 'ArrowUp') {
        if (e.altKey) {
            moveEntry(-1);
        } else if (e.ctrlKey) {
            scrollView(-1);
        } else {
            selectEntry(-1);
        }
    } else if (e.key == 'ArrowDown') {
        if (e.altKey) {
            moveEntry(1);
        } else if (e.ctrlKey) {
            scrollView(1)
        } else {
            selectEntry(1);
        }
    } else if (e.key == 'Home') {
        if (entryElements.length > 0)
            selectEntryWithIndex(0);
    } else if (e.key == 'End') {
        if (entryElements.length > 0)
            selectEntryWithIndex(entryElements.length - 1);
    } else if (e.key == 'Enter') {
        entryElements[selectedEntryIndex].enter();
    } else if (e.key == 'Delete') {
        entryElements[selectedEntryIndex].delete(askForConfirmationForSubtasks = !e.shiftKey);
    } else if (e.key == 'Backspace') {
        goBack();
    } else if (e.key == 'c' && e.ctrlKey) {
        if (selectedEntryIndex >= 0)
            copySelectedEntry();
    } else if (e.key == 'v' && e.ctrlKey) {
        //if (selectedEntryIndex >= 0)
        pasteSelectedEntry();
    } else if (e.key == 'x' && e.ctrlKey) {
        if (selectedEntryIndex >= 0)
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
    } else if (e.key == 'ArrowLeft' && e.altKey) {
        goBack();
        return false;
    } else if (e.key == 'ArrowRight' && e.altKey) {
        goForward();
        return false;
    } else if (e.key == 'F2') {
        if (!isAtRootLevel()) {
            //deselectEntries();

            setFocus(FOCUS_TITLE);
            document.execCommand('selectAll', false, null);
        }
    } else {
        if (currentFocus) {
            if(keyHandlers[currentFocus](e) === false)
                return false;
        }

        if (!(e.key == 'Shift' || e.key == 'Control' || e.key == 'Alt')){
            if (currentFocus == FOCUS_CONTENT)
                setFocus(FOCUS_INPUT_LINE);
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