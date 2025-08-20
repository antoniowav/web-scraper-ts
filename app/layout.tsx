import type { ReactNode } from "react"
import "./globals.css"
import { Providers } from "./providers"

const setInitialTheme = `(function() {
  try {
    // Temporarily disable transitions/animations to avoid flicker when toggling theme on hydration.
    document.documentElement.classList.add('notransition');

    var theme = localStorage.getItem('theme');
    // next-themes stores 'dark' | 'light' | 'system' (or undefined)
    if (theme === 'dark' || (!theme && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Remove the 'notransition' marker after paint so transitions work normally afterwards.
    // Two rAFs ensures we run after the next paint/hydration step.
    requestAnimationFrame(function() {
      requestAnimationFrame(function() {
        try { document.documentElement.classList.remove('notransition'); } catch (e) {}
      });
    });
  } catch (e) {
    // ignore
  }
})();`

const disableTransitionsCss = `html.notransition *, html.notransition *::before, html.notransition *::after { transition: none !important; animation: none !important; }`

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en"  suppressHydrationWarning>
      <head>
        <style dangerouslySetInnerHTML={{ __html: disableTransitionsCss }} />
        <script dangerouslySetInnerHTML={{ __html: setInitialTheme }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
