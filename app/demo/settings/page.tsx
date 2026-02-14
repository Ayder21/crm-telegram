import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { DemoSettingsPanel } from "@/components/demo/DemoSettingsPanel";

export default async function DemoSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Restrict full demo settings to admins only (so only you can use it).
  const { data: profile } = await supabaseAdmin.from("profiles").select("role").eq("id", user.id).single();
  if (!profile || profile.role !== "admin") {
    redirect("/demo");
  }

  return <DemoSettingsPanel />;
}

