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
