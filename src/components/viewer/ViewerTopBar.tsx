import { Link } from "react-router-dom";
import logoUrl from "../../assets/icons/logo.png";
import { FolderOpen } from "lucide-react";
interface ViewerTopBarProps {
  onImportJson?: () => void; // ← новое
}

export const ViewerTopBar = ({ onImportJson }: ViewerTopBarProps)  => (
  <div className="h-[60px] bg-white border-b border-[#e5e5e5] flex items-center justify-between px-6 py-3 shadow-sm flex-shrink-0">
    <div className="flex items-center gap-4">
      <Link to="/" className="flex items-center gap-2">
        {/* логотип */}
        <img src={logoUrl} alt="YouTicket" className="h-6 w-auto" draggable={false} />
      </Link>
      <span className="text-sm bg-gray-100 text-gray-600 font-medium px-3 py-1 rounded-lg">
        Viewer Mode
      </span>
      
    </div>

      {/* right */}
      <div className="flex items-center gap-2">
        <button
          onClick={onImportJson}
          title="Import from JSON file"
          className="inline-flex items-center gap-2 h-9 px-3 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition"
          aria-label="Import JSON"
        >
          <FolderOpen size={16} className="shrink-0" />
          <span className="hidden sm:inline">Import JSON</span>
        </button>
        <Link
      to="/editor"
      className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-[8px] hover:bg-blue-700 transition-colors"
    >
      Back to Editor
    </Link>
      </div>
    
    
  </div>
);
