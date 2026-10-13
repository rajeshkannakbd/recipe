export function formatQuantity(value: number): string {
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
}

export function statusLabel(status: string): "Draft" | "Published" {
  return status.toLowerCase() === "published" ? "Published" : "Draft";
}
