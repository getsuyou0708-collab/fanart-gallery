'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

const EditorContext = createContext<{
  isUnlocked: boolean
  setIsUnlocked: (v: boolean) => void
}>({
  isUnlocked: false,
  setIsUnlocked: () => {}
})

export function EditorProvider({ children }: { children: ReactNode }) {
  const [isUnlocked, setIsUnlocked] = useState(false)
  return (
    <EditorContext.Provider value={{ isUnlocked, setIsUnlocked }}>
      {children}
    </EditorContext.Provider>
  )
}

export function useEditor() {
  return useContext(EditorContext)
}