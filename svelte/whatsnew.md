## 2.7.3

### Fixes

-   Grid and chart rows get out of sync after indent / outdent operations

## 2.7.2

### Fixes

-   Setting link lag breaks task dates
-   Editor allows negative values for split tasks segments
-   Undoing "delete-task" action does not restore assignments for this task
-   The "copy-task" action does not copy task assignments
-   The `readonly` settings does not block grid inline editors
-   Initial auto scheduling pass is added to history and can be undone
-   Clipboard keeps ids of deleted tasks
-   Tasks after undo/redo with enabled autoscheduling don't snap to dates correctly
-   History is not reset when links, resources or assignments are replaced
-   History handlers are active after disabling undo/redo at run time
-   Undo/redo replay triggers auto scheduling
-   Context menu references the previous task
-   Copy and paste of parent branches duplicates child tasks
-   Grid cell padding are misaligned
-   Fonts cannot be fully switched off from theme settings

## 2.7.1

### Fixes

-   Better performance with links rendering
-   Zoom cannot start from Resource load view
-   Auto scheduling and summary `autoProgress` trigger infinite loop
-   Focus on Grid header and body cells is lost / unstable
-   Undo of the "move-task" action doesn't work after task was moved to a different branch
-   Cell width gets a fractional value when scale start/end are set
-   Newly added task is not rendered correctly after update
-   `highlightTime` can be used only with day / hour minimal scale unit
-   Incorrect marker position when zooming out to year scale

## 2.7.0

### New features

-   Resource management | PRO feature
    -   Visualizing and assigning resources | PRO feature
    -   Resource load chart | PRO feature
    -   Resource assignment handling in the Go backend | PRO feature
    -   Grouping tasks by resources | PRO feature
    -   Individual calendars for resources | PRO feature
-   Individual calendars for tasks | PRO feature
-   Grouping tasks by any field | PRO feature
-   WBS codes | PRO feature
-   Enhanced Editor UI with tabs for details
-   Tooltips for links

### Updates

-   Calendar JSON definition for serialization | PRO feature
-   Dynamic rendering of the timescale
-   Enhanced Tooltip with detailed settings
-   Sticky text in scale cells to ensure that it is always visible
-   Improved auto scheduling with summary tasks | PRO feature

### Fixes

-   Export of tasks with calendar shows incorrect dates
-   Zooming and scrolling in long scales is too slow and crashes
-   Tree markers are lost after clearing filters
-   Excessive `render-data` calls on horizontal scrolling
-   Hover area for links is too small

### Breaking changes

-   Calendar is defined not via explicit instance creation, but by plain config
-   Tooltip content receives `{ api, data }` instead of `{ task, segmentIndex }`

## 2.6.1

### Fixes

-   Gantt fails to initialize in SvelteKit with server-side rendering
-   Incorrect handling of rollups in Datastore
-   Incorrect height of sidebar Editor

## 2.6.0

### New features

-   Ability to filter data by API calls
-   Ability to filter data via header filters
-   Integration with SVAR Filter
-   Calculating and visualizing slack | PRO feature
-   Rollups | PRO feature

### Updates

-   Ability to scroll to a specific date with the "scroll-chart" action
-   "resize-chart" action is added to monitor widget dimensions

### Fixes

-   Export to PNG/PDF: incorrect link positions
-   The "scroll-chart" action does not scroll to provided coordinates
-   Chart and grid are sometimes misaligned when vertical scroll appears
-   Incorrect visible date during zooming
-   Gantt fails to initialize in SvelteKit with server-side rendering

### Breaking changes

-   "expand-scale" action is removed

## 2.5.2

### Fixes

-   Incorrect grid width after expanding and collapsing it with all column fixed
-   Narrow scale does not expand when grid is collapsed by clicking
-   Tooltips are not shown for segments
-   Zoom speed is too high with laptop trackpad
-   Task reordering, opening and closing fails in case of integer string id

## 2.5.1

### Fixes

-   Exported `version` is undefined
-   Task duration and start date and incorrect during drag-n-drop on some scales

## 2.5.0

### New features

-   Server-side export to PNG, PDF, XLSX, MS Project | PRO feature
-   Client-side export and import from MS Project | PRO feature
-   Auto calculation of progress for summary tasks | PRO feature
-   Auto conversion of parent tasks to summary tasks | PRO feature

### Fixes

-   Scale is expanded left with a small dataset during screen resizing
-   Markers ignore scale boundaries
-   Delete link placeholder is misplaced sometimes
-   Task bars cannot be resized with "minute" lengthUnit
-   Dimensions of summary tasks with subtasks are not correctly calculated during drag-n-drop

## 2.4.4

### Fixes

-   Splitting a task is limited to last segment

## 2.4.3

Community license changed from GPL to MIT

### Fixes

-   Incorrect initial values for calendar and markers
-   PRO types are excluded from MIT version

## 2.4.2

### Fixes

-   Incorrect types

## 2.4.0

### New features

-   Basic auto scheduling | PRO feature
-   Handling of invalid links | PRO feature
-   Critical path calculation | PRO feature
-   Global calendar to define working schedule | PRO feature
-   Unscheduled tasks | PRO feature
-   Vertical markers on timeline | PRO feature
-   Baselines | PRO feature
-   Split tasks | PRO feature
-   Undo/redo | PRO feature
-   Ability to remove links from Chart UI
-   Locale-based scale formatting

### Updates

-   Resizer line can be dragged to expand current display mode

### Fixes

