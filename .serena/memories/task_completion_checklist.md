# Task Completion Checklist

When completing a task, follow these steps:

## 1. Code Implementation
- Write the implementation code
- Follow TypeScript strict mode requirements
- Use proper error handling

## 2. Testing (if required by task)
- Write or update tests in `server/__tests__/` or `tests/`
- Run tests: `npm test`
- Ensure all tests pass

## 3. Code Quality
- Run linter: `npm run lint`
- Fix any linting errors
- Run formatter: `npm run format`

## 4. Verification
- Check TypeScript compilation: `npm run build:server` or `npm run build:client`
- Verify no type errors
- Test the functionality manually if applicable

## 5. Documentation
- Update comments if needed
- Ensure code is self-documenting with clear variable/function names

## Notes
- Tests are often marked as optional (*) in task lists - focus on core functionality first
- Use existing test patterns from `server/__tests__/` as reference
- Mock external dependencies (AWS SDK, keytar, filesystem) in tests
