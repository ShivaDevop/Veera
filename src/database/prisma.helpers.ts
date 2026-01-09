import { Prisma } from '@prisma/client';

/**
 * Helper function to ensure strict relation handling
 * Throws error if related entity is not found
 */
export function ensureRelationExists<T>(
  entity: T | null,
  entityName: string,
  identifier?: string,
): T {
  if (!entity) {
    throw new Error(
      `${entityName}${identifier ? ` with identifier ${identifier}` : ''} not found`,
    );
  }
  return entity;
}

/**
 * Helper function to build where clause with soft delete filtering
 */
export function buildWhereWithSoftDelete<T extends Prisma.WhereInput>(
  where?: T,
  includeDeleted: boolean = false,
): T {
  if (includeDeleted) {
    return where as T;
  }

  return {
    ...where,
    deletedAt: null,
  } as T;
}

/**
 * Helper function to build include clause with soft delete filtering for relations
 */
export function buildIncludeWithSoftDelete<T extends Prisma.IncludeInput>(
  include?: T,
): T {
  if (!include) {
    return {} as T;
  }

  const result: any = { ...include };

  // Recursively filter out deleted relations
  for (const key in result) {
    if (typeof result[key] === 'object' && result[key] !== null) {
      if (result[key].where) {
        result[key].where = {
          ...result[key].where,
          deletedAt: null,
        };
      } else {
        result[key].where = { deletedAt: null };
      }
    }
  }

  return result as T;
}

/**
 * Transaction isolation levels for Azure SQL
 */
export enum TransactionIsolationLevel {
  ReadUncommitted = 'ReadUncommitted',
  ReadCommitted = 'ReadCommitted',
  RepeatableRead = 'RepeatableRead',
  Serializable = 'Serializable',
  Snapshot = 'Snapshot',
}

/**
 * Helper to convert enum to Prisma isolation level
 */
export function toPrismaIsolationLevel(
  level: TransactionIsolationLevel,
): Prisma.TransactionIsolationLevel {
  return level as Prisma.TransactionIsolationLevel;
}

