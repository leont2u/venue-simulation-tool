import {
  Plus,
  Move,
  RotateCw,
  Maximize2,
  Trash2,
  Save,
  Upload,
} from "lucide-react";
import type { ObjectType } from "../types/project.types";

interface ControlPanelProps {
  onAddObject: (type: ObjectType) => void;
  onSetMode: (mode: "select" | "move" | "rotate" | "scale") => void;
  onDelete: () => void;
  onSave: () => void;
  onLoad: () => void;
  onDownload: () => void;
  selectedObjectId: string | null;
  currentMode: "select" | "move" | "rotate" | "scale";
}

export default function ControlPanel({
  onAddObject,
  onSetMode,
  onDelete,
  onSave,
  onLoad,
  onDownload,
  selectedObjectId,
  currentMode,
}: ControlPanelProps) {
  return (
    <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-4 max-w-sm z-10">
      <h2 className="text-xl font-bold mb-4 text-gray-800">Venue Editor</h2>

      <div className="mb-6">
        <h3 className="text-sm font-semibold text-gray-600 mb-2">
          Add Objects
        </h3>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => onAddObject("chair")}
            className="flex items-center gap-2 px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors text-sm"
          >
            <Plus size={16} />
            Chair
          </button>
          <button
            onClick={() => onAddObject("table")}
            className="flex items-center gap-2 px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors text-sm"
          >
            <Plus size={16} />
            Table
          </button>
          <button
            onClick={() => onAddObject("stage")}
            className="flex items-center gap-2 px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors text-sm"
          >
            <Plus size={16} />
            Stage
          </button>
        </div>
      </div>

      <div className="mb-6">
        <h3 className="text-sm font-semibold text-gray-600 mb-2">
          Edit Tools{" "}
          {selectedObjectId && (
            <span className="text-green-600">(Object Selected)</span>
          )}
        </h3>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => onSetMode("move")}
            className={`flex items-center gap-2 px-3 py-2 rounded transition-colors text-sm ${
              currentMode === "move"
                ? "bg-green-500 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            <Move size={16} />
            Move
          </button>
          <button
            onClick={() => onSetMode("rotate")}
            className={`flex items-center gap-2 px-3 py-2 rounded transition-colors text-sm ${
              currentMode === "rotate"
                ? "bg-green-500 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            <RotateCw size={16} />
            Rotate
          </button>
          <button
            onClick={() => onSetMode("scale")}
            className={`flex items-center gap-2 px-3 py-2 rounded transition-colors text-sm ${
              currentMode === "scale"
                ? "bg-green-500 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            <Maximize2 size={16} />
            Scale
          </button>
          <button
            onClick={onDelete}
            disabled={!selectedObjectId}
            className="flex items-center gap-2 px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors text-sm disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            <Trash2 size={16} />
            Delete
          </button>
        </div>
      </div>

      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-600 mb-2">
          Scene Management
        </h3>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={onSave}
            className="flex items-center gap-2 px-3 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors text-sm"
          >
            <Save size={16} />
            Save
          </button>
          <button
            onClick={onLoad}
            className="flex items-center gap-2 px-3 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors text-sm"
          >
            <Upload size={16} />
            Load
          </button>
          <button
            onClick={onDownload}
            className="flex items-center gap-2 px-3 py-2 bg-teal-500 text-white rounded hover:bg-teal-600 transition-colors text-sm"
          >
            <Upload size={16} />
            Export
          </button>
        </div>
      </div>

      <div className="text-xs text-gray-500 pt-4 border-t border-gray-200">
        <p className="mb-1">Controls:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Left click: Select object</li>
          <li>Right click + drag: Rotate view</li>
          <li>Mouse wheel: Zoom</li>
          <li>Middle click + drag: Pan</li>
        </ul>
      </div>
    </div>
  );
}
