const DEBUG = false;
const FOLD_WHEN_STEPPING = false;
const maxLength = 256; // Not used

class Entry {
    constructor(entryName, entryData, parent, parentContainer, parentPath, subtasksContainer = null) {
        // console.log(entryName, parent, parentContainer, parentPath, subtasksContainer)
        this.name = entryName;
        this.data = entryData;
        this.parent = parent; // not html element. is EntryClass
        this.parentContainer = parentContainer;
        this.parentPath = parentPath;

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
    }

    getParentPath = () => {
        return copyPath(this.parentPath);
    }

    getElementPath = () => {
        const path = this.getParentPath();
        path.push(this.name);
        return path;
    }

    select = () => {
        if (currentlySelectedElement == this) {
            this.deselect();
            return;
        }

        if (currentlySelectedElement)
            currentlySelectedElement.deselect();

        currentlySelectedElement = this;
        this.element.classList.add('focused');
        this.showActionBarButton.style.display = 'block';

        this.parent.setSelected(this);
        // this.scrollIntoView(true);
    };

    setSelected = (subtask) => {
        this.selectedIndex = this.subTasks.indexOf(subtask);
    }

    deselect = () => {
        this.element.classList.remove('focused');
        this.showActionBarButton.style.display = 'none';
        this.hideActionBar();

        if (currentlySelectedElement === this)
            currentlySelectedElement = null;
    };

