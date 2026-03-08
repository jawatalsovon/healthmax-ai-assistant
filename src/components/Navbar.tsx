import { Link, useLocation } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Activity, Search, BarChart3, Info, Menu, X } from 'lucide-react';
import { useState } from 'react';

export function Navbar() {
  const { lang, setLang, t } = useLanguage();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const links = [
    { to: '/', label: t('home'), icon: Activity },
    { to: '/triage', label: t('startTriage'), icon: Activity },
    { to: '/medicines', label: t('medicinSearch'), icon: Search },
    { to: '/dashboard', label: t('dashboard'), icon: BarChart3 },
    { to: '/about', label: t('about'), icon: Info },
  ];

  return (
    <nav className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-md">
      <div className="container mx-auto flex items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-lg">
            H
          </div>
          <span className="font-bold text-lg font-bangla">{t('appName')}</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          {links.map(link => (
            <Link key={link.to} to={link.to}>
              <Button
                variant={location.pathname === link.to ? 'default' : 'ghost'}
                size="sm"
                className="gap-1.5"
              >
                <link.icon className="h-4 w-4" />
                <span className="font-bangla">{link.label}</span>
              </Button>
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLang(lang === 'bn' ? 'en' : 'bn')}
            className="font-bangla text-xs"
          >
            {lang === 'bn' ? 'EN' : 'বাং'}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <div className="md:hidden border-t bg-card px-4 py-2 space-y-1">
          {links.map(link => (
            <Link key={link.to} to={link.to} onClick={() => setMobileOpen(false)}>
              <Button
                variant={location.pathname === link.to ? 'default' : 'ghost'}
                size="sm"
                className="w-full justify-start gap-2 font-bangla"
              >
                <link.icon className="h-4 w-4" />
                {link.label}
              </Button>
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}
