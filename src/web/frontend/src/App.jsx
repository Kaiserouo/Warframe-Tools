import { useState } from 'react';

import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from '@tanstack/react-query'

const queryClient = new QueryClient()

import Home from "./pages/home.jsx";
import Relic from "./pages/relic.jsx";
import ItemInfo from "./pages/item_info.jsx";
import Syndicate from './pages/syndicate.jsx';
import TransientReward from './pages/transient_reward.jsx';
import BestTrade from './pages/best_trade.jsx';
import Test from './pages/test.jsx';

import NavbarSettingMenu from './components/navbar_setting_menu.jsx';

let pageMap = {
  'home': {
    'name': 'Home',
    'factory': (setting) => (<Home setting={setting} />)
  },
  'item_info': {
    'name': 'Item Info',
    'factory': (setting) => (<ItemInfo setting={setting} />)
  },
  'relic': {
    'name': 'Relic',
    'factory': (setting) => (<Relic setting={setting} />)
  },
  'syndicate': {
    'name': 'Syndicate',
    'factory': (setting) => (<Syndicate setting={setting} />)
  },
  'transient_reward': {
    'name': 'Transient Reward',
    'factory': (setting) => (<TransientReward setting={setting} />)
  },
  'best_trade': {
    'name': 'Best Trade',
    'factory': (setting) => (<BestTrade setting={setting} />)
  },
  // 'test': {
  //   'name': 'Test',
  //   'factory': (setting) => (<Test setting={setting} />)
  // }
};

export default function App() {
  const defaultSetting = {
    'oracle_type': 'default_oracle_price_48h',
    'ducantor_price_override': 'day',
    'update_count': 1,
  }

  const [currentPage, setCurrentPage] = useState('home');
  const [setting, setSetting] = useState(
    (() => {
      const savedSetting = document.cookie.split('; ').find(row => row.startsWith('setting='));
      return savedSetting ? (
        {...defaultSetting, ...JSON.parse(decodeURIComponent(savedSetting.split('=')[1]))}
      ) : defaultSetting;
    })()
  );

  // save to cookie
  document.cookie = `setting=${encodeURIComponent(JSON.stringify(setting))}; path=/; max-age=31536000`; // 1 year

  console.log(currentPage, setting)
  return (<>
    <QueryClientProvider client={queryClient}>
      <Navbar setCurrentPage={setCurrentPage} setting={setting} setSetting={setSetting} />
      <MainContent currentPage={currentPage} setting={setting} />
      <Footer />
    </QueryClientProvider>
  </>);
}

function NavbarPage({name, value, setCurrentPage}) {
  return (
    <li>
      <a href="#" className="hover:text-gray-400" onClick={() => setCurrentPage(value)}>
        {name}
      </a>
    </li>
  );
}

function Navbar({setCurrentPage, setting, setSetting}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (<>
    <header className="fixed top-0 left-0 right-0 bg-[#222831] text-white p-4 z-50">
      <nav className="flex justify-between items-center space-x-8">
        <span className="text-3xl font-bold hover:cursor-pointer" onClick={() => setCurrentPage('home')}>Warframe Tools</span>

        {/* Desktop Menu (note that hidden and flex are both specified by "display" so md:flex overrides hidden) */}
        <ul className="hidden md:flex space-x-8 items-center">
          {Object.entries(pageMap).slice().map(([key, value]) => (
            <NavbarPage key={key} name={value.name} value={key} setCurrentPage={setCurrentPage} />
          ))}
        </ul>
        
        <ul className="hidden md:flex ml-auto items-center space-x-8">
          <NavbarSettingMenu setting={setting} setSetting={setSetting} />
        </ul>

        {/* Mobile Menu Button */}
        <button className="md:hidden ml-auto text-2xl" onClick={() => setIsMenuOpen(!isMenuOpen)}>
          ☰
        </button>
      </nav>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <ul className="md:hidden mt-4 space-y-2 flex flex-col">
          {Object.entries(pageMap).slice().map(([key, value]) => (
            <li key={key}>
              <a href="#" className="hover:text-gray-400" onClick={() => { setCurrentPage(key); setIsMenuOpen(false); }}>
                {value.name}
              </a>
            </li>
          ))}
          <li className="mt-4 pt-4 border-t border-gray-600">
            <NavbarSettingMenu setting={setting} setSetting={setSetting} />
          </li>
        </ul>
      )}
    </header>
  </>
  );
}

function MainContent({currentPage, setting}) {
  return (
    <div className="pt-16 pb-20">
      {pageMap[currentPage] ? pageMap[currentPage].factory(setting) : (<p>Page not found</p>)}
    </div>
  );
}

function Footer() {
  return (
    <footer className="fixed bottom-0 w-full bg-[#222831] text-white p-4 text-center">
      <p>@Kaiserouo</p>
    </footer>
  );
}