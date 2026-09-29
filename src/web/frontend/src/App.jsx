import { useState, useCallback } from 'react';

import GithubNoPage from './pages/github_page/github_no_page.jsx';

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
import Inventory from './pages/inventory/main.jsx';

import NavbarSettingMenu from './components/navbar_setting_menu.jsx';

import GithubHome from './pages/github_page/github_home.jsx';

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
  // },
  'inventory': {
    'name': 'Inventory',
    'factory': (setting) => (<Inventory setting={setting} />)
  },
};

let githubPageMap = {
  'home': {
    'name': 'Home',
    'factory': (setting) => (<GithubHome setting={setting} />)
  },
  // 'item_info': {
  //   'name': 'Item Info',
  //   'factory': (setting) => (<GithubNoPage pageTitle="Item Info" />)
  // },
  'inventory': {
    'name': 'Inventory',
    'factory': (setting) => (<Inventory setting={setting} />)
  },
}

export default function App({ envSetting }) {
  const defaultSetting = {
    'oracle_type': 'default_oracle_price_48h',
    'ducantor_price_override': 'day',
    'update_count': 1,
    'inventory_file': null,

    // env_setting cannot be mutated
    'env_setting': {...envSetting},
  }

  const [currentPage, setCurrentPage] = useState('home');
  const [setting, setSetting] = useState(
    (() => {
      try {
        const savedSetting = localStorage.getItem('setting');
        console.log('savedSetting', savedSetting)
        const jsonSetting = JSON.parse(savedSetting)
        if (savedSetting && jsonSetting) {
          return {
            ...defaultSetting,
            ...jsonSetting,
            'env_setting': {...envSetting},
          };
        }
        return defaultSetting;
      } catch (error) {
        console.error('Error loading setting from localStorage:', error);
        return defaultSetting;
      }
    })()
  );

  const setSettingAndSave = useCallback((newSetting) => {
    localStorage.setItem('setting', JSON.stringify(newSetting));
    // we make sure the user can only change user_setting
    setSetting({
      ...newSetting,
      'env_setting': {...envSetting},
    });
  }, [setSetting]);

  // save to cookie

  console.log(currentPage, setting)
  return (<>
    <QueryClientProvider client={queryClient}>
      <Navbar setCurrentPage={setCurrentPage} setting={setting} setSetting={setSettingAndSave} />
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
  const usedPageMap = setting.env_setting.is_github_page ? githubPageMap : pageMap;

  return (<>
    <header className="fixed top-0 left-0 right-0 bg-[#222831] text-white p-4 z-50">
      <nav className="flex justify-between items-center space-x-8">
        <span className="text-3xl font-bold hover:cursor-pointer" onClick={() => setCurrentPage('home')}>Warframe Tools</span>

        {/* Desktop Menu (note that hidden and flex are both specified by "display" so md:flex overrides hidden) */}
        <ul className="hidden md:flex space-x-8 items-center">
          {Object.entries(usedPageMap).slice().map(([key, value]) => (
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
          {Object.entries(usedPageMap).slice().map(([key, value]) => (
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
  const usedPageMap = setting.env_setting.is_github_page ? githubPageMap : pageMap;
  return (
    <div className="pt-16 pb-20">
      {usedPageMap[currentPage] ? usedPageMap[currentPage].factory(setting) : (<p>Page not found</p>)}
    </div>
  );
}

function Footer() {
  return (
    <footer className="fixed bottom-0 w-full bg-[#222831] text-white p-4 text-center">
      <p>
        <a href="https://github.com/Kaiserouo" target="_blank" rel="noopener noreferrer" className='underline'>@Kaiserouo</a> • <a href="https://github.com/Kaiserouo/Warframe-Tools" target="_blank" rel="noopener noreferrer" className='underline'>Warframe-Tools</a>
      </p>
    </footer>
  );
}