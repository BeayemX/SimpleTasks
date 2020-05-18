let DEBUG = false;
const FOLD_WHEN_STEPPING = false;
const maxLength = 256; // Not used
const LONG_PRESS_DURATION_MS = 500;

class Entry {
    constructor(entryData, parentContainer, subtasksContainer = null) {

        // Workaround for upgrading to sql
        this.entry_id = entryData['id']

        let entryName = entryData['text'];
        // let parent = getDataByID(entryData['parent_id'])
        let parentID = entryData['parent_id']

        // console.log(entryName, parent, parentContainer, parentID, subtasksContainer)
        this.name = entryName; // TODO rename to 'text'?
        this.data = entryData;
        // this.parent = getElementByID(this.parentID); // not html element. is EntryClass
        this.parentContainer = parentContainer;
        this.parentID = parentID;

        // Subtasks
        this.selectedIndex = -1; // -1 if parent itself is selected (no subtask selected)
        this.subTasks = [];

        // Members
        this.folded = false;

        // Configuration

        // HTML Elements
        this.element = this.createHTMLElements(parentContainer, subtasksContainer);
        this.subTasksElement; // For folding
        this.actionBar;
        this.showActionBarButton;

        elementsByID[this.entry_id] = this;

        this.doneSettingUp = true;
    }
    getOwner = () => {
        let currEntry = this;
        while (true) {
            if (!currEntry.parent.parent)
                break;

            currEntry = currEntry.parent;
        }
        return currEntry;
    }

    setText = (newText) => {
        this.name = newText;
        this.label = this.name;
    }

    getParentPath = () => {
        // return parentID
        return copyPath(this.parentID);
    }

    getElementPath = () => {
        const path = this.getParentPath();
        path.push(this.name);
        return path;
    }
    forceSelect(mouseSelect) {
        this.select(mouseSelect, true);
    }
    select = (mouseSelection, force) => {
        const itsMe = currentlySelectedElement === this;
        if ( itsMe && force) { // do not deselect me
            // pass
        } else {
            if (currentlySelectedElement) {
                currentlySelectedElement.deselect();

                if (itsMe)
                    return;
            }
        }

        this.selectedIndex = -1;

        currentlySelectedElement = this;
        this.element.classList.add('focused');

        const parentElement = getElementByID(this.parentID);
        if (parentElement)
            parentElement.setSelected(this);

        if (!mouseSelection) {
            // this.getOwner().element.scrollIntoView(true);
            const theValue = this.element.offsetTop - contentContainer.scrollTop;
            const upperLimit = 0.25
            const lowerLimit = 0.75
            if (theValue < window.innerHeight * upperLimit)
               contentContainer.scrollTo(0, this.element.offsetTop - window.innerHeight * upperLimit);
            if (theValue > window.innerHeight * lowerLimit);
                contentContainer.scrollTo(0, this.element.offsetTop - window.innerHeight * lowerLimit);
        }

        if (USE_ELEMENT_LIST_WORKAROUND)
            setElementIndexListIndexToElement(this);

        setFocus(FOCUS_CONTENT);
        showToolbar();
        setTheme();
    };

    setSelected = (subtask) => {
        this.selectedIndex = this.subTasks.indexOf(subtask);
        // console.log("Selected Task:", this.subTasks[this.selectedIndex].getElementPath());
    }

    deselect = () => {
        this.element.classList.remove('focused');
        this.showActionBarButton.style.display = 'none';
        //this.hideActionBar();

        if (currentlySelectedElement === this)
            currentlySelectedElement = null;

        showToolbar(false);
        setTheme();
    };

    showActionBar = () => {
        if (isMobileAgent)
            this.actionBar.style.display = "flex";
    }

    hideActionBar = () => {
        this.actionBar.style.display = "none";
    }

    toggleActionBar = () => {
        if (this.actionBar.style.display == 'flex')
            this.hideActionBar();
        else
            this.showActionBar();
    }

    enter = () => {
        if (this.selectedIndex == -1) {
            // Enter sub-level
            //const tmpParentPath = ;

            // tmpParentPath.push(this.name);
            //setPath(tmpParentPath);
            setCurrentTopLevel(this.entry_id);

            /*
            const stateObj = {
                "currentPath": currentPath;
            }
            history.pushState(stateObj, )
            */
        } else {
            this.subTasks[this.selectedIndex].enter();
        }
     }

     delete = (askForConfirmationForSubtasks = true) => {
        if (this.selectedIndex == -1) {
            const askConfirmation = this.subTasks.length > 0 && askForConfirmationForSubtasks;
            sendDelete(this.entry_id, askConfirmation);
        } else {
            this.subTasks[this.selectedIndex].delete(askForConfirmationForSubtasks);
        }
     }


