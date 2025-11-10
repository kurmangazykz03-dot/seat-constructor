import { Link } from "react-router-dom";
import logoUrl from "../assets/icons/logo.png";

/**
 * HomePage — стартовый экран приложения.
 *
 * Показывает логотип и две основные кнопки:
 *  • «Начать» — переход в редактор схем (/editor)
 *  • «Просмотр» — переход в режим просмотра (/viewer)
 *
 * Вёрстка:
 *  • Серый фон на всю высоту окна
 *  • Белая карточка фиксированной ширины по центру экрана
 */
const HomePage: React.FC = () => {
  return (
    <div className="bg-[#FAFAFA] w-full min-h-screen flex justify-center items-center">
      {/* Центральная карточка с контентом */}
      <div className="bg-white w-[448px] h-[500px] rounded-[16px] drop-shadow-[0_0_15px_rgba(0,0,0,0.10)] flex items-center flex-col pt-[43px] pb-[107px] px-[48px]">
        {/* Логотип */}
        <img src={logoUrl} alt="YouTicket" className="h-10 w-auto mb-[62px]" draggable={false} />

        {/* Заголовок */}
        <span className="text-[#171717] text-[24px] mb-[66px]">Конструктор схемы</span>

        {/* Основная (зелёная) кнопка — редактор */}
        <Link
          to="/editor"
          className="w-[352px] h-[56px] flex items-center justify-center rounded mb-[16px] text-white bg-[#16A34A] hover:bg-[#15803D]"
        >
          Начать
        </Link>

        {/* Вторичная (тёмно-серая) кнопка — просмотр */}
        <Link
          to="/viewer"
          className="w-[352px] h-[56px] flex items-center justify-center rounded text-white bg-[#525252] hover:bg-[#404040]"
        >
          Просмотр
        </Link>
      </div>
    </div>
  );
};

export default HomePage;
