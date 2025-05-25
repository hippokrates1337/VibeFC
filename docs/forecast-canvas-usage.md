# Forecast Canvas Usage Guide

The Forecast Canvas is an interactive graph-based interface for building and editing financial forecast models. It uses React Flow to provide a visual node-and-edge system for creating complex forecast calculations.

## Overview

The canvas allows you to:
- Create and connect different types of forecast nodes
- Visually design calculation flows
- Configure node properties and relationships
- Delete unwanted nodes and connections

## Node Types

The forecast canvas supports several types of nodes:

- **DATA**: Represents input data variables
- **CONSTANT**: Fixed values used in calculations
- **OPERATOR**: Mathematical operations (add, subtract, multiply, divide)
- **METRIC**: Output metrics and KPIs
- **SEED**: Initial values for iterative calculations

## Keyboard Controls

### Delete Functionality
- **Delete Key** or **Backspace Key**: Delete selected nodes and/or edges
  - Select one or more nodes by clicking on them (hold Ctrl/Cmd for multi-select)
  - Select edges by clicking on them
  - Press Delete or Backspace to remove selected elements
  - **Note**: Deleting a node will automatically delete all connected edges

### Other Controls
- **Double-click on node**: Open the node configuration panel
- **Drag nodes**: Move nodes around the canvas
- **Drag from handle to handle**: Create connections between nodes
- **Mouse wheel**: Zoom in/out
- **Click and drag on empty space**: Pan the canvas
- **Shift + Click and drag**: Create selection box for multi-select

## Mouse Interactions

### Node Operations
- **Single click**: Select a node
- **Double click**: Open node configuration panel
- **Drag**: Move node to new position
- **Ctrl/Cmd + Click**: Add node to selection (multi-select)

### Edge Operations
- **Click on edge**: Select the edge
- **Drag from node handle**: Start creating a new connection
- **Drop on target handle**: Complete the connection

### Canvas Operations
- **Click on empty space**: Deselect all elements
- **Drag on empty space**: Pan the viewport
- **Mouse wheel**: Zoom in/out
- **Shift + Drag**: Create selection rectangle

## Node Configuration

Double-clicking on a node opens the configuration panel where you can:
- Edit node properties
- Set calculation parameters
- Configure data sources
- Delete the node (with confirmation)

## Best Practices

1. **Organization**: Keep related nodes grouped together for better readability
2. **Naming**: Use descriptive names for nodes to make the flow easier to understand
3. **Connections**: Ensure all necessary connections are made for proper calculation flow
4. **Testing**: Regularly test your forecast model to ensure calculations are correct

## Troubleshooting

### Delete Key Not Working
If the delete key isn't working:
1. Make sure you have selected the nodes/edges you want to delete (they should be highlighted)
2. Ensure the canvas has focus (click on it first)
3. Try using Backspace instead of Delete
4. Check that you're not in a text input field

### Selection Issues
If you can't select nodes or edges:
1. Click directly on the node/edge (not on empty space)
2. For multi-select, hold Ctrl (Windows/Linux) or Cmd (Mac) while clicking
3. Use Shift + drag to create a selection rectangle around multiple elements

### Connection Problems
If you can't create connections:
1. Make sure you're dragging from a source handle to a target handle
2. Check that the connection is valid (some node types may have restrictions)
3. Ensure both nodes are compatible for the type of connection you're trying to make

### Unsaved Changes Preservation
The application automatically preserves your unsaved changes when:
- Minimizing and restoring the browser window
- Switching between browser tabs
- Temporary network disconnections
- Page refreshes (in most cases)
- Authentication token refreshes

**How it works:**
- The system checks for unsaved changes before clearing data
- AuthProvider avoids unnecessary data fetching when you already have data loaded
- Page components preserve local changes when the same forecast is being accessed
- Only explicit actions (sign out, switching organizations) clear unsaved data
- **Fixed**: Removed automatic store reset on component unmount to prevent clearing unsaved changes

**Important Notes:**
- Changes are only preserved if you have made modifications (isDirty = true)
- If you want to discard changes and reload fresh data, use the "Reload" button in the toolbar
- Always save your work regularly to prevent data loss
- The system will warn you before discarding unsaved changes
- Switching to a different organization will clear unsaved changes (with warning)

### Manual Reload
If you want to discard your current changes and reload fresh data from the server:
1. Click the "Reload" button in the Actions section of the toolbar
2. If you have unsaved changes, you'll be prompted to save or discard them
3. Choose "Discard Changes" to reload fresh data from the server

## Technical Implementation

The keyboard deletion functionality is implemented using:
- React Flow's `useKeyPress` hook for detecting Delete/Backspace keys
- `onSelectionChange` callback to track selected elements using refs (not state to avoid re-render loops)
- Custom deletion logic that calls the Zustand store's `deleteNode` and `deleteEdge` actions
- Disabled built-in React Flow deletion (`deleteKeyCode={[]}`) for custom control

### Performance Optimization

The implementation uses `useRef` instead of `useState` to track selected elements, which prevents infinite re-render loops that could occur when:
1. Selection changes trigger state updates
2. State updates trigger useEffect
3. useEffect clears selection, triggering more state updates

This ensures that deletions are properly synchronized with the application's state management system and any connected backend services without performance issues. 