export async function rebuildInventoryMovementDaily(
  supabase: { rpc: (fn: string) => PromiseLike<{ error: { code?: string | null; message: string; details?: string | null } | null }> },
) {
  const { error } = await supabase.rpc("rebuild_inventory_movement_daily");

  if (!error) {
    return null;
  }

  if (error.code === "42883" || error.code === "PGRST202") {
    return "Inventory movement rebuild function is not available.";
  }

  return `Inventory movement rebuild failed: ${error.message}`;
}
