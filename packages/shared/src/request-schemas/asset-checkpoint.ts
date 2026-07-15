import { z } from 'zod'

/**
 * Checkpoint stage. Mirrors the Prisma `CheckpointType` enum; kept as a literal
 * enum so `@glossops/shared` stays free of a `@glossops/database` runtime
 * dependency.
 */
export const CheckpointTypeSchema = z.enum(['RECEPTION', 'PROCESS', 'DELIVERY'])

/** Fuel gauge reading. Mirrors the Prisma `FuelLevel` enum. */
export const FuelLevelSchema = z.enum([
  'EMPTY',
  'QUARTER',
  'HALF',
  'THREE_QUARTERS',
  'FULL',
])

/** Overall asset condition. Mirrors the Prisma `AssetCondition` enum. */
export const AssetConditionSchema = z.enum([
  'EXCELLENT',
  'GOOD',
  'FAIR',
  'POOR',
])

/**
 * Body schema for `POST /work-orders/:workOrderId/checkpoints`. Transform-free
 * plain object so `apps/web` can reuse it for form values via `z.infer`. Field
 * constraints mirror the former class-validator `CreateAssetCheckpointDto`;
 * `photo` is an array of URLs (`@IsUrl({}, { each: true })`).
 */
export const CreateAssetCheckpointSchema = z.object({
  type: CheckpointTypeSchema,
  processType: z.string().min(1).optional(),
  mileage: z.number().int().min(0).optional(),
  fuelLevel: FuelLevelSchema.optional(),
  generalCondition: AssetConditionSchema,
  note: z.string().optional(),
  photo: z.array(z.string().url()).optional(),
  customerSignatureUrl: z.string().url().optional(),
})

/**
 * Body schema for `PATCH /asset-checkpoints/:id`. NOT a plain `.partial()`:
 * `mileage`, `fuelLevel`, `note`, and `customerSignatureUrl` are `.nullable()`
 * because the former DTO typed them `... | null` to allow clearing (the service
 * passes the DTO straight to Prisma `update`, where `null` clears a nullable
 * column). `generalCondition` is optional but non-null on update.
 */
export const UpdateAssetCheckpointSchema = z.object({
  mileage: z.number().int().min(0).nullable().optional(),
  fuelLevel: FuelLevelSchema.nullable().optional(),
  generalCondition: AssetConditionSchema.optional(),
  note: z.string().nullable().optional(),
  photo: z.array(z.string().url()).optional(),
  customerSignatureUrl: z.string().url().nullable().optional(),
})

export type CreateAssetCheckpointInput = z.infer<
  typeof CreateAssetCheckpointSchema
>
export type UpdateAssetCheckpointInput = z.infer<
  typeof UpdateAssetCheckpointSchema
>
