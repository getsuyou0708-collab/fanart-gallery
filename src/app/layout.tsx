import type { Metadata } from 'next'
import './globals.css'
import Navigation from '@/components/Navigation'
import { EditorProvider } from '@/contexts/EditorContext'

export const metadata: Metadata = {
  title: '森見月下',
  description: '个人同人图展示',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body>
        <EditorProvider>
          <Navigation />
          <main style={{ minHeight: 'calc(100vh - 64px)', paddingTop: '64px' }}>
            {children}
          </main>
        </EditorProvider>
      </body>
    </html>
  )
}