    showActionBar = () => {
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
            const tmpParentPath = this.getParentPath();

            tmpParentPath.push(this.name);
            setPath(tmpParentPath);

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
            const deletePath = this.getElementPath();
            sendDelete(deletePath, askConfirmation);
        } else {
            this.subTasks[this.selectedIndex].delete(askForConfirmationForSubtasks);
        }
     }


     unfold = () => {
        if (this.selectedIndex == -1) {

            if (this.folded === false) { // Already unfolded
                /*
                if (this.subTasks.length > 0)
                    selectEntry(1);
                    //*/
                return;
            }

            this.folded = false;

            const targetPath = getCurrentPath();
            targetPath.push(this.name);

            /* TODO only if alt is pressed
            for (let subTaskElement of this.subTasks) {
                subTaskElement.unfold();
            } //*/
            //reassignIndices();
            this.subTasksElement.style.display = "flex";
        } else {
            this.subTasks[this.selectedIndex].unfold();
        }
    }

    fold = () => {
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
            this.subTasksElement.style.display = "none";
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
                if (this.parent.parent) {
                    this.deselect();

                    this.parent.selectedIndex = -1;
                    this.parent.select();
                } else {
                    this.fold();
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

    /*
    stepOver = () => {
        if (this.parent) {
            this.parent.selectEntry(1);
        }
    }*/

    deselectEntries = () => {
        if (this.selectedIndex == -1) {
            for (let element of this.subTasks)
                element.deselect();

            previousSelectedEntryIndex = this.selectedIndex;
        } else {
            this.subTasks[this.selectedIndex].deselect()
        }
    }

    selectEntry = (delta, execute=false) => {
        let forwardToSubtasks = this.subTasks.length > 0 && !this.folded;
        if (!execute && forwardToSubtasks) {
            console.log("Forwarding to children")
            //this.subTasks[this.selectedIndex].selectEntry(delta, true);
            if (delta > 0)
                this.stepInto();
            else
                this.stepOut();
        } else {
            if (execute)
            {
                let newIndex = this.selectedIndex;
                newIndex += delta;

                if (newIndex == -1 || newIndex == this.subTasks.length) { // if out of bounds -> forward to parent
                    console.log("Out of bounds")
                    this.parent.selectEntry(delta, execute);
                } else {
                    newIndex = clamp(0, this.subTasks.length - 1, newIndex);
                    this.deselectEntries();
                    this.selectEntryWithIndex(newIndex);
                }
            } else {
                this.parent.selectEntry(delta, true);
            }
        }
    }

    selectEntryWithIndex = (newIndex) => {
        //if (this.selectedIndex == -1) {
            if (newIndex >= 0)
                this.deselectEntries();

            // TODO shouldn't this be done in setFocus()?
            input.blur();
            titleObject.blur();

            this.selectedIndex = newIndex;
            this.subTasks[this.selectedIndex].select();
            setFocus(FOCUS_CONTENT);
        //} else {
            //this.selectEntryWithIndex[this.selectedIndex].selectEntry(delta)
        //}
    }

    moveEntry = (delta) => {
        if (this.selectedIndex == -1) {
            let theIndex = this.parent.subTasks.indexOf(this);
            let newPosition = theIndex + delta;

            const subLength = this.parent.subTasks.length;
            newPosition = clamp(0, subLength - 1, newPosition);

            if (newPosition != theIndex) {
                send({
                    "action": 'move_entry',
                    "path": this.getParentPath(),
                    "currentIndex": theIndex,
                    "newIndex": newPosition
                })
            }
            selectedIndexAfterUpdate = newPosition; // FIXME this does not work with the new system, maybe selection-highlight does work, but things are folded...
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

        // Add sub-tasks functionality

        // // Initial creation of subtasks

        for (let subtaskKey in this.data) {
            const subTaskParentPath = copyPath(this.getParentPath());
            subTaskParentPath.push(this.name);

            let subTaskElement = new Entry(
                subtaskKey, // this.name
                this.data[subtaskKey], // this.data
                this, // parent =
                this.subTasksElement, // parentContainer =
                subTaskParentPath, // subTaskParentPath // parentPath
            );
            this.subTasks.push(subTaskElement);
        }


        // Add main part to show text and enter sub-level
        const label = document.createElement('div');
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
            e.stopPropagation();
            return false;
        }

        label.onclick = (e) => {
            this.select();
            e.stopPropagation();
            return false;
        };

        // Button for showing ActionBar
        const showActionBarButton = document.createElement('div');
        showActionBarButton.setAttribute('class', 'icon subcounter');
        showActionBarButton.innerHTML = "&nbsp;*&nbsp;";
        showActionBarButton.style.display = 'none';
        actualTask.appendChild(showActionBarButton);

        showActionBarButton.onclick = (e) => {
            this.toggleActionBar();
            e.stopPropagation();
            return false;
        }
        this.showActionBarButton = showActionBarButton;

        // Count subtasks
        let subTasksCounter = 0;
        function countSubTasks(subData) { // Function for calling recursivly
            for (let key of Object.keys(subData)) {
                subTasksCounter += 1;
                countSubTasks(subData[key]);
            }
        }
        countSubTasks(this.data);

        // Add sub tasks counter label
        if (subTasksCounter > 0) {
            const subTasksCounterLabel = document.createElement('div');
            subTasksCounterLabel.setAttribute('class', 'icon subcounter');
            subTasksCounterLabel.innerText = subTasksCounter;
            actualTask.appendChild(subTasksCounterLabel);

            subTasksCounterLabel.onclick = (e) => {
                this.toggleFold();
                e.stopPropagation();
                return false;
            }
        }



        if (DEBUG) {
            this.unfold();
        } else {
            if (startFolded) {
                this.fold();
            } else {
                this.unfold();
            }
        }

        this.actionBar = document.createElement('div');
        this.actionBar.setAttribute('class', 'actionBar');

        const spacer = document.createElement('div');
        spacer.setAttribute('class', 'spacer');

        const deleteButton = document.createElement('div');
        deleteButton.innerHTML = "Delete";
        deleteButton.setAttribute('class', 'actionButton');
        deleteButton.onclick = () => this.delete();

        const enterButton = document.createElement('div');
        enterButton.innerHTML = "Enter";
        enterButton.setAttribute('class', 'actionButton');
        enterButton.onclick = () => this.enter();

        const copyButton = document.createElement('div');
        copyButton.innerHTML = "Copy";
        copyButton.setAttribute('class', 'actionButton');
        copyButton.onclick = () => this.copy();

        const pasteButton = document.createElement('div');
        pasteButton.innerHTML = "Paste";
        pasteButton.setAttribute('class', 'actionButton');
        pasteButton.onclick = () => this.paste();

        const moveUpButton = document.createElement('div');
        moveUpButton.innerHTML = "Up";
        moveUpButton.setAttribute('class', 'actionButton');
        moveUpButton.onclick = () => this.moveEntry(-1);

        const moveDownButton = document.createElement('div');
        moveDownButton.innerHTML = "Down";
        moveDownButton.setAttribute('class', 'actionButton');
        moveDownButton.onclick = () => this.moveEntry(1);

        // Button order
        this.actionBar.appendChild(deleteButton);
        this.actionBar.appendChild(spacer);
        this.actionBar.appendChild(moveUpButton);
        this.actionBar.appendChild(moveDownButton);
        this.actionBar.appendChild(copyButton);
        this.actionBar.appendChild(pasteButton);
        this.actionBar.appendChild(enterButton);

        if (!subtasksContainer)
            element.appendChild(this.subTasksElement);

        if (parentContainer)
            parentContainer.appendChild(element);

        element.appendChild(this.actionBar);

        return element;
    }
}
