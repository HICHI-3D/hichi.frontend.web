import Logo from '@shared/assets/logo.svg';
import { Icon, type IconName } from '@shared/ui';
import type { NavId } from '@widgets/app-shell';

type NavItem = {
  id: NavId;
  icon: IconName;
  label: string;
};

const navItems: NavItem[] = [
  { id: 'drawing', icon: 'cube', label: '도면 그리기' },
  { id: 'environment', icon: 'palette', label: '공간 환경' },
  { id: 'furniture', icon: 'couch', label: '가구 리스트' },
  { id: 'ai', icon: 'sparkle', label: 'AI 배치 추천' },
];

type Props = {
  activeNav: NavId | null;
  onNavClick: (id: NavId) => void;
};

const SideNav = ({ activeNav, onNavClick }: Props) => {
  return (
    <nav className="col h-full shrink-0 bg-gray-200 ">
      {/* 로고 */}
      <div className="flex-center shrink-0 border-b border-r border-gray-400 px-12 py-12">
        <img src={Logo} alt="HICHI" className="h-[3.75rem]" />
      </div>

      {/* 네비게이션 버튼 */}
      <div className="col flex-1 items-center justify-center gap-8 p-12 border-r border-gray-400">
        {navItems.map((item) => {
          const isActive = activeNav === item.id;
          return (
            <div key={item.id} className="col w-full items-center gap-8">
              {/* AI 배치 추천 위 구분선 */}
              {item.id === 'ai' && <div className="h-px w-full bg-gray-400" />}
              <button
                onClick={() => onNavClick(item.id)}
                className={[
                  'col flex-center gap-6 size-72 rounded-8 transition-colors cursor-pointer',
                  isActive ? 'bg-functional-indigo-20' : 'hover:bg-gray-300',
                ].join(' ')}
              >
                <Icon
                  name={item.icon}
                  active={isActive}
                  alt={item.label}
                  className="size-28"
                />
                <span
                  className={[
                    'label-m',
                    isActive ? 'text-functional-indigo' : 'text-gray-800',
                  ].join(' ')}
                >
                  {item.label}
                </span>
              </button>
            </div>
          );
        })}
      </div>
    </nav>
  );
};

export default SideNav;
