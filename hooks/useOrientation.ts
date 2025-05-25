"use client"

import { useState, useEffect } from "react"

export const useOrientation = () => {
  const [isLandscape, setIsLandscape] = useState(false)

  useEffect(() => {
    const checkOrientation = () => {
      if (typeof window !== "undefined") {
        setIsLandscape(window.innerWidth > window.innerHeight)
      }
    }

    checkOrientation()
    window.addEventListener("resize", checkOrientation)
    window.addEventListener("orientationchange", checkOrientation)

    return () => {
      window.removeEventListener("resize", checkOrientation)
      window.removeEventListener("orientationchange", checkOrientation)
    }
  }, [])

  return isLandscape
}