     unfold = (recursive = false) => {
        if (this.selectedIndex == -1) {
            if (this.folded === false) { // Already unfolded
                /*
                if (this.subTasks.length > 0)
                    selectEntry(1);
                    //*/
                return;
            }

            this.folded = false;

            /* TODO only if alt is pressed
            for (let subTaskElement of this.subTasks) {
                subTaskElement.unfold();
            } //*/
            //reassignIndices();
            this.subTasksElement.style.display = "flex";
            if (this.doneSettingUp) {
                if (recursive) {
                    for (let subtask of this.subTasks)
                        subtask.unfold(recursive);
                }
                rebuildElementIndexList(true);
            }
        } else {
            this.subTasks[this.selectedIndex].unfold();
        }
    }

    fold = (recursive) => {
        if (this.selectedIndex == -1) {

            if (this.folded === true) {
                /*
                if (this.folded === true || this.subTasks.length == 0) {
                    if (parent)
                    selectEntryWithIndex(parent.index)
            */
                return;
            }

            this.folded = true;

            // TODO only if alt is pressed
            /*
            for (let subTaskElement of this.subTasks) {
                subTaskElement.fold();
            } // */
            //this.subTasks = []
            // reassignIndices();
            this.subTasksElement.style.display = 'none';
            if (this.doneSettingUp) {
                if (recursive) {
                    for (let subtask of this.subTasks)
                        subtask.fold(recursive);
                }
                rebuildElementIndexList(true);
            }
        } else {
            this.subTasks[this.selectedIndex].unfold();
        }
    }

    toggleFold = () => {
        if (this.folded)
            this.unfold();
        else
            this.fold();
    }

    stepOut = () => {
        if (this.selectedIndex == -1) {
            if (FOLD_WHEN_STEPPING && !this.folded) {
                this.fold();
            } else {
                const parent = getElementByID(this.parentID);
                const grandParent = getElementByID(parent.parentID);

                if (grandParent && parent.entry_id != currentSceneRootEntry.entry_id) { // Second condidtion prevents folding top level when in sub-level
                    if (this.folded) { // Select parent if current level already folded
                        this.deselect();

                        parent.selectedIndex = -1;
                        parent.select();
                    } else { // Fold current level before selecting parent
                        this.fold();
                    }
                } else {
                    if (this.entry_id != currentSceneRootEntry.entry_id) { // Second condidtion prevents folding top level when in sub-level
                        this.fold();
                    }
                }
            }
        } else {
            this.subTasks[this.selectedIndex].stepOut();
        }
    }

    stepInto = () => {
        if (this.selectedIndex == -1) {
            if (this.folded && FOLD_WHEN_STEPPING) {
                this.unfold();
            } else {
                if (this.subTasks.length == 0) {
                    // this.selectEntry(1); // select next sibling if there is nothing to step into
                } else {
                    if (this.folded)
                    this.unfold();

                    this.selectedIndex = 0;
                    this.deselect();
                    this.subTasks[this.selectedIndex].select();
                }
            }
        } else {
            this.subTasks[this.selectedIndex].stepInto();
        }
    }

    deselectEntries = () => {
        if (this.selectedIndex == -1) {
            for (let element of this.subTasks)
                element.deselect();
        } else {
            this.subTasks[this.selectedIndex].deselect()
        }
    }


    selectEntryWithIndex = (newIndex) => {
        //if (this.selectedIndex == -1) {
            if (newIndex >= 0)
                this.deselectEntries();

            this.selectedIndex = newIndex;
            this.subTasks[this.selectedIndex].select();
        //} else {
            //this.selectEntryWithIndex[this.selectedIndex].selectEntry(delta)
        //}
    }

    moveEntry = (delta) => {
        if (this.selectedIndex == -1) {
            const parent = getElementByID(this.parentID);
            let previousPosition = parent.subTasks.indexOf(this);
            let newPosition = previousPosition + delta;

            const subLength = parent.subTasks.length;
            newPosition = clamp(0, subLength - 1, newPosition);

            if (newPosition != previousPosition) {
                // Change data
                // // Remove current element temporarily
                parent.data['entries'].splice(previousPosition, 1);
                parent.subTasks.splice(previousPosition, 1);

                parent.data['entries'].splice(newPosition, 0, this.data);
                parent.subTasks.splice(newPosition, 0, this);

                // Update visuals
                const parentNode = this.element.parentNode;

                if (delta > 0) {
                    parentNode.insertBefore(this.element.nextSibling, this.element);
                } else {
                    parentNode.insertBefore(this.element, this.element.previousSibling);
                }
            }
        } else {
            this.subTasks[this.selectedIndex].moveEntry(delta);
        }
    }

