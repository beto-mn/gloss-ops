import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator'

import { CfdiPaymentMethod } from '@glossops/database'

export class CreateInvoiceDto {
  @IsUUID()
  workOrderId: string

  @IsOptional()
  @IsString()
  customerTaxId?: string

  @IsOptional()
  @IsString()
  customerName?: string

  @IsOptional()
  @IsString()
  customerAddress?: string

  @IsOptional()
  @IsString()
  customerZipCode?: string

  @IsOptional()
  @IsString()
  customerFiscalRegime?: string

  @IsOptional()
  @IsString()
  cfdiUse?: string

  @IsOptional()
  @IsEnum(CfdiPaymentMethod)
  paymentMethod?: CfdiPaymentMethod

  @IsOptional()
  @IsString()
  paymentForm?: string
}
