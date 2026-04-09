# 🚗 GlossOps

GlossOps is an operations platform built for wrap, detailing, and automotive restyling shops. It centralizes customers, vehicles, work orders, inventory, and day-to-day shop operations in one place — helping teams stay organized, reduce operational chaos, and maintain better control over materials, jobs, and deliveries.

The platform is designed for vinyl wrap shops, detailing studios, PPF installers, tint shops, ceramic coating specialists, and other automotive appearance or customization businesses. Instead of relying on WhatsApp, spreadsheets, and manual follow-ups, GlossOps provides a structured operational workflow tailored to this vertical.

![Status](https://img.shields.io/badge/status-in_development-yellow)
![License](https://img.shields.io/badge/license-MIT-blue)
![Build](https://github.com/BetoNajera/GlossOps/actions/workflows/ci.yml/badge.svg)

---

## 📋 Table of Contents

- [🚗 GlossOps](#-glossops)
- [📸 Screenshots](#-screenshots)
- [✨ Current Scope](#-current-scope)
- [🗃️ Main Entities](#️-main-entities)
- [🛠️ Technologies](#️-technologies)
- [🚀 Getting Started](#-getting-started)
- [📁 Project Structure](#-project-structure)
- [📜 Available Scripts](#-available-scripts)
- [🔌 API Documentation](#-api-documentation)
- [🤝 Contributing](#-contributing)
- [🗺️ Vision](#️-vision)
- [🗄️ Database](#️-database)
- [📄 License](#-license)

---

## 📸 Screenshots

> 🚧 Screenshots and demo coming soon as the MVP is built out.

---

## ✨ Current Scope

GlossOps is being built as a multi-tenant SaaS application focused on the core operational workflows of automotive wrap and detailing businesses.

The initial version will focus on the MVP, which includes the following capabilities:

### MVP Features

- 👥 Customer management
- 🚙 Vehicle management
- 🛎️ Service catalog
- 📋 Work order management
- 📦 General inventory tracking
- 🎞️ Specialized wrap roll inventory
- 📊 Material usage tracking per job
- 🖥️ Operational dashboard
- 🏢 Organization and role-based access control

### Feature Breakdown

#### 👥 Customer Management
- Create and manage customer records
- Store contact information
- Keep notes and job history

#### 🚙 Vehicle Management
- Register vehicles linked to customers
- Track make, model, year, color, VIN, and license plate
- Store notes and optional photos

#### 🛎️ Service Catalog
- Define standard services such as:
  - Full wrap
  - Partial wrap
  - Exterior detailing
  - Interior detailing
  - Ceramic coating
  - PPF
  - Window tint
  - Custom services
- Configure service category, estimated duration, and base price

#### 📋 Work Orders
- Create and manage work orders
- Link customers and vehicles to each job
- Add one or multiple services to a work order
- Track scheduling, status, assigned technician, notes, and photos
- Support work order statuses such as:
  - Draft
  - Scheduled
  - In Progress
  - Waiting for Material
  - Ready for Delivery
  - Delivered
  - Cancelled

#### 📦 General Inventory
- Manage consumables and shop materials such as:
  - Chemicals
  - Coatings
  - Applicators
  - Microfibers
  - Tools
  - Blades
  - Other shop supplies
- Track stock levels, minimum stock thresholds, unit type, and supplier information

#### 🎞️ Wrap Roll Inventory
- Track wrap-specific materials with domain-specific fields such as:
  - Brand
  - Series / line
  - Color
  - Finish
  - Width
  - Initial length
  - Remaining length
  - Lot number
  - Supplier
  - Roll cost
- Monitor material availability and low-stock conditions

#### 📊 Material Usage Tracking
- Record materials consumed per work order
- Associate wrap roll usage with jobs
- Track estimated or actual usage
- Register waste or leftover notes when needed

#### 🖥️ Operational Dashboard
- View active work orders
- Track jobs scheduled for today
- Monitor recently delivered work
- Surface low-stock inventory alerts
- Highlight wrap rolls with low remaining material
- Show estimated revenue from open jobs

#### 🏢 Multi-Tenant Organization Support
- Support multiple organizations (shops) within the platform
- Isolate data by organization
- Invite team members
- Manage roles and permissions

### 👤 Roles

The initial MVP includes the following user roles:

| Role | Description |
|---|---|
| **Owner** | Full access to all features and settings |
| **Manager** | Manages operations, staff, and inventory |
| **Technician** | Views and updates assigned work orders |
| **Front Desk** | Handles customers, vehicles, and work order intake |

---

## 🗃️ Main Entities

The current domain model is centered around the following core entities:

- **User**
- **Organization**
- **OrganizationMember**
- **Customer**
- **Vehicle**
- **Service**
- **WorkOrder**
- **WorkOrderItem**
- **InventoryItem**
- **WrapRoll**
- **InventoryUsage**
- **Supplier**
- **ActivityLog**

### Core Relationships

- An **Organization** represents a shop and acts as the tenant boundary
- A **User** can belong to one or more organizations through **OrganizationMember**
- A **Customer** can own one or more **Vehicles**
- A **Vehicle** can have many **WorkOrders**
- A **WorkOrder** can include multiple **WorkOrderItems**
- A **WorkOrder** can consume one or more **InventoryItems** or **WrapRolls**
- **InventoryUsage** records the materials used for each work order
- **ActivityLog** keeps a timeline of important operational events

---

## 🛠️ Technologies

### Frontend
- **Next.js**
- **TypeScript**
- **Tailwind CSS**
- **TanStack Query**
- **React Hook Form**
- **Zod**

### Backend
- **NestJS**
- **TypeScript**
- **PostgreSQL**
- **Prisma ORM**
- **Redis**

### 🔐 Authentication & Authorization
- **JWT**
- Role-based access control (RBAC)

### ⚙️ Infrastructure & DevOps
- **Docker**
- **GitHub Actions**

### 🔮 Future Integrations
- **Stripe** for subscriptions and billing
- **AWS** for cloud infrastructure
- **Terraform** for infrastructure as code

---

## 🚀 Getting Started

### Prerequisites

Make sure you have the following installed:

- [Node.js](https://nodejs.org/) v20+
- [Docker](https://www.docker.com/) & Docker Compose
- [pnpm](https://pnpm.io/) (or npm/yarn)

### Installation

1. **Clone the repository**

```bash
git clone https://github.com/BetoNajera/GlossOps.git
cd GlossOps
```

2. **Install dependencies**

```bash
pnpm install
```

3. **Set up environment variables**

```bash
cp .env.example .env
```

Then fill in the required values in `.env`.

4. **Start the services with Docker**

```bash
docker compose up -d
```

5. **Run database migrations**

```bash
pnpm db:migrate
```

6. **Start the development server**

```bash
pnpm dev
```

The app should now be running at `http://localhost:3000` and the API at `http://localhost:4000`.

---

## 📁 Project Structure

```
glossops/
├── apps/
│   ├── web/              # Next.js frontend
│   └── api/              # NestJS backend
├── packages/
│   ├── database/         # Prisma schema and migrations
│   └── shared/           # Shared types and utilities
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## 📜 Available Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Start all apps in development mode |
| `pnpm build` | Build all apps for production |
| `pnpm test` | Run all tests |
| `pnpm lint` | Run linter across the project |
| `pnpm db:migrate` | Run Prisma database migrations |
| `pnpm db:studio` | Open Prisma Studio |
| `pnpm db:seed` | Seed the database with sample data |

---

## 🔌 API Documentation

Once the API is running locally, Swagger docs are available at:

```
http://localhost:4000/docs
```

> 📬 A Postman collection will be published as the API matures.

---

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

### Branch Naming

```
feature/short-description
fix/short-description
chore/short-description
```

### Commit Convention

This project follows [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add wrap roll inventory module
fix: correct stock calculation on usage tracking
chore: update dependencies
```

### Pull Request Process

1. Fork the repository and create your branch from `master`
2. Make your changes and ensure tests pass
3. Open a PR with a clear title and description
4. Wait for review and address any feedback

---

## 🗺️ Vision

GlossOps is intended to become a purpose-built operational system for automotive wrap, detailing, and restyling businesses. The long-term vision is to provide a modern, vertical SaaS product that helps shops run with more structure, better visibility, and stronger operational control.

---

## 🗄️ Database

```mermaid
erDiagram
    ORGANIZATION {
        string id PK
        string name
        string slug
        string email
        string phone
        string timezone
        string createdAt
        string updatedAt
    }

    USER {
        string id PK
        string firstName
        string lastName
        string email
        string passwordHash
        string status
        string createdAt
        string updatedAt
    }

    ORGANIZATION_MEMBER {
        string id PK
        string organizationId FK
        string userId FK
        string role
        string status
        string joinedAt
        string createdAt
        string updatedAt
    }

    CUSTOMER {
        string id PK
        string organizationId FK
        string firstName
        string lastName
        string phone
        string email
        string notes
        string createdAt
        string updatedAt
    }

    VEHICLE {
        string id PK
        string organizationId FK
        string customerId FK
        string make
        string model
        int year
        string color
        string vin
        string licensePlate
        string notes
        string createdAt
        string updatedAt
    }

    SERVICE {
        string id PK
        string organizationId FK
        string name
        string category
        string description
        decimal basePrice
        int estimatedDurationMinutes
        boolean isActive
        string createdAt
        string updatedAt
    }

    WORK_ORDER {
        string id PK
        string organizationId FK
        string customerId FK
        string vehicleId FK
        string assignedTechnicianId FK
        string status
        date scheduledDate
        decimal estimatedTotal
        decimal finalTotal
        string customerNotes
        string internalNotes
        string createdAt
        string updatedAt
    }

    WORK_ORDER_ITEM {
        string id PK
        string workOrderId FK
        string serviceId FK
        string name
        int quantity
        decimal unitPrice
        decimal totalPrice
        string notes
        string createdAt
        string updatedAt
    }

    INVENTORY_ITEM {
        string id PK
        string organizationId FK
        string supplierId FK
        string name
        string category
        string unit
        decimal stockQuantity
        decimal minimumStock
        decimal unitCost
        boolean isActive
        string createdAt
        string updatedAt
    }

    WRAP_ROLL {
        string id PK
        string organizationId FK
        string supplierId FK
        string brand
        string series
        string color
        string finish
        decimal width
        decimal initialLength
        decimal remainingLength
        string lotNumber
        decimal rollCost
        string status
        string createdAt
        string updatedAt
    }

    INVENTORY_USAGE {
        string id PK
        string organizationId FK
        string workOrderId FK
        string inventoryItemId FK
        string wrapRollId FK
        decimal quantityUsed
        string unit
        string usageType
        string notes
        string createdAt
        string updatedAt
    }

    SUPPLIER {
        string id PK
        string organizationId FK
        string name
        string contactName
        string email
        string phone
        string notes
        string createdAt
        string updatedAt
    }

    ACTIVITY_LOG {
        string id PK
        string organizationId FK
        string actorUserId FK
        string entityType
        string entityId
        string action
        string metadata
        string createdAt
    }

    ORGANIZATION ||--o{ ORGANIZATION_MEMBER : has
    USER ||--o{ ORGANIZATION_MEMBER : belongs_to

    ORGANIZATION ||--o{ CUSTOMER : has
    ORGANIZATION ||--o{ VEHICLE : has
    ORGANIZATION ||--o{ SERVICE : has
    ORGANIZATION ||--o{ WORK_ORDER : has
    ORGANIZATION ||--o{ INVENTORY_ITEM : has
    ORGANIZATION ||--o{ WRAP_ROLL : has
    ORGANIZATION ||--o{ SUPPLIER : has
    ORGANIZATION ||--o{ INVENTORY_USAGE : has
    ORGANIZATION ||--o{ ACTIVITY_LOG : has

    CUSTOMER ||--o{ VEHICLE : owns
    CUSTOMER ||--o{ WORK_ORDER : requests

    VEHICLE ||--o{ WORK_ORDER : assigned_to

    USER ||--o{ WORK_ORDER : assigned_as_technician
    USER ||--o{ ACTIVITY_LOG : performs

    WORK_ORDER ||--o{ WORK_ORDER_ITEM : contains
    SERVICE ||--o{ WORK_ORDER_ITEM : referenced_by

    WORK_ORDER ||--o{ INVENTORY_USAGE : consumes
    INVENTORY_ITEM ||--o{ INVENTORY_USAGE : used_as
    WRAP_ROLL ||--o{ INVENTORY_USAGE : used_as

    SUPPLIER ||--o{ INVENTORY_ITEM : provides
    SUPPLIER ||--o{ WRAP_ROLL : provides
```

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
