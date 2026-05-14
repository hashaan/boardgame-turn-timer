"use client"

import { useState } from "react"
import { Download, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { dataExportApi } from "@/lib/api"

interface ExportDataButtonProps {
  groupId?: string
  gameId?: string
  className?: string
}

export function ExportDataButton({ groupId, gameId, className }: ExportDataButtonProps) {
  const [exporting, setExporting] = useState(false)

  if (!groupId || !gameId) return null

  const handleExport = async () => {
    setExporting(true)
    try {
      const response = await dataExportApi.downloadGroupExport(groupId, { gameId })
      if (!response.success) {
        toast.error(response.error ?? "Export failed")
        return
      }

      toast.success("Export downloaded", {
        description: response.data?.filename,
      })
    } finally {
      setExporting(false)
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={className}
      onClick={handleExport}
      disabled={exporting}
      aria-label="Export Dune data as JSON"
    >
      {exporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
      {exporting ? "Exporting..." : "Export data"}
    </Button>
  )
}