    copy = (e) => {
        copySelectedEntry();
        e.stopPropagation();
        e.preventDefault();
        return false;
    }

    paste = (e) => {
        pasteEntry();
        e.stopPropagation();
        e.preventDefault();
        return false;
    }

    createHTMLElements = (parentContainer, subtasksContainer=null) => {
        const element = document.createElement('div');
        element.setAttribute('class', 'entryWrapper');

        const actualTask = document.createElement('div');
        actualTask.setAttribute('class', 'actualTask');
        element.appendChild(actualTask);

        if (subtasksContainer) {
            this.subTasksElement = subtasksContainer
        } else {
            this.subTasksElement = document.createElement('div');
            this.subTasksElement.setAttribute('class', 'subTasks');
        }

        // Add main part to show text and enter sub-level
        const label = document.createElement('div');
        this.label = label;
        let entryText = this.name;

        if (cutOffLongTexts && entryText.length > maxLength){
            entryText = entryText.substring(0, maxLength) + "..."
        }

        label.setAttribute('class', 'entryEnterButton');
        if (DEBUG) {
            // label.innerText = entryText + " [ " + this.getParentPath().join(' / ') + " ]";
            let parName = this.parent;
            if (parName)
                parName = parName.name

            label.innerText = entryText + "( " + parName + " )";
        } else {

            label.innerText = entryText;
        }

        actualTask.appendChild(label);

        element.ondblclick = (e) => {
            this.enter();
            // this.toggleActionBar();
            // this.select();
            e.preventDefault();
            e.stopPropagation();
            return false;
        }

        element.onclick = (e) => {
            this.select(true);
            e.preventDefault();
            e.stopPropagation();
            return false;
        };
        label.onselectstart = (e) => {
            e.preventDefault();
            e.stopPropagation();
            return false;
        }
        label.oncontextmenu = (e) => {
            e.preventDefault();
            e.stopPropagation();
            return false;
        }
        label.ontouchstart = (e) => {
            this.actionBarTimeout = setTimeout(() => {
                this.forceSelect(true);
                if (currentlySelectedElement == this) {
                    this.makeEditable();
                    // this.showActionBar();
                }
            }, LONG_PRESS_DURATION_MS)
        }

        const cancelLongPress = (e) => {
            if (this.actionBarTimeout){
                clearTimeout(this.actionBarTimeout);
                this.actionBarTimeout = null;
            }
        }
        label.ontouchend = cancelLongPress;
        label.ontouchmove = cancelLongPress;

        // Button for showing ActionBar
        const showActionBarButton = document.createElement('div');
        showActionBarButton.setAttribute('class', 'icon subcounter');
        showActionBarButton.innerHTML = "&nbsp;*&nbsp;";
        showActionBarButton.style.display = 'none';
        actualTask.appendChild(showActionBarButton);

        showActionBarButton.onclick = (e) => {
            //this.toggleActionBar();
            e.stopPropagation();
            return false;
        }
        this.showActionBarButton = showActionBarButton;

        // Add sub-tasks functionality

        // // Add sub tasks counter label
        const subTasksCounterLabel = document.createElement('div');
        subTasksCounterLabel.setAttribute('class', 'icon subcounter');
        actualTask.appendChild(subTasksCounterLabel);

        subTasksCounterLabel.onclick = (e) => {
            this.toggleFold();
            e.stopPropagation();
            return false;
        }

        subTasksCounterLabel.ontouchstart = (e) => {
            this.subTasksTimeout = setTimeout(() => {
                // this.forceSelect(true);
                if (this.folded) {
                    this.unfold(true);
                } else {
                    this.fold(true);
                }
            }, LONG_PRESS_DURATION_MS)
        }

        const cancelLongPress2 = (e) => {
            if (this.subTasksTimeout){
                clearTimeout(this.subTasksTimeout);
                this.subTasksTimeout = null;
            }
        }
        subTasksCounterLabel.ontouchend = cancelLongPress2;
        subTasksCounterLabel.ontouchmove = cancelLongPress2;

        subTasksCounterLabel.onselectstart = (e) => {
            e.preventDefault();
            e.stopPropagation();
            return false;
        }
        subTasksCounterLabel.oncontextmenu = (e) => {
            e.preventDefault();
            e.stopPropagation();
            return false;
        }

        this.subTasksCounterLabel = subTasksCounterLabel;
        this.updateSubTaskCounterLabel();

        // // Initial creation of subtasks
        for (let subtask of this.data['entries']) {
            let subtaskKey = subtask.id;
            this.addSubTask(subtaskKey);
        }

        /*
        this.unfold();
        /*/
        if (DEBUG) {
            this.unfold();
        } else {
            if (startFolded) {
                this.fold();
            } else {
                this.unfold();
            }
        } // */

        this.actionBar = document.createElement('div');
        this.actionBar.setAttribute('class', 'actionBar');

        const deleteButton = document.createElement('div');
        deleteButton.innerHTML = "Delete";
        // deleteButton.setAttribute('class', 'actionButton');
        deleteButton.onclick = () => this.delete();

        const enterButton = document.createElement('div');
        enterButton.innerHTML = "Enter";
        // enterButton.setAttribute('class', 'actionButton');
        enterButton.onclick = () => this.enter();

        const copyButton = document.createElement('div');
        copyButton.innerHTML = "Copy";
        // copyButton.setAttribute('class', 'actionButton');
        copyButton.onclick = () => this.copy();

        const pasteButton = document.createElement('div');
        pasteButton.innerHTML = "Paste";
        // pasteButton.setAttribute('class', 'actionButton');
        pasteButton.onclick = () => this.paste();

        const moveUpButton = document.createElement('div');
        moveUpButton.innerHTML = "Up";
        moveUpButton.onclick = () => this.moveEntry(-1);

        const moveDownButton = document.createElement('div');
        moveDownButton.innerHTML = "Down";
        moveDownButton.onclick = () => this.moveEntry(1);

        // Button order
        this.actionBar.appendChild(deleteButton);
        this.actionBar.appendChild(moveUpButton);
        this.actionBar.appendChild(moveDownButton);
        this.actionBar.appendChild(copyButton);
        this.actionBar.appendChild(pasteButton);
        this.actionBar.appendChild(enterButton);

        element.appendChild(this.actionBar);

        if (!subtasksContainer)
            element.appendChild(this.subTasksElement);

        if (parentContainer)
            parentContainer.appendChild(element);

        return element;
    }

