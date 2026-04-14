import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../generated/prisma/client.ts'

const adapter = new PrismaPg({ connectionString: process.env['DATABASE_URL'] })
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('Seeding database...')

  // ─────────────────────────────────────────────
  // GLOBAL BRANDS (system-seeded, organizationId = null)
  // upsert via findFirst+create because the compound unique index allows null organizationId
  // ─────────────────────────────────────────────

  async function upsertGlobalBrand(
    slug: string,
    name: string,
    category: string
  ) {
    const existing = await prisma.brand.findFirst({
      where: { slug, organizationId: null },
    })
    if (existing) return existing
    return prisma.brand.create({
      data: { name, slug, category, isSeeded: true },
    })
  }

  const [avery, xpel, llumar, threem] = await Promise.all([
    upsertGlobalBrand('avery-dennison', 'Avery Dennison', 'vinyl'),
    upsertGlobalBrand('xpel', 'XPEL', 'ppf'),
    upsertGlobalBrand('llumar', 'LLumar', 'window_tint'),
    upsertGlobalBrand('3m', '3M', 'vinyl'),
  ])

  console.log('  ✓ Global brands')

  // ─────────────────────────────────────────────
  // ORGANIZATION: ChromeShield CDMX
  // ─────────────────────────────────────────────

  const org = await prisma.organization.upsert({
    where: { slug: 'chromeshield' },
    update: {},
    create: {
      name: 'ChromeShield',
      slug: 'chromeshield',
    },
  })

  await prisma.organizationFiscalProfile.upsert({
    where: {
      organizationId_taxId: { organizationId: org.id, taxId: 'CSH210401AB1' },
    },
    update: {},
    create: {
      organizationId: org.id,
      legalName: 'ChromeShield Automotriz S.A. de C.V.',
      taxId: 'CSH210401AB1',
      fiscalRegime: '601',
      address: 'Av. Insurgentes Sur 1234, Col. Del Valle, CDMX',
      zipCode: '03100',
      isDefault: true,
    },
  })

  console.log('  ✓ Organization')

  // ─────────────────────────────────────────────
  // BRANCHES
  // ─────────────────────────────────────────────

  const [branchCDMX, branchGDL] = await Promise.all([
    prisma.branch.upsert({
      where: { id: '00000000-0000-0000-0000-000000000001' },
      update: {},
      create: {
        id: '00000000-0000-0000-0000-000000000001',
        organizationId: org.id,
        name: 'CDMX — Del Valle',
        address: 'Av. Insurgentes Sur 1234, Col. Del Valle, CDMX',
        phone: '+52 55 1234 5678',
        email: 'cdmx@chromeshield.mx',
        isMain: true,
      },
    }),
    prisma.branch.upsert({
      where: { id: '00000000-0000-0000-0000-000000000002' },
      update: {},
      create: {
        id: '00000000-0000-0000-0000-000000000002',
        organizationId: org.id,
        name: 'Guadalajara — Zapopan',
        address: 'Blvd. Puerta de Hierro 4965, Col. Jardines del Sol, Zapopan',
        phone: '+52 33 9876 5432',
        email: 'gdl@chromeshield.mx',
        isMain: false,
      },
    }),
  ])

  console.log('  ✓ Branches')

  // ─────────────────────────────────────────────
  // ACCOUNTS (team members)
  // ─────────────────────────────────────────────

  const [
    owner,
    managerCDMX,
    techRafael,
    techSofia,
    frontDesk,
    managerGDL,
    techGDL,
  ] = await Promise.all([
    prisma.account.upsert({
      where: { email: 'carlos@chromeshield.mx' },
      update: {},
      create: {
        email: 'carlos@chromeshield.mx',
        passwordHash: '$2b$10$placeholder_owner_hash',
        firstName: 'Carlos',
        lastName: 'Mendoza',
      },
    }),
    prisma.account.upsert({
      where: { email: 'lucia@chromeshield.mx' },
      update: {},
      create: {
        email: 'lucia@chromeshield.mx',
        passwordHash: '$2b$10$placeholder_mgr_hash',
        firstName: 'Lucía',
        lastName: 'Ramírez',
      },
    }),
    prisma.account.upsert({
      where: { email: 'rafael@chromeshield.mx' },
      update: {},
      create: {
        email: 'rafael@chromeshield.mx',
        passwordHash: '$2b$10$placeholder_tech1_hash',
        firstName: 'Rafael',
        lastName: 'Torres',
      },
    }),
    prisma.account.upsert({
      where: { email: 'sofia@chromeshield.mx' },
      update: {},
      create: {
        email: 'sofia@chromeshield.mx',
        passwordHash: '$2b$10$placeholder_tech2_hash',
        firstName: 'Sofía',
        lastName: 'Vega',
      },
    }),
    prisma.account.upsert({
      where: { email: 'recepcion@chromeshield.mx' },
      update: {},
      create: {
        email: 'recepcion@chromeshield.mx',
        passwordHash: '$2b$10$placeholder_fd_hash',
        firstName: 'Andrea',
        lastName: 'Castro',
      },
    }),
    prisma.account.upsert({
      where: { email: 'manager.gdl@chromeshield.mx' },
      update: {},
      create: {
        email: 'manager.gdl@chromeshield.mx',
        passwordHash: '$2b$10$placeholder_mgr2_hash',
        firstName: 'Rodrigo',
        lastName: 'Herrera',
      },
    }),
    prisma.account.upsert({
      where: { email: 'tecnico.gdl@chromeshield.mx' },
      update: {},
      create: {
        email: 'tecnico.gdl@chromeshield.mx',
        passwordHash: '$2b$10$placeholder_tech3_hash',
        firstName: 'Miguel',
        lastName: 'Flores',
      },
    }),
  ])

  console.log('  ✓ Accounts')

  // ─────────────────────────────────────────────
  // ORGANIZATION MEMBERS (role per branch)
  // ─────────────────────────────────────────────

  const [
    memberOwnerCDMX,
    memberRafael,
    memberSofia,
    ,
    memberManagerGDL,
    memberTechGDL,
  ] = await Promise.all([
    // CDMX branch
    prisma.organizationMember.upsert({
      where: {
        accountId_branchId: { accountId: owner.id, branchId: branchCDMX.id },
      },
      update: {},
      create: { branchId: branchCDMX.id, accountId: owner.id, role: 'OWNER' },
    }),
    prisma.organizationMember.upsert({
      where: {
        accountId_branchId: {
          accountId: managerCDMX.id,
          branchId: branchCDMX.id,
        },
      },
      update: {},
      create: {
        branchId: branchCDMX.id,
        accountId: managerCDMX.id,
        role: 'MANAGER',
      },
    }),
    prisma.organizationMember.upsert({
      where: {
        accountId_branchId: {
          accountId: techRafael.id,
          branchId: branchCDMX.id,
        },
      },
      update: {},
      create: {
        branchId: branchCDMX.id,
        accountId: techRafael.id,
        role: 'TECHNICIAN',
      },
    }),
    prisma.organizationMember.upsert({
      where: {
        accountId_branchId: {
          accountId: techSofia.id,
          branchId: branchCDMX.id,
        },
      },
      update: {},
      create: {
        branchId: branchCDMX.id,
        accountId: techSofia.id,
        role: 'TECHNICIAN',
      },
    }),
    prisma.organizationMember.upsert({
      where: {
        accountId_branchId: {
          accountId: frontDesk.id,
          branchId: branchCDMX.id,
        },
      },
      update: {},
      create: {
        branchId: branchCDMX.id,
        accountId: frontDesk.id,
        role: 'FRONT_DESK',
      },
    }),
    // GDL branch
    prisma.organizationMember.upsert({
      where: {
        accountId_branchId: { accountId: owner.id, branchId: branchGDL.id },
      },
      update: {},
      create: { branchId: branchGDL.id, accountId: owner.id, role: 'OWNER' },
    }),
    prisma.organizationMember.upsert({
      where: {
        accountId_branchId: {
          accountId: managerGDL.id,
          branchId: branchGDL.id,
        },
      },
      update: {},
      create: {
        branchId: branchGDL.id,
        accountId: managerGDL.id,
        role: 'MANAGER',
      },
    }),
    prisma.organizationMember.upsert({
      where: {
        accountId_branchId: { accountId: techGDL.id, branchId: branchGDL.id },
      },
      update: {},
      create: {
        branchId: branchGDL.id,
        accountId: techGDL.id,
        role: 'TECHNICIAN',
      },
    }),
  ])

  console.log('  ✓ Organization members')

  // ─────────────────────────────────────────────
  // SERVICES CATALOG
  // ─────────────────────────────────────────────

  const [
    svcFullWrap,
    svcPPF,
    svcCeramic,
    svcWindowTint,
    svcPaintCorrection,
    svcDetailing,
  ] = await Promise.all([
    prisma.service.upsert({
      where: { id: '10000000-0000-0000-0000-000000000001' },
      update: {},
      create: {
        id: '10000000-0000-0000-0000-000000000001',
        organizationId: org.id,
        name: 'Full Wrap',
        description:
          'Recubrimiento completo del vehículo con vinil de alta calidad',
        basePrice: 18000,
        claveProdServ: '25172101',
        claveUnidad: 'E48',
        warrantyDays: 730,
        warrantyDescription:
          'Garantía de 2 años contra desprendimiento, burbujas y decoloración',
        warrantyTerm:
          'Cubre defectos de instalación y fallas prematuras del material bajo condiciones normales de uso.',
      },
    }),
    prisma.service.upsert({
      where: { id: '10000000-0000-0000-0000-000000000002' },
      update: {},
      create: {
        id: '10000000-0000-0000-0000-000000000002',
        organizationId: org.id,
        name: 'Paint Protection Film (PPF)',
        description:
          'Película de protección de pintura urethermoplástica de alto espesor',
        basePrice: 22000,
        claveProdServ: '25172101',
        claveUnidad: 'E48',
        warrantyDays: 1825,
        warrantyDescription:
          'Garantía de 5 años contra amarillamiento, descascaramiento y burbujas',
        warrantyTerm:
          'Garantía de fabricante XPEL. Cubre defectos del material y de instalación. No cubre daños por impacto o abrasión mecánica.',
      },
    }),
    prisma.service.upsert({
      where: { id: '10000000-0000-0000-0000-000000000003' },
      update: {},
      create: {
        id: '10000000-0000-0000-0000-000000000003',
        organizationId: org.id,
        name: 'Ceramic Coating',
        description:
          'Recubrimiento cerámico nanotecnológico para protección y brillo de larga duración',
        basePrice: 9500,
        claveProdServ: '25172100',
        claveUnidad: 'E48',
        warrantyDays: 1095,
        warrantyDescription:
          'Garantía de 3 años contra pérdida de hidrofobicidad y brillo',
        warrantyTerm:
          'Requiere mantenimiento semestral en nuestras instalaciones para mantener la validez de la garantía.',
      },
    }),
    prisma.service.upsert({
      where: { id: '10000000-0000-0000-0000-000000000004' },
      update: {},
      create: {
        id: '10000000-0000-0000-0000-000000000004',
        organizationId: org.id,
        name: 'Window Tint',
        description:
          'Polarizado de ventanas con película de alta rechazo solar y UV',
        basePrice: 3800,
        claveProdServ: '25172101',
        claveUnidad: 'E48',
        warrantyDays: 365,
        warrantyDescription:
          'Garantía de 1 año contra burbujeo, decoloración y desprendimiento',
        warrantyTerm:
          'Excluye daños por rascado o uso de limpiadores abrasivos.',
      },
    }),
    prisma.service.upsert({
      where: { id: '10000000-0000-0000-0000-000000000005' },
      update: {},
      create: {
        id: '10000000-0000-0000-0000-000000000005',
        organizationId: org.id,
        name: 'Paint Correction',
        description:
          'Corrección de pintura por etapas para eliminar swirls, rayones y defectos',
        basePrice: 5500,
        claveProdServ: '25172100',
        claveUnidad: 'E48',
      },
    }),
    prisma.service.upsert({
      where: { id: '10000000-0000-0000-0000-000000000006' },
      update: {},
      create: {
        id: '10000000-0000-0000-0000-000000000006',
        organizationId: org.id,
        name: 'Interior Detailing',
        description:
          'Limpieza profunda y restauración de todos los interiores del vehículo',
        basePrice: 2200,
        claveProdServ: '25172100',
        claveUnidad: 'E48',
      },
    }),
  ])

  console.log('  ✓ Services')

  // ─────────────────────────────────────────────
  // SUPPLIERS
  // ─────────────────────────────────────────────

  const [supplierAvery, supplierXPEL] = await Promise.all([
    prisma.supplier.upsert({
      where: { id: '20000000-0000-0000-0000-000000000001' },
      update: {},
      create: {
        id: '20000000-0000-0000-0000-000000000001',
        organizationId: org.id,
        name: 'Avery Dennison México',
        contactName: 'Jorge Ibáñez',
        phone: '+52 55 5010 2000',
        email: 'ventas.mexico@averydennison.com',
      },
    }),
    prisma.supplier.upsert({
      where: { id: '20000000-0000-0000-0000-000000000002' },
      update: {},
      create: {
        id: '20000000-0000-0000-0000-000000000002',
        organizationId: org.id,
        name: 'XPEL Technologies',
        contactName: 'Samantha Díaz',
        phone: '+52 81 8888 9000',
        email: 'distribucion@xpel.com.mx',
      },
    }),
  ])

  console.log('  ✓ Suppliers')

  // ─────────────────────────────────────────────
  // CUSTOMERS (org-scoped, shared across branches)
  // ─────────────────────────────────────────────

  const [customerAlejandro, customerValeria, customerRoberto] =
    await Promise.all([
      prisma.customer.upsert({
        where: { id: '30000000-0000-0000-0000-000000000001' },
        update: {},
        create: {
          id: '30000000-0000-0000-0000-000000000001',
          organizationId: org.id,
          firstName: 'Alejandro',
          lastName: 'Guerrero',
          email: 'aguerrero@gmail.com',
          phone: '+52 55 8765 4321',
          source: 'instagram',
        },
      }),
      prisma.customer.upsert({
        where: { id: '30000000-0000-0000-0000-000000000002' },
        update: {},
        create: {
          id: '30000000-0000-0000-0000-000000000002',
          organizationId: org.id,
          firstName: 'Valeria',
          lastName: 'Moreno',
          email: 'vmoreno@hotmail.com',
          phone: '+52 33 6543 2100',
          taxId: 'MOVV900312GH7',
          fiscalRegime: '605',
          zipCode: '45136',
          source: 'referral',
        },
      }),
      prisma.customer.upsert({
        where: { id: '30000000-0000-0000-0000-000000000003' },
        update: {},
        create: {
          id: '30000000-0000-0000-0000-000000000003',
          organizationId: org.id,
          firstName: 'Roberto',
          lastName: 'Salinas',
          phone: '+52 55 3344 5566',
          source: 'walk-in',
        },
      }),
    ])

  console.log('  ✓ Customers')

  // ─────────────────────────────────────────────
  // CUSTOMER ASSETS (vehicles)
  // ─────────────────────────────────────────────

  const [assetMustang, assetCivic, assetRanger] = await Promise.all([
    prisma.customerAsset.upsert({
      where: { id: '40000000-0000-0000-0000-000000000001' },
      update: {},
      create: {
        id: '40000000-0000-0000-0000-000000000001',
        customerId: customerAlejandro.id,
        brandId: null,
        assetType: 'car',
        model: 'Mustang GT',
        year: 2022,
        identifier: 'ABC-123-MX',
        color: 'Race Red',
      },
    }),
    prisma.customerAsset.upsert({
      where: { id: '40000000-0000-0000-0000-000000000002' },
      update: {},
      create: {
        id: '40000000-0000-0000-0000-000000000002',
        customerId: customerValeria.id,
        brandId: null,
        assetType: 'car',
        model: 'Civic Si',
        year: 2023,
        identifier: 'XYZ-789-GDL',
        color: 'Sonic Gray Pearl',
      },
    }),
    prisma.customerAsset.upsert({
      where: { id: '40000000-0000-0000-0000-000000000003' },
      update: {},
      create: {
        id: '40000000-0000-0000-0000-000000000003',
        customerId: customerRoberto.id,
        brandId: null,
        assetType: 'pickup',
        model: 'Ranger Raptor',
        year: 2021,
        identifier: 'QWE-456-CDMX',
        color: 'Shadow Black',
      },
    }),
  ])

  console.log('  ✓ Customer assets')

  // ─────────────────────────────────────────────
  // INVENTORY — CDMX branch
  // ─────────────────────────────────────────────

  // Base inventory records
  const [invAveryBlack, invAveryMatte, invXPEL, invWax] = await Promise.all([
    prisma.inventory.upsert({
      where: { id: '50000000-0000-0000-0000-000000000001' },
      update: {},
      create: {
        id: '50000000-0000-0000-0000-000000000001',
        branchId: branchCDMX.id,
        supplierId: supplierAvery.id,
        brandId: avery.id,
        type: 'ROLL',
        name: 'Avery Supreme Wrapping Film — Negro Gloss 1080-G10',
        unitCost: 850,
      },
    }),
    prisma.inventory.upsert({
      where: { id: '50000000-0000-0000-0000-000000000002' },
      update: {},
      create: {
        id: '50000000-0000-0000-0000-000000000002',
        branchId: branchCDMX.id,
        supplierId: supplierAvery.id,
        brandId: avery.id,
        type: 'ROLL',
        name: 'Avery Supreme Wrapping Film — Matte Black 1080-M11',
        unitCost: 880,
      },
    }),
    prisma.inventory.upsert({
      where: { id: '50000000-0000-0000-0000-000000000003' },
      update: {},
      create: {
        id: '50000000-0000-0000-0000-000000000003',
        branchId: branchCDMX.id,
        supplierId: supplierXPEL.id,
        brandId: xpel.id,
        type: 'ROLL',
        name: 'XPEL Ultimate Plus PPF — Clear 1.52m',
        unitCost: 1400,
      },
    }),
    prisma.inventory.upsert({
      where: { id: '50000000-0000-0000-0000-000000000004' },
      update: {},
      create: {
        id: '50000000-0000-0000-0000-000000000004',
        branchId: branchCDMX.id,
        supplierId: null,
        brandId: null,
        type: 'ITEM',
        name: 'Cera de acabado Gyeon Q2 Cure 100ml',
        unitCost: 320,
      },
    }),
  ])

  // Extension records (CTI)
  await Promise.all([
    prisma.materialRoll.upsert({
      where: { id: invAveryBlack.id },
      update: {},
      create: {
        id: invAveryBlack.id,
        series: 'Supreme Wrapping Film 1080',
        finish: 'Gloss',
        color: 'Negro (G10)',
        width: 1.524,
        remainingLength: 18.5,
        lotNumber: 'AW-2024-G10-0441',
      },
    }),
    prisma.materialRoll.upsert({
      where: { id: invAveryMatte.id },
      update: {},
      create: {
        id: invAveryMatte.id,
        series: 'Supreme Wrapping Film 1080',
        finish: 'Matte',
        color: 'Negro (M11)',
        width: 1.524,
        remainingLength: 22.0,
        lotNumber: 'AW-2024-M11-0219',
      },
    }),
    prisma.materialRoll.upsert({
      where: { id: invXPEL.id },
      update: {},
      create: {
        id: invXPEL.id,
        series: 'Ultimate Plus',
        finish: 'Clear',
        color: 'Transparente',
        width: 1.52,
        remainingLength: 30.0,
        lotNumber: 'XP-2024-UP-1102',
      },
    }),
    prisma.inventoryItem.upsert({
      where: { id: invWax.id },
      update: {},
      create: {
        id: invWax.id,
        sku: 'GYEON-Q2-100',
        description: 'Cera de terminado para post-instalación cerámica',
        stock: 12,
        unit: 'pza',
        lowStockAlert: 3,
      },
    }),
  ])

  console.log('  ✓ Inventory (CDMX)')

  // ─────────────────────────────────────────────
  // WORK ORDER 1 — COMPLETED (Full Wrap Mustang GT)
  // ─────────────────────────────────────────────

  const wo1 = await prisma.workOrder.upsert({
    where: { id: '60000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '60000000-0000-0000-0000-000000000001',
      branchId: branchCDMX.id,
      assetId: assetMustang.id,
      type: 'STANDARD',
      status: 'COMPLETED',
      scheduledAt: new Date('2026-04-02T09:00:00Z'),
      completedAt: new Date('2026-04-03T18:00:00Z'),
      totalAmount: 18000,
      note: 'Cliente solicitó negro gloss. Requirió desmontaje de espejos.',
    },
  })

  await Promise.all([
    // Lead technician assignment
    prisma.workOrderAssignment.upsert({
      where: {
        workOrderId_memberId: {
          workOrderId: wo1.id,
          memberId: memberRafael.id,
        },
      },
      update: {},
      create: {
        workOrderId: wo1.id,
        memberId: memberRafael.id,
        role: 'lead',
        assignedAt: new Date('2026-04-02T08:30:00Z'),
      },
    }),
    prisma.workOrderAssignment.upsert({
      where: {
        workOrderId_memberId: { workOrderId: wo1.id, memberId: memberSofia.id },
      },
      update: {},
      create: {
        workOrderId: wo1.id,
        memberId: memberSofia.id,
        role: 'assistant',
        assignedAt: new Date('2026-04-02T08:30:00Z'),
      },
    }),
  ])

  const wo1Item = await prisma.workOrderItem.upsert({
    where: { id: '61000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '61000000-0000-0000-0000-000000000001',
      workOrderId: wo1.id,
      serviceId: svcFullWrap.id,
      quantity: 1,
      unitPrice: 18000,
      discount: 0,
      subtotal: 18000,
      isBillable: true,
    },
  })

  // Inventory usage for this work order
  await prisma.inventoryUsage.upsert({
    where: { id: '62000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '62000000-0000-0000-0000-000000000001',
      workOrderId: wo1.id,
      inventoryId: invAveryBlack.id,
      quantityUsed: 14.2,
      costAtUsage: 850,
    },
  })

  // Asset checkpoints
  await Promise.all([
    prisma.assetCheckpoint.upsert({
      where: { workOrderId_type: { workOrderId: wo1.id, type: 'RECEPTION' } },
      update: {},
      create: {
        workOrderId: wo1.id,
        type: 'RECEPTION',
        mileage: 12400,
        fuelLevel: 'THREE_QUARTERS',
        generalCondition: 'GOOD',
        note: 'Pequeño raspón en guardafango trasero izquierdo. Documentado.',
        photo: ['https://storage.glossops.mx/checkpoints/wo1-reception-1.jpg'],
        recordedById: frontDesk.id,
        recordedAt: new Date('2026-04-02T09:10:00Z'),
      },
    }),
    prisma.assetCheckpoint.upsert({
      where: { workOrderId_type: { workOrderId: wo1.id, type: 'DELIVERY' } },
      update: {},
      create: {
        workOrderId: wo1.id,
        type: 'DELIVERY',
        mileage: 12400,
        fuelLevel: 'THREE_QUARTERS',
        generalCondition: 'EXCELLENT',
        note: 'Trabajo terminado. Cliente revisó y firmó conforme.',
        photo: [
          'https://storage.glossops.mx/checkpoints/wo1-delivery-1.jpg',
          'https://storage.glossops.mx/checkpoints/wo1-delivery-2.jpg',
        ],
        customerSignatureUrl:
          'https://storage.glossops.mx/signatures/wo1-delivery-sig.png',
        recordedById: frontDesk.id,
        recordedAt: new Date('2026-04-03T17:45:00Z'),
      },
    }),
  ])

  // Invoice (PAID)
  await prisma.invoice.upsert({
    where: { workOrderId: wo1.id },
    update: {},
    create: {
      branchId: branchCDMX.id,
      workOrderId: wo1.id,
      status: 'PAID',
      folio: 'A-0001',
      subtotal: 15517.24,
      taxRate: 0.16,
      taxAmount: 2482.76,
      total: 18000,
      customerName: 'Alejandro Guerrero',
      cfdiUse: 'G03',
      paymentMethod: 'PUE',
      paymentForm: '04',
      issuedAt: new Date('2026-04-03T18:30:00Z'),
    },
  })

  // Warranty generated from completed service
  await prisma.warranty.upsert({
    where: { id: '63000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '63000000-0000-0000-0000-000000000001',
      workOrderItemId: wo1Item.id,
      serviceId: svcFullWrap.id,
      description: svcFullWrap.warrantyDescription!,
      term: svcFullWrap.warrantyTerm,
      validFrom: new Date('2026-04-03'),
      validUntil: new Date('2028-04-03'),
      isVoid: false,
    },
  })

  console.log(
    '  ✓ Work order #1 — Full Wrap Mustang (COMPLETED + PAID + WARRANTY)'
  )

  // ─────────────────────────────────────────────
  // WORK ORDER 2 — IN PROGRESS (PPF Civic Si)
  // ─────────────────────────────────────────────

  const wo2 = await prisma.workOrder.upsert({
    where: { id: '60000000-0000-0000-0000-000000000002' },
    update: {},
    create: {
      id: '60000000-0000-0000-0000-000000000002',
      branchId: branchCDMX.id,
      assetId: assetCivic.id,
      type: 'STANDARD',
      status: 'IN_PROGRESS',
      scheduledAt: new Date('2026-04-13T10:00:00Z'),
      totalAmount: 22000,
      note: 'PPF completo. Cliente pide especial atención en cofre y espejo.',
    },
  })

  await prisma.workOrderAssignment.upsert({
    where: {
      workOrderId_memberId: { workOrderId: wo2.id, memberId: memberRafael.id },
    },
    update: {},
    create: {
      workOrderId: wo2.id,
      memberId: memberRafael.id,
      role: 'lead',
    },
  })

  await prisma.workOrderItem.upsert({
    where: { id: '61000000-0000-0000-0000-000000000002' },
    update: {},
    create: {
      id: '61000000-0000-0000-0000-000000000002',
      workOrderId: wo2.id,
      serviceId: svcPPF.id,
      quantity: 1,
      unitPrice: 22000,
      discount: 0,
      subtotal: 22000,
      isBillable: true,
    },
  })

  await prisma.assetCheckpoint.upsert({
    where: { workOrderId_type: { workOrderId: wo2.id, type: 'RECEPTION' } },
    update: {},
    create: {
      workOrderId: wo2.id,
      type: 'RECEPTION',
      mileage: 8100,
      fuelLevel: 'FULL',
      generalCondition: 'EXCELLENT',
      photo: ['https://storage.glossops.mx/checkpoints/wo2-reception-1.jpg'],
      recordedById: frontDesk.id,
    },
  })

  console.log('  ✓ Work order #2 — PPF Civic Si (IN PROGRESS)')

  // ─────────────────────────────────────────────
  // WORK ORDER 3 — DRAFT (Detailing Ranger Raptor)
  // ─────────────────────────────────────────────

  const wo3 = await prisma.workOrder.upsert({
    where: { id: '60000000-0000-0000-0000-000000000003' },
    update: {},
    create: {
      id: '60000000-0000-0000-0000-000000000003',
      branchId: branchCDMX.id,
      assetId: assetRanger.id,
      type: 'STANDARD',
      status: 'DRAFT',
      scheduledAt: new Date('2026-04-15T09:00:00Z'),
      totalAmount: 2200,
    },
  })

  await Promise.all([
    prisma.workOrderItem.upsert({
      where: { id: '61000000-0000-0000-0000-000000000003' },
      update: {},
      create: {
        id: '61000000-0000-0000-0000-000000000003',
        workOrderId: wo3.id,
        serviceId: svcDetailing.id,
        quantity: 1,
        unitPrice: 2200,
        discount: 0,
        subtotal: 2200,
        isBillable: true,
      },
    }),
  ])

  console.log('  ✓ Work order #3 — Detailing Ranger Raptor (DRAFT)')

  // ─────────────────────────────────────────────
  // PURCHASE ORDER
  // ─────────────────────────────────────────────

  const po1 = await prisma.purchaseOrder.upsert({
    where: { id: '70000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '70000000-0000-0000-0000-000000000001',
      branchId: branchCDMX.id,
      supplierId: supplierAvery.id,
      status: 'CONFIRMED',
      expectedAt: new Date('2026-04-20'),
      note: 'Reposición mensual de vinil negro y matte.',
    },
  })

  await Promise.all([
    prisma.purchaseOrderItem.upsert({
      where: { id: '71000000-0000-0000-0000-000000000001' },
      update: {},
      create: {
        id: '71000000-0000-0000-0000-000000000001',
        purchaseOrderId: po1.id,
        inventoryId: invAveryBlack.id,
        quantity: 25,
        unitCost: 850,
        receivedQuantity: 0,
      },
    }),
    prisma.purchaseOrderItem.upsert({
      where: { id: '71000000-0000-0000-0000-000000000002' },
      update: {},
      create: {
        id: '71000000-0000-0000-0000-000000000002',
        purchaseOrderId: po1.id,
        inventoryId: invAveryMatte.id,
        quantity: 25,
        unitCost: 880,
        receivedQuantity: 0,
      },
    }),
  ])

  console.log('  ✓ Purchase order (CONFIRMED, pendiente de recibir)')

  // ─────────────────────────────────────────────
  // ACTIVITY LOG (sample entries)
  // ─────────────────────────────────────────────

  await Promise.all([
    prisma.activityLog.upsert({
      where: { id: '80000000-0000-0000-0000-000000000001' },
      update: {},
      create: {
        id: '80000000-0000-0000-0000-000000000001',
        organizationId: org.id,
        branchId: branchCDMX.id,
        accountId: frontDesk.id,
        action: 'CREATED',
        entity: 'work_order',
        entityId: wo1.id,
        metadata: { status: 'DRAFT' },
        createdAt: new Date('2026-04-01T15:00:00Z'),
      },
    }),
    prisma.activityLog.upsert({
      where: { id: '80000000-0000-0000-0000-000000000002' },
      update: {},
      create: {
        id: '80000000-0000-0000-0000-000000000002',
        organizationId: org.id,
        branchId: branchCDMX.id,
        accountId: managerCDMX.id,
        action: 'STATUS_CHANGED',
        entity: 'work_order',
        entityId: wo1.id,
        metadata: { from: 'CONFIRMED', to: 'COMPLETED' },
        createdAt: new Date('2026-04-03T18:00:00Z'),
      },
    }),
    prisma.activityLog.upsert({
      where: { id: '80000000-0000-0000-0000-000000000003' },
      update: {},
      create: {
        id: '80000000-0000-0000-0000-000000000003',
        organizationId: org.id,
        branchId: branchCDMX.id,
        accountId: frontDesk.id,
        action: 'CREATED',
        entity: 'invoice',
        entityId: wo1.id,
        metadata: { folio: 'A-0001', total: 18000 },
        createdAt: new Date('2026-04-03T18:30:00Z'),
      },
    }),
  ])

  console.log('  ✓ Activity log')
  console.log('\nSeed complete.')
  console.log(`  Organization : ${org.name} (${org.slug})`)
  console.log(`  Branches     : ${branchCDMX.name}, ${branchGDL.name}`)
  console.log(`  Accounts     : 7 (owner, managers, technicians, front desk)`)
  console.log(`  Customers    : 3 with vehicles`)
  console.log(`  Services     : 6`)
  console.log(`  Inventory    : 3 rolls + 1 item (CDMX)`)
  console.log(`  Work orders  : 3 (completed, in_progress, draft)`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
