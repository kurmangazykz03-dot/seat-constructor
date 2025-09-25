

interface PropertiesPanelProps{
  selectedId:string|null;
}


function PropertiesPanel({selectedId}:PropertiesPanelProps) {


  return (
    <div className="w-[320px] bg-white border-l border-[#e5e5e5] p-6 shadow-sm">
      <h2 className="font-bold mb-4 text-black">Properties</h2>
      {selectedId?(<p className='text-sm text-gray-700'>Selected object: <span className='font-mono'>{selectedId}</span></p>
  ):(
      <p className=" text-sm text-gray-500">Select an object in the diagram</p>
  )}
    </div>
  );
}

export default PropertiesPanel;
