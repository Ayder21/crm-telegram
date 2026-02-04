"use client"

import { useEffect, useState } from "react"
// Temporarily commenting out all functional imports to debugging SSR crash
// import { getUsers, updateUserSubscription, toggleAdminRole } from "@/app/actions/admin-actions"
// import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
// import { Button } from "@/components/ui/button"

export default function AdminPage() {
    return (
        <div className="p-8">
            <h1 className="text-2xl font-bold">Admin Page (Debug Mode)</h1>
            <p>If you see this, the basic page renders correctly.</p>
        </div>
    )
}