    addSubTask = (subtaskKey) => {
        const subTaskData = getDataByID(subtaskKey);
        let subTaskElement = new Entry(
            subTaskData, // this.data
            this.subTasksElement, // parentContainer =
        );
        this.subTasks.push(subTaskElement);
        this.updateSubTaskCounterLabel();
    }

    updateSubTaskCounterLabel = () => {
        // Count subtasks
        let subTasksCounter = 0;
        function countSubTasks(subData) { // Function for calling recursivly
            for (let entry of subData['entries']) {
                subTasksCounter += 1;
                countSubTasks(entry);
            }
        }
        countSubTasks(this.data);

        this.subTasksCounterLabel.innerText = subTasksCounter;

        if (subTasksCounter > 0) {
            this.subTasksCounterLabel.style.display = "flex";
        } else {
            this.subTasksCounterLabel.style.display = "none";
        }

        if (this.doneSettingUp){
            if (this.parentID) {
                const parentElement = getElementByID(this.parentID);
                if (parentElement)
                    parentElement.updateSubTaskCounterLabel();
            }
        }

        this.selectedIndex = clamp(-1, this.subTasks.length - 1, this.selectedIndex)
    }

    removeSubTask = (subtaskID) => {
        // if (this.subTasks.length == 0)
            // return;

        let index = 0;

        for (let subtaskelement of this.subTasks){
            if (subtaskelement.entry_id == subtaskID) {
                break;
            }
            index += 1;
        }
        this.subTasksElement.removeChild(this.subTasks[index].element); // Remove DOM tree node
        this.subTasks.splice(index, 1); // Remove subtask data

        const deleteEntryData = getDataByID(subtaskID);
        const deleteIndex = this.data['entries'].indexOf(deleteEntryData);
        this.data['entries'].splice(deleteIndex, 1); // Remove task from entries-member

        this.updateSubTaskCounterLabel();
    }

    makeEditable = () => {
        this.label.setAttribute('contenteditable', true);
        this.label.focus();
        this.label.onblur = () => {
            this.updateTextOnServer();
        }
    }
    removeEditable = () => {
        this.label.onblur = () => {};
        this.label.blur();
        this.label.setAttribute('contenteditable', false);
    }
    resetTextChanges = () => {
        this.label.innerText = this.name;
        this.removeEditable();
    }

    updateTextOnServer = () => {
        sendRename(this.entry_id, this.label.innerText);
        this.removeEditable();
    }

    markCut = () => {
        this.element.classList.add('cut');
    }

    unmarkCut = () => {
        this.element.classList.remove('cut');
    }
}
