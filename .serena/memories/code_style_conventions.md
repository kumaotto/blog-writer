# Code Style and Conventions

## TypeScript Configuration
- Target: ES2020
- Strict mode enabled
- No unused locals/parameters
- ESLint + Prettier for formatting

## Naming Conventions
- **Services**: PascalCase with "Service" suffix (e.g., `AuthService`, `S3Service`)
- **Interfaces**: PascalCase (e.g., `ServerConfig`, `Article`, `AWSCredentials`)
- **Functions**: camelCase (e.g., `createServer`, `generateQRToken`)
- **Constants**: UPPER_SNAKE_CASE for true constants
- **Files**: PascalCase for services/classes, camelCase for utilities

## Code Organization
- Services in `server/services/` directory
- Each service has corresponding test file in `server/__tests__/`
- Type definitions in `server/types/`
- Utilities in `server/utils/`

## Testing Conventions
- Test files: `*.test.ts` or `*.spec.ts`
- Located in `__tests__` directories or `tests/` folder
- Use Jest with ts-jest preset
- Mock external dependencies (AWS SDK, filesystem, etc.)

## Import Style
- Use ES6 imports
- Group imports: external packages, then internal modules
- Use type imports when appropriate: `import type { Type } from 'module'`

## Error Handling
- Use custom error classes for different error types
- Provide specific error messages
- Implement retry logic with exponential backoff for network operations
