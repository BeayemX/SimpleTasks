# Simple Tasks
## Goals
+ List tasks
  + Each entry is just a piece of text
  + Priority is assigned via sorting
+ Each task can have subtasks
  + Each subtask has the same functionality as a top-level task
  + Each action can be executed on top-level tasks as well as on sub-level tasks
+ No limits regarding subtasks or nesting levels
+ Make it possible to scoping to a nested level
+ Light weight
  + Only use standard HTML/CSS/JavaScript
  + No convoluted third-party libraries
+ Desktop and mobile client

## Functionality and features
+ Usecase
  + Structure your tasks in as many nested subtasks as you want
    + Each task can be folded/unfolded to show/hide subtasks
  + Basically a mind-map in a list format
+ Main audience
  + Single person task list
+ Clients via web interface (also as Progressive Web App)
  + Desktop client
    + Fast keyboard navigation
      + Inspired by code editors
  + Mobile client
+ SQLite as data storage
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
