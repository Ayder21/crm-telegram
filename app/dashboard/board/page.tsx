
"use client"

import { CRMBoard } from "@/components/dashboard/CRMBoard"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function BoardPage() {
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            <div className="h-14 sm:h-16 border-b bg-white flex items-center px-3 sm:px-6 justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard" className="p-2 rounded-full hover:bg-slate-100 text-slate-500">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <h1 className="text-base sm:text-xl font-bold text-slate-900">Канбан Доска (CRM)</h1>
                </div>
            </div>
            <div className="flex-1 overflow-hidden">
                <CRMBoard />
            </div>
        </div>
    )
}
