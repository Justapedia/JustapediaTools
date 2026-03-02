import React from 'react';

export default function Footer() {
  return (
    <footer className="mt-16 py-8 border-t border-zinc-200 dark:border-zinc-800 text-center text-zinc-500 text-sm bg-white dark:bg-zinc-900/50">
      <div className="max-w-4xl mx-auto px-4 space-y-4">
        
        {/* Developer & Contact */}
        <div className="space-y-1">
          <p className="font-medium">Developed by <span className="text-zinc-900 dark:text-zinc-100 font-bold">Sourav</span></p>
          <p>
            Contact:{" "}
            <a href="mailto:skhsouravhalder@gmail.com" className="text-blue-600 dark:text-blue-400 hover:underline transition-colors">
              skhsouravhalder@gmail.com
            </a>
          </p>
        </div>

        {/* Links */}
        <div>
          <a 
            href="https://justapedia.org/wiki/Justapedia:Justapedia_Tools" 
            target="_blank" 
            rel="noreferrer"
            className="text-blue-600 dark:text-blue-400 hover:underline font-medium transition-colors"
          >
            About JPTools
          </a>
        </div>

        {/* Copyright & License */}
        <div className="text-xs text-zinc-400 dark:text-zinc-500 max-w-2xl mx-auto leading-relaxed">
          <p>
            Copyright © 2026 by the Tools contributors.
          </p>
          <p className="mt-1">
            JPTools (also known as Justapedia Tools) is free and open-source software licensed under the 
            GNU General Public License, version 3 or later (GPL-3.0+).
          </p>
        </div>

      </div>
    </footer>
  );
}
