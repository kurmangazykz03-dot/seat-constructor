function TopBar() {
  return (
    <div className="h-[60px] bg-white border-b border-[#e5e5e5] flex items-center justify-between px-6 py-3  shadow-sm">
      <span className="text-[#171717] text-[20px]">Seat Constructor</span>

      <div className="flex gap-2 ">
        <button className="pt-2 pb-3 px-4 py-2 bg-[#525252] text-white rounded-[8px] hover:bg-blue-500 cursor-pointer">
          Save
        </button>
        <button className="pt-2 pb-3 px-4 py-2 bg-[#F5F5F5] text-black rounded-[8px] hover:bg-blue-500 cursor-pointer">
          Load
        </button>
        <button className="pt-2 pb-3 px-4 py-2 bg-[#F5F5F5] text-black rounded-[8px] hover:bg-blue-500 cursor-pointer">
          Clear
        </button>
        <button className="pt-2 pb-3 px-4 py-2 bg-[#525252] text-white rounded-[8px] hover:bg-blue-500 cursor-pointer">
          Export
        </button>
        
      </div>
    </div>
  );
}

export default TopBar;
