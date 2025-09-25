function Toolbar() {
  return (
    <div className="w-[80px] bg-white border-r border-[#E5E5E5]  flex flex-col items-center py-4 px-4 gap-4 shadow-sm">
      <div className="flex flex-col gap-4 items-center ">
        <div className="flex flex-col items-center  gap-1">
          <button className="w-12 h-12 bg-[#e7e7eb] rounded-[12px] hover:bg-blue-400 cursor-pointer">
            <svg></svg>
          </button>
          <span className="text-black ">
            Add <br /> Row
          </span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <button className="w-12 h-12 bg-[#e7e7eb] rounded-[12px] hover:bg-blue-400 cursor-pointer">
            <svg></svg>
          </button>
          <span className="text-black ">
            Add <br /> Seat
          </span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <button className="w-12 h-12 bg-[#e7e7eb] rounded-[12px] hover:bg-blue-400 cursor-pointer">
            <svg></svg>
          </button>
          <span className="text-black ">
            Add <br />
            Zone
          </span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <button className="w-12 h-12 bg-[#e7e7eb] rounded-[12px] hover:bg-blue-400 cursor-pointer">
            <svg></svg>
          </button>
          <span className="text-black ">Select</span>
        </div>
      </div>
    </div>
  );
}

export default Toolbar;
