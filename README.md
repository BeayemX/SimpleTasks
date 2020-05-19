# Simple Tasks
## Goals
+ List tasks
  + Each entry is just a piece of text
+ Each task can have subtasks
  + Each subtask has the same functionality as a top-level task
  + Each action can be executed on top-level tasks as well as on sub-level tasks
+ No limits regarding subtasks or nesting levels
+ Make it possible to scoping to a nested level
+ Light weight
  + Only use standard HTML/CSS/JavaScript
  + No convoluted third-party libraries

## Functionality and features
+ Desktop client
  + Easy keyboard navigation
+ Mobile client
+ Clients via Progressive Web App
+ Each task can be folded/unfolded to show/hide subtasks
+ Nested text entries  
+ Fast keyboard navigation
  + inspired by code editors
+ Usable on desktop and mobile via a web-interface
+ SQLite as data storage
+ Main audience
  + Single person task list
  + struture your tasks in as many chunks as you want
  + mostly for personal usage, 
    + Large teams should probably chose another software
+ (Basic) Theming support

## Potential features
+ Multiuser support
  + Shared task list via the same login
  + Receive realtime updates to task changes
+ Labels / Tags
  + Filter by label
  + Color coded entries
+ Hyperlink support
  + To be able to detect and highlight hyperlinks and make it possible to click them

## Non-goals
This app is not designed to replace a full-fledged project management tool
+ No time tracking
+ No user management
+ No task assignments
+ No text formatting
+ No additional information per entry (like due-date, milestone, ...)
+ No image or other file attachments
+ No notifications
+ No reminders
+ No calendar integration
