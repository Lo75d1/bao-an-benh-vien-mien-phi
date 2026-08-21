export type StoredEvidence = { storagePath: string };
export interface EvidenceStorage { store(file: File): Promise<StoredEvidence | null>; publicUrl(storagePath: string): string | null; }

class UnconfiguredEvidenceStorage implements EvidenceStorage {
  async store(_file: File): Promise<null> { return null; }
  publicUrl(storagePath: string): string | null {
    const baseUrl = process.env.EVIDENCE_PUBLIC_BASE_URL?.trim();
    if (!baseUrl || !storagePath) return null;
    return `${baseUrl.replace(/\/$/, "")}/${storagePath.replace(/^\//, "")}`;
  }
}

// M4 defines the storage boundary without assuming a local or cloud backend.
export const evidenceStorage: EvidenceStorage = new UnconfiguredEvidenceStorage();
