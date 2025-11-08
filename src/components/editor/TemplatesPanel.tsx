import React from "react";
import { LayoutPanelLeft, ChevronDown } from "lucide-react";

/** ОДИН шаблон */
export type TemplateItem = {
  id: string;
  title: string;
  description: string;
  iconUrl?: string | null;
  priority: number; //  меньший = показываем выше
};

/** Категория шаблонов (Театры, Кинотеатры и т.п.) */
export type TemplateCategory = {
  id: string;
  title: string;
  priority: number; // меньший = выше в списке
  items: TemplateItem[];
};

/**
 * Ожидаемый JSON от сервера (после импорта в админке):
 *
 * GET /api/seatmap-templates
 *
 * {
 *   "categories": [
 *     {
 *       "id": "theatres",
 *       "title": "Театры",
 *       "priority": 10,
 *       "items": [
 *         {
 *           "id": "theatre-180",
 *           "title": "Рассадка на 180 мест",
 *           "description": "Казахский национальный театр драмы имени Мухтара Ауэзова",
 *           "iconUrl": "https://.../theatre-180.svg",
 *           "priority": 100
 *         }
 *       ]
 *     }
 *   ]
 * }
 */

const MOCK_TEMPLATES: TemplateCategory[] = [
  {
    id: "theatres",
    title: "Театры",
    priority: 10,
    items: [
      {
        id: "theatre-180-1",
        title: "Рассадка на 180 мест",
        description: "Казахский национальный театр драмы имени Мухтара Ауэзова",
        iconUrl: null,
        priority: 10,
      },
      {
        id: "theatre-180-2",
        title: "Рассадка на 180 мест",
        description: "Казахский национальный театр драмы имени Мухтара Ауэзова",
        iconUrl: null,
        priority: 20,
      },
      {
        id: "theatre-180-3",
        title: "Рассадка на 180 мест",
        description: "Казахский национальный театр драмы имени Мухтара Ауэзова",
        iconUrl: null,
        priority: 30,
      },
    ],
  },
  {
    id: "cinemas",
    title: "Кинотеатры",
    priority: 20,
    items: [
      {
        id: "cinema-180-1",
        title: "Рассадка на 180 мест",
        description: "Казахский национальный театр драмы имени Мухтара Ауэзова",
        iconUrl: null,
        priority: 10,
      },
      {
        id: "cinema-180-2",
        title: "Рассадка на 180 мест",
        description: "Казахский национальный театр драмы имени Мухтара Ауэзова",
        iconUrl: null,
        priority: 20,
      },
      {
        id: "cinema-180-3",
        title: "Рассадка на 180 мест",
        description: "Казахский национальный театр драмы имени Мухтара Ауэзова",
        iconUrl: null,
        priority: 30,
      },
    ],
  },
  {
    id: "halls",
    title: "Концертные залы",
    priority: 30,
    items: [
      {
        id: "hall-180-1",
        title: "Рассадка на 180 мест",
        description: "Казахский национальный театр драмы имени Мухтара Ауэзова",
        iconUrl: null,
        priority: 10,
      },
    ],
  },
];

// сортировка по приоритетам категорий и элементов
function sortWithPriority(data: TemplateCategory[]): TemplateCategory[] {
  return [...data]
    .sort((a, b) => a.priority - b.priority)
    .map((cat) => ({
      ...cat,
      items: [...cat.items].sort((a, b) => a.priority - b.priority),
    }));
}

const TemplatesPanel: React.FC = () => {
  // TemplatesPanel.tsx

const [categories, setCategories] = React.useState<TemplateCategory[]>([]);
const [isLoading, setIsLoading] = React.useState(true);
const [error, setError] = React.useState<string | null>(null);

React.useEffect(() => {
  setIsLoading(true);
  setError(null);

  fetch("/api/seatmap-templates")
    .then((r) => {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    })
    .then((json: { categories: TemplateCategory[] }) => {
      setCategories(sortWithPriority(json.categories));
    })
    .catch((e) => {
      console.error("Failed to load templates", e);
      // фолбэк на мок, чтобы редактор не ломался
      setCategories(sortWithPriority(MOCK_TEMPLATES));
      setError("Не удалось загрузить шаблоны, показаны тестовые данные.");
    })
    .finally(() => setIsLoading(false));
}, []);


  return (
    <div className="w-full h-full bg-white border-l border-gray-200 shadow-lg flex flex-col">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LayoutPanelLeft size={18} className="text-gray-500" />
          <div>
            <div className="text-sm font-semibold text-gray-900">Готовые шаблоны</div>
            <div className="text-[11px] text-gray-400">
              Быстрый старт для типовых площадок
            </div>
          </div>
        </div>
      </div>

      {/* Содержимое */}
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center text-xs text-gray-400">
          Загрузка шаблонов...
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-6">
          {categories.map((category) => (
            <section key={category.id}>
              <div className="text-xs font-semibold text-gray-500 mb-2">
                {category.title}
              </div>
              <div className="space-y-2">
                {category.items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition text-left"
                    onClick={() => {
                      // 👉 сюда позже можно повесить применение схемы
                      console.log("Template clicked:", item.id);
                      // alert("Применение шаблона будет реализовано позже.");
                    }}
                  >
                    {/* Иконка / превью */}
                    <div className="flex-shrink-0 h-10 w-10 rounded-lg border border-gray-200 bg-gray-50 overflow-hidden">
                      {item.iconUrl ? (
                        <img
                          src={item.iconUrl}
                          alt=""
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-gray-50 to-gray-100" />
                      )}
                    </div>

                    {/* Текст */}
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-gray-900 truncate">
                        {item.title}
                      </div>
                      <div className="text-[11px] text-gray-500 leading-snug overflow-hidden text-ellipsis">
                        {item.description}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          ))}

          <div className="flex items-center justify-center pt-2 pb-4 text-[11px] text-gray-400">
            <ChevronDown size={14} className="mr-1" />
            Дополнительные шаблоны будут доступны позже
          </div>
        </div>
      )}
    </div>
  );
};

export default TemplatesPanel;
