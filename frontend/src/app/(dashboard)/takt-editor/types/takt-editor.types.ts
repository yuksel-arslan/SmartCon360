// Takt Editor Component Types

// Represents the available modes for the Takt Editor
export type TaktEditorMode = 'create' | 'edit' | 'view';

// Represents a task in the Takt Editor
export interface Task {
    id: string; // Unique identifier for the task
    title: string; // Title of the task
    description?: string; // Optional description of the task
    dueDate?: string; // Optional due date in ISO format
    completed: boolean; // Indicates if the task is completed
}

// Represents the Takt Editor state
export interface TaktEditorState {
    mode: TaktEditorMode; // Current mode of the Takt Editor
    tasks: Task[]; // Array of tasks in the Takt Editor
    currentTaskId?: string; // ID of the task currently being edited
}

// Represents props for the Takt Editor component
export interface TaktEditorProps {
    initialTasks: Task[]; // Initial list of tasks to display
    onSave: (tasks: Task[]) => void; // Callback function to save tasks
    onCancel: () => void; // Callback function to cancel editing
}