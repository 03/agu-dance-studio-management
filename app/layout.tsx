import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Noto_Sans_SC, Sora } from 'next/font/google'
import './globals.css'
import { LanguageProvider } from '@/lib/i18n'
import { ServiceWorkerRegister } from '@/components/service-worker-register'

const notoSansSC = Noto_Sans_SC({
  subsets: ['latin'],
  weight: ['400', '500', '700', '900'],
  variable: '--font-noto',
})

const sora = Sora({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  variable: '--font-sora',
})

export const metadata: Metadata = {
  title: 'Agu 舞蹈工作室 · 全流程管理及预约',
  description:
    'Agu Dance Studio — 课程预约、课时卡包、教务排课与运营报表一体化管理平台。Booking, class cards, scheduling and studio operations in one place.',
  // iOS ignores the web manifest for "Add to Home Screen" — this is what it
  // reads instead to launch fullscreen (no Safari chrome) from the home
  // screen icon rather than opening back into Safari.
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Agu 舞蹈',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#7c2fd6',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh" className={`${notoSansSC.variable} ${sora.variable} bg-background`}>
      <body className="font-sans antialiased">
        <LanguageProvider>{children}</LanguageProvider>
        <ServiceWorkerRegister />
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
