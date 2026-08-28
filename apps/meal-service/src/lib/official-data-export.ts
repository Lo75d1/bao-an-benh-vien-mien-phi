type FlatRow = Record<string, unknown>;

function scalar(value: unknown) {
  return value === null || ["string", "number", "boolean"].includes(typeof value);
}

export function flattenOfficialSource(value: unknown, prefix = "Nguon", output: FlatRow = {}): FlatRow {
  if (scalar(value)) {
    output[prefix] = value;
    return output;
  }
  if (Array.isArray(value)) {
    const nutrientRows = value.every((item) => item && typeof item === "object" && "name" in item);
    if (nutrientRows) {
      for (const item of value as Array<Record<string, unknown>>) {
        const name = String(item.name ?? "Khong ten").trim();
        const unit = typeof item.unit === "string" && item.unit.trim() ? ` (${item.unit.trim()})` : "";
        const amount = item.value ?? item.amount ?? item.quantity;
        if (scalar(amount)) output[`${prefix}.${name}${unit}`] = amount;
        else output[`${prefix}.${name}`] = JSON.stringify(item);
      }
    } else output[prefix] = JSON.stringify(value);
    return output;
  }
  if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) flattenOfficialSource(child, `${prefix}.${key}`, output);
  }
  return output;
}

const csvCell = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;

export function dynamicCsv(rows: FlatRow[]) {
  const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  return [columns.map(csvCell).join(","), ...rows.map((row) => columns.map((column) => csvCell(row[column])).join(","))].join("\r\n");
}