-   Summary task size is sometimes incorrect while dragging
-   Excess reactivity triggers during zooming
-   ContextMenu css cannot be set
-   Editing tasks breakes dynamic width of narrow scales cells

### Breaking changes

-   Scales format string is changed from date-fns to SVAR locale
-   Fullscreen helper is moved to SVAR Svelte Core

## 2.3.0

### New features

-   TypeScript definitions

### Fixes

-   Chart renders bars inaccurately on quarter scale
-   Impossible to provide custom markup for "text" and "action" columns

## 2.2.1

### Fixes

-   Correct dependencies

## 2.2.0

### New features

-   Ability to define "hour" duration unit
-   Ability to define "minute" length unit
-   Ability to create custom scale units
-   `autoScale` property to configure `start`/`end` scale behaviour
-   Standalone sidebar and modal Editor
-   Ability to validate fields in the Editor
-   Hotkeys for common actions and navigation
-   Multi-sorting for table columns
-   Headermenu to hide table columns
-   Inline editors for table cells
-   Ability to expand/collapse table and chart via buttons

### Updates

-   Chart grid expands to widget height

### Fixes

-   Summary is not always adjusted to kids when task type changes
-   Unnecessary focus over chart area
-   Task position is not sent to backend on adding
-   Reordered task appears after deleting
-   Node painting logic enhanced

### Breaking changes

-   Default sidebar editor and `editorShape` property is removed, use standalone Editor instead
-   Table action column id is changed from "action" to "add-task"

## 2.1.1

### Fixes

-   Regression with table and chart alignment
-   Regression with fullscreen functionality
-   Right and center alignment does not apply to header cells

## 2.1.0

### Updates

-   Ability to use custom HTML in column cells
-   Optimizing inner zoom and scale logic

### Fixes

-   Impossible to use numeric id for Toolbar and Menu options

## 2.0.1

### New features

-   Svelte 5 support

## 1.2.0

-   Released under GPLv3

## 1.1.0

### New features

-   Summary tasks
-   Sorting Grid columns
-   Batch mode for DataProvider to handle mass operations
-   `sort-tasks` action is added
-   POST /{batchURL} route is added
-   `columns` property is extended with the `sort` parameter
-   `minCellWidth` and `maxCellWidth` settings are added to the `zoom` property
-   `update-task` and `copy-task` actions are extended with the `eventSource` parameter
-   `source` parameter is added to the "move-task" and "delete-task" actions
-   RestDataProvider config has the `batchUrl` property
-   New parameters (`source` and `lazy`) added to the "copy-task" action

### Updates

-   Common minCellwidth and maxCellWidth for zoom levels
-   Skipping meaningless actions in Context Menu and Toolbar

### Fixes

-   Scroll in Grid is not smooth
-   Impossible to resize chart bars on the left more than for one cell
-   When a branch is removed, only links of the parent task are removed
-   Unstable move down behaviour: tasks are inserted in wrong positions
-   Resizing columns: horizontal scrollbar does not appear
-   Text of tasks is higher than a dragged bar during reordering
-   Last task is misplaced after reordering when there are few tasks
-   Reordering of tasks with child tasks is broken
-   Impossible to define cellWidth if default zoom is enabled
-   Data is removed from task object after the "update-task" operation
-   Outdenting does not work for 3rd-level tasks
-   Auto scale is calculated incorrectly if the last task is a milestone
-   Parent task is not always opened after adding a new task
-   Task start date is not set according to the top-level target task
-   Zooming in and out between levels does not work correctly

## 1.1

### New features

-   Summary tasks
-   Sorting Grid columns
-   Batch mode for DataProvider to handle mass operations
-   New "sort-tasks" action is added
-   New POST /{batchURL} route is added
-   The `columns` property is extended with the `sort` parameter
-   The `minCellWidth` and `maxCellWidth` settings are added to the `zoom` property
-   The "update-task" and "copy-task" actions are extended with the `eventSource` parameter
-   The `source` parameter is added to the "move-task" and "delete-task" actions
-   RestDataProvider config has the `batchUrl` property
-   New parameters (`source` and `lazy`) added to the "copy-task" action

### Updates

-   Common minCellwidth and maxCellWidth for zoom levels
-   Skipping meaningless actions in Context Menu and Toolbar

### Fixes

-   Scroll in Grid is not smooth
-   Impossible to resize chart bars on the left more than for one cell
-   When a branch is removed, only links of the parent task are removed
-   Unstable move down behaviour: tasks are inserted in wrong positions
-   Resizing columns: horizontal scrollbar does not appear
-   Text of tasks is higher than a dragged bar during reordering
-   Last task is misplaced after reordering when there are few tasks
-   Reordering of tasks with child tasks is broken
-   Impossible to define cellWidth if default zoom is enabled
-   Data is removed from task object after the "update-task" operation
-   Outdenting does not work for 3rd-level tasks
-   Auto scale is calculated incorrectly if the last task is a milestone
-   Parent task is not always opened after adding a new task
-   Task start date is not set according to the top-level target task
-   Zooming in and out between levels does not work correctly

## 1.0

### Initial features

-   Fast behavior and clear API
-   Configurable Grid columns
-   Configurable Chart scales and cell sizes
-   Task types:"project", "task", "milestone" and custom
-   Baselines
-   Holiday and custom markers in Chart area
-   Configurable Editor panel
-   Configurable Context Menu and Toolbar
-   Tooltips for tasks in Chart area
-   Readonly mode
-   Fullscreen mode
-   Wouse-wheel zooming in Chart area
-   Responsive behaviour of Grid area
-   Localization of labels and dates
-   Ready-made DataProvider to intergate with server
