export type Role = 'ADMIN' | 'OPERATOR' | 'VIEWER';
export type Shift = 'FIRST' | 'SECOND';
export type Status = 'IN_PROGRESS' | 'FINALIZED' | 'CANCELED';
export type AuditResult = 'APPROVED' | 'REPROVED';
export type RepairStatus = 'OK' | 'NOK' | 'NOT_APPLICABLE';

export interface User { id: string; name: string; username: string; role: Role; active?: boolean }

export interface ItemResponse { itemCode: string; section: string; itemLabelSnapshot: string; response: 'OK' | 'NOK' | 'NA' | 'UNANSWERED'; observation: string | null }

export interface Checklist {
  id: string; chassis: string; vehicleVersion: string | null; checklistDate: string; checklistTime: string; shift: Shift | null;
  inspectorQA: string | null; leaderVPC: string | null; bpc: string | null; firmwareVersion: string | null; canbusVersion: string | null;
  auditResult: AuditResult | null; nonConformityDescription: string | null; repairStatus: RepairStatus | null; repairObservation: string | null;
  repairInspectorQA: string | null; repairLeaderVPC: string | null; repairDate: string | null; repairTime: string | null;
  status: Status; updatedAt: string; createdAt: string; finalizedAt: string | null; nokCount?: number; responses: ItemResponse[];
}

export interface Paged<T> { data: T[]; meta: { page: number; pageSize: number; total: number; totalPages: number } }
