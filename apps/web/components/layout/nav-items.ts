import {
  Calculator,
  Calendar,
  DollarSign,
  Gift,
  Home,
  type LucideIcon,
  Scissors,
  Settings,
  Sparkles,
  Users,
} from 'lucide-react';

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  disabled?: boolean;
  comingSoon?: boolean;
};

export const NAV_ITEMS: NavItem[] = [
  { href: '/hoje', label: 'Hoje', icon: Home },
  { href: '/agenda', label: 'Agenda', icon: Calendar, comingSoon: true },
  { href: '/profissionais', label: 'Profissionais', icon: Users },
  { href: '/servicos', label: 'Serviços', icon: Scissors },
  { href: '/clientes', label: 'Clientes', icon: Sparkles, comingSoon: true },
  { href: '/comissao', label: 'Comissão', icon: Calculator },
  {
    href: '/financeiro',
    label: 'Financeiro',
    icon: DollarSign,
    comingSoon: true,
  },
  { href: '/indicacao', label: 'Indicação', icon: Gift, comingSoon: true },
  { href: '/configuracoes', label: 'Configurações', icon: Settings },
];

export const BOTTOM_NAV_ITEMS: NavItem[] = [
  { href: '/hoje', label: 'Hoje', icon: Home },
  { href: '/agenda', label: 'Agenda', icon: Calendar, comingSoon: true },
  { href: '/profissionais', label: 'Profissionais', icon: Users },
  { href: '/servicos', label: 'Serviços', icon: Scissors },
];
