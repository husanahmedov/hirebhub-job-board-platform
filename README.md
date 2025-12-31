<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

<h1 align="center">🚀 HireHub</h1>

<p align="center">
  <strong>A modern job recruitment platform built with NestJS and GraphQL</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/NestJS-10.x-E0234E?style=for-the-badge&logo=nestjs&logoColor=white" alt="NestJS" />
  <img src="https://img.shields.io/badge/GraphQL-16.x-E10098?style=for-the-badge&logo=graphql&logoColor=white" alt="GraphQL" />
  <img src="https://img.shields.io/badge/MongoDB-8.x-47A248?style=for-the-badge&logo=mongodb&logoColor=white" alt="MongoDB" />
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/license-UNLICENSED-red?style=flat-square" alt="License" />
  <img src="https://img.shields.io/badge/version-0.0.1-blue?style=flat-square" alt="Version" />
</p>

---

## 📖 Table of Contents

- [About](#-about)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Development](#-development)
- [Testing](#-testing)
- [Documentation](#-documentation)
- [Contributing](#-contributing)

---

## 🎯 About

**HireHub** is a comprehensive job recruitment platform that connects job seekers with employers. Built with modern technologies and best practices, it provides a robust GraphQL API for managing users, companies, jobs, applications, and more.

### Key Highlights

✨ **GraphQL API** - Type-safe, efficient data fetching with Apollo Server  
🔐 **Authentication** - JWT-based authentication system  
📊 **Real-time Updates** - WebSocket support for notifications  
🎨 **Clean Architecture** - Modular design with clear separation of concerns  
🛡️ **Error Handling** - Custom exception system with detailed error responses  
📝 **Logging** - Beautiful, color-coded logging with context  
✅ **Validation** - Two-layer validation (GraphQL schema + class-validator)  
🧪 **Testing** - Unit and E2E test support

---

## ✨ Features

### 👤 User Management

- User registration and authentication
- Profile management (education, experience, skills)
- Role-based access control (Job Seeker, Recruiter, Admin)
- OAuth integration support

### 🏢 Company Management

- Company profiles and information
- Company reviews and ratings
- Job listings per company

### 💼 Job Management

- Job posting and listing
- Advanced job search and filtering
- Job bookmarking
- Application tracking

### 📄 Application System

- Job application submission
- Application status tracking
- Resume management
- Notification system

### 🔔 Notifications

- Real-time notifications
- Email notifications
- Push notifications
- Customizable notification preferences

---

## 🛠️ Tech Stack

### Core Framework

- **NestJS** `v10.x` - Progressive Node.js framework
- **TypeScript** `v5.x` - Type-safe JavaScript
- **Node.js** - Runtime environment

### API Layer

- **GraphQL** `v16.x` - Query language for APIs
- **Apollo Server** `v4.x` - GraphQL server implementation
- **class-validator** - DTO validation decorators
- **class-transformer** - Object transformation

### Database

- **MongoDB** `v8.x` - NoSQL database
- **Mongoose** `v8.x` - MongoDB ODM

### Authentication & Security

- **JWT** - JSON Web Tokens for authentication
- **bcryptjs** - Password hashing

### Utilities

- **chalk** `v5.x` - Terminal string styling (logging)
- **moment** - Date/time manipulation
- **RxJS** `v7.x` - Reactive programming

### Development Tools

- **ESLint** - Code linting
- **Prettier** - Code formatting
- **Jest** - Testing framework

---

## 📁 Project Structure

```
hire-hub/
├── apps/
│   ├── hire-hub/                    # Main GraphQL API application
│   │   ├── src/
│   │   │   ├── main.ts             # Application entry point
│   │   │   ├── app.module.ts       # Root module
│   │   │   ├── components/         # Feature modules
│   │   │   │   ├── user/           # User management
│   │   │   │   ├── company/        # Company management
│   │   │   │   ├── job/            # Job management
│   │   │   │   ├── application/    # Application system
│   │   │   │   ├── resume/         # Resume management
│   │   │   │   ├── notification/   # Notifications
│   │   │   │   ├── bookmark/       # Job bookmarks
│   │   │   │   └── company-review/ # Company reviews
│   │   │   ├── libs/               # Shared utilities
│   │   │   │   ├── dto/            # Data Transfer Objects
│   │   │   │   ├── enums/          # Enumerations
│   │   │   │   ├── exceptions/     # Custom exceptions
│   │   │   │   ├── filters/        # Exception filters
│   │   │   │   ├── interfaces/     # TypeScript interfaces
│   │   │   │   └── types/          # TypeScript types
│   │   │   ├── schemas/            # Mongoose schemas
│   │   │   └── database/           # Database configuration
│   │   └── docs/                   # Documentation
│   │       ├── PROJECT_STANDARDS.md
│   │       ├── VALIDATION_ERROR_HANDLING.md
│   │       ├── ERROR_HANDLING_QUICK_REF.md
│   │       └── GRAPHQL_EXCEPTION_MIGRATION.md
│   └── hirehub-batch/              # Batch processing service
├── package.json
├── tsconfig.json
└── nest-cli.json
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** `>= 18.x`
- **npm** `>= 9.x`
- **MongoDB** `>= 6.x`

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd hire-hub
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure environment variables**

   Create a `.env` file in the root directory:

   ```env
   # Application
   HIREHUB_PORT=3000
   NODE_ENV=development

   # Database
   MONGO_URI=mongodb://localhost:27017/hirehub

   # CORS
   CORS_ORIGIN=http://localhost:3001

   # JWT (if applicable)
   JWT_SECRET=your-secret-key
   JWT_EXPIRATION=7d
   ```

4. **Start MongoDB**

   ```bash
   # Using Docker
   docker run -d -p 27017:27017 --name mongodb mongo:latest

   # Or using local MongoDB
   mongod
   ```

5. **Run the application**

   ```bash
   npm run start:dev
   ```

6. **Access GraphQL Playground**

   Open your browser and navigate to:

   ```
   http://localhost:3000/graphql
   ```

---

## 💻 Development

### Available Scripts

```bash
# Development
npm run start:dev          # Start in watch mode
npm run start:debug        # Start in debug mode

# Production
npm run build              # Build the application
npm run start:prod         # Start production server

# Code Quality
npm run format             # Format code with Prettier
npm run lint               # Lint and fix code with ESLint

# Testing
npm run test               # Run unit tests
npm run test:watch         # Run tests in watch mode
npm run test:cov           # Generate test coverage
npm run test:e2e           # Run end-to-end tests
```

### Development Workflow

1. **Start the development server**

   ```bash
   npm run start:dev
   ```

2. **The server will be available at:**
   - GraphQL API: `http://localhost:3000/graphql`
   - GraphQL Playground: `http://localhost:3000/graphql` (interactive UI)

3. **Example GraphQL Query**

   ```graphql
   query {
   	hello
   }
   ```

4. **Example GraphQL Mutation**
   ```graphql
   mutation {
   	registerUser(
   		input: {
   			email: "user@example.com"
   			passwordHash: "SecurePass123"
   			firstName: "John"
   			lastName: "Doe"
   			role: "JOB_SEEKER"
   		}
   	) {
   		id
   		email
   		firstName
   		lastName
   	}
   }
   ```

---

## 🧪 Testing

### Run Tests

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov

# Watch mode
npm run test:watch
```

### Test Structure

```
apps/hire-hub/
└── test/
    ├── app.e2e-spec.ts      # E2E tests
    └── jest-e2e.json         # E2E Jest configuration
```

---

## 📚 Documentation

Comprehensive documentation is available in the `apps/hire-hub/docs/` directory:

| Document                                                                                   | Description                                                           |
| ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------- |
| 📘 [**PROJECT_STANDARDS.md**](apps/hire-hub/docs/PROJECT_STANDARDS.md)                     | Complete guide to project architecture, standards, and best practices |
| 🛡️ [**VALIDATION_ERROR_HANDLING.md**](apps/hire-hub/docs/VALIDATION_ERROR_HANDLING.md)     | Two-layer validation system (GraphQL schema + class-validator)        |
| ⚠️ [**ERROR_HANDLING_QUICK_REF.md**](apps/hire-hub/docs/ERROR_HANDLING_QUICK_REF.md)       | Quick reference for custom exception handling                         |
| 🔄 [**GRAPHQL_EXCEPTION_MIGRATION.md**](apps/hire-hub/docs/GRAPHQL_EXCEPTION_MIGRATION.md) | Migration guide for GraphQL exceptions                                |
| 📖 [**APP_MODULE_EXPLAINED.md**](apps/hire-hub/docs/APP_MODULE_EXPLAINED.md)               | Deep dive into NestJS module architecture                             |

### Key Concepts

#### 🔹 Error Handling

- Custom exception classes extending `BaseGraphQLException`
- Two-layer validation (schema + business logic)
- Consistent error response format
- Detailed error logging

#### 🔹 Logging System

- Beautiful color-coded console output using `chalk`
- Multiple log levels (success, error, info, warning, debug)
- Context-aware logging
- Timestamps on all logs

#### 🔹 Component Architecture

- **Module** - Dependency injection container
- **Resolver** - GraphQL endpoint handler
- **Service** - Business logic layer
- **Schema** - Mongoose data model

---

## 🤝 Contributing

We welcome contributions! Here's how you can help:

### Development Guidelines

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Follow the project standards** (see [PROJECT_STANDARDS.md](apps/hire-hub/docs/PROJECT_STANDARDS.md))
4. **Write tests** for new features
5. **Run linting and tests**
   ```bash
   npm run lint
   npm run test
   ```
6. **Commit your changes**
   ```bash
   git commit -m "feat: add amazing feature"
   ```
7. **Push to your fork**
   ```bash
   git push origin feature/amazing-feature
   ```
8. **Open a Pull Request**

### Code Style

- Follow TypeScript best practices
- Use `camelCase` for variables and functions
- Use `PascalCase` for classes and types
- Add JSDoc comments for complex functions
- Keep functions small and focused
- Write descriptive commit messages

---

## 📝 License

This project is **UNLICENSED** - Private/Proprietary Software.

---

## 👥 Team

Built with ❤️ by the HireHub Development Team

---

## 🔗 Additional Resources

### NestJS Resources

- [NestJS Documentation](https://docs.nestjs.com)
- [NestJS Discord](https://discord.gg/G7Qnnhy)
- [NestJS Courses](https://courses.nestjs.com/)

### GraphQL Resources

- [GraphQL Documentation](https://graphql.org/)
- [Apollo Server Documentation](https://www.apollographql.com/docs/apollo-server/)

### MongoDB Resources

- [MongoDB Documentation](https://docs.mongodb.com/)
- [Mongoose Documentation](https://mongoosejs.com/)

---

<p align="center">
  Made with 🚀 NestJS • 🎯 GraphQL • 🍃 MongoDB
</p>
