
interface ToolBarProps{
  currentTool:string;
  setCurrentTool: (tool: "select" | "add-seat" | "add-row" | "add-zone") => void;
}



function Toolbar({currentTool,setCurrentTool}:ToolBarProps) {
  return (
    <div className="w-[80px] bg-white border-r border-[#E5E5E5]  flex flex-col items-center py-4 px-4 gap-4 shadow-sm">
      <div className="flex flex-col gap-4 items-center ">
        <div className="flex flex-col items-center  gap-1">
          <button className={`w-12 h-12 rounded-[12px] ${currentTool === "add-row" ? "bg-blue-400" : "bg-[#e7e7eb]"} hover:bg-blue-400 cursor-pointer`}
            onClick={() => setCurrentTool("add-row")}>
              <div className='flex items-center justify-center '>
            <svg className='w-3 h-4'>
                <use xlinkHref="#icon-row" />
            </svg>
            </div>

          </button>
          <span className="text-black ">
            Add <br /> Row
          </span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <button className={`w-12 h-12 ${currentTool==='add-seat'?'bg-blue-400':'bg-[#e7e7eb]'}  rounded-[12px] hover:bg-blue-400 cursor-pointer`} onClick={() => setCurrentTool("add-seat")}>
            <div className='flex items-center justify-center '>
            <svg className='w-3 h-4'>
                <use xlinkHref="#icon-seats" />
            </svg>
            </div>
          </button>
          <span className="text-black ">
            Add <br /> Seat
          </span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <button className={`w-12 h-12 ${currentTool==='add-zone'?'bg-blue-400':'bg-[#e7e7eb]'}  rounded-[12px] hover:bg-blue-400 cursor-pointer`} onClick={() => setCurrentTool("add-zone")}>
            <div className='flex items-center justify-center '>
            <svg className='w-3 h-4 '>
                <use xlinkHref="#icon-zone" />
            </svg>
            </div>
          </button>
          <span className="text-black ">
            Add <br /> Zone
          </span>
           
        </div>
        <div className="flex flex-col items-center gap-1">
          <button className={`w-12 h-12 ${currentTool==='select'?'bg-blue-400':'bg-[#e7e7eb]'}  rounded-[12px] hover:bg-blue-400 cursor-pointer`} onClick={() => setCurrentTool("select")}>
             <div className='flex items-center justify-center '>
            <svg className='w-3 h-4 '>
                <use xlinkHref="#icon-select" />
            </svg>
            </div>
          </button>
          <span className="text-black ">Select</span>
        </div>
      </div>
    </div>
  );
}

export default Toolbar;
