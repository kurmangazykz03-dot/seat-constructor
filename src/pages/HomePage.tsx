import { Link } from "react-router-dom";

function HomePage() {
  return (
    <div className="bg-[#FAFAFA] w-full min-h-screen flex justify-center items-center">
      <div className="bg-white w-[448px] h-[500px] rounded-[16px] drop-shadow-[0_0_15px_rgba(0,0,0,0.10)] flex items-center flex-col pt-[43px] pb-[107px] px-[48px]">
        <div className="bg-[#E5E5E5] w-[64px] h-[64px] rounded-[16px] mb-[72px] flex justify-center items-center">
          <svg className="w-6 h-6 ">
            <use xlinkHref="#icon-home" />
          </svg>
        </div>
        <span className="text-[#171717] text-[24px] mb-[56px]">Конструктор схемы</span>

        <Link
          to="/editor"
          className="w-[352px] h-[56px] flex items-center justify-center bg-[#525252] text-white rounded mb-[16px] hover:bg-blue-500"
        >
          Редактировать
        </Link>

        <Link
          to="/viewer"
          className="w-[352px] h-[56px] flex items-center justify-center bg-[#525252] text-white rounded hover:bg-blue-500"
        >
          Просмотр
        </Link>
      </div>
    </div>
  );
}

export default HomePage;
