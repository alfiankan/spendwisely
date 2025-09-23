# Testing Guide for Alfi Finance Svelte

This document provides information about the testing setup and how to run tests for the expense input functionality.

## Test Setup

The project uses the following testing tools:

- **Vitest**: Fast unit test framework
- **@testing-library/svelte**: Testing utilities for Svelte components
- **@testing-library/user-event**: User interaction simulation
- **jsdom**: DOM environment for testing
- **@testing-library/jest-dom**: Custom matchers for DOM testing

## Test Structure

```
src/
├── __tests__/
│   └── integration/
│       └── ExpenseCreation.test.ts          # Integration tests
├── lib/
│   ├── models/
│   │   └── __tests__/
│   │       └── FileModel.test.ts            # File model tests
│   └── presenters/
│       └── __tests__/
│           └── ExpensePresenter.test.ts     # Presenter logic tests
├── routes/
│   └── new-expenses/
│       └── __tests__/
│           └── NewExpenseForm.test.ts       # Component tests
└── test/
    └── setup.ts                             # Test setup and mocks
```

## Running Tests

### All Tests
```bash
pnpm test
```

### Run Tests Once (CI mode)
```bash
pnpm test:run
```

### Run Tests with UI
```bash
pnpm test:ui
```

### Run Tests with Coverage
```bash
pnpm test:coverage
```

### Run Specific Test Files
```bash
# Run only presenter tests
pnpm test src/lib/presenters/__tests__/

# Run only component tests
pnpm test src/routes/new-expenses/__tests__/

# Run only integration tests
pnpm test src/__tests__/integration/
```

## Test Categories

### 1. Unit Tests - ExpensePresenter
Tests the business logic and validation:
- Form validation (required fields, data types)
- File size validation
- Currency formatting
- Attachment parsing
- Expense creation logic

### 2. Unit Tests - FileModel
Tests file handling functionality:
- File upload (single and multiple)
- File deletion
- File type validation
- File size formatting
- Error handling

### 3. Component Tests - NewExpenseForm
Tests the Svelte component behavior:
- Form rendering and initial state
- User interactions (typing, selecting, uploading)
- Form submission
- Loading states
- Error display
- File upload UI

### 4. Integration Tests - ExpenseCreation
Tests the complete user flow:
- Full expense creation with files
- Expense creation without files
- Error handling scenarios
- File validation and removal
- Different categories and labels

## Test Coverage

The tests cover:

✅ **Form Validation**
- Required field validation
- Data type validation
- File size limits
- File type restrictions

✅ **User Interactions**
- Form input handling
- File upload and removal
- Form submission
- Loading states

✅ **Business Logic**
- Expense creation
- File upload processing
- Data formatting
- Error handling

✅ **Integration Scenarios**
- Complete expense creation flow
- Error recovery
- Edge cases

## Writing New Tests

### Component Test Example
```typescript
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import MyComponent from './MyComponent.svelte';

describe('MyComponent', () => {
  it('should handle user input', async () => {
    const user = userEvent.setup();
    render(MyComponent);
    
    const input = screen.getByLabelText('Input');
    await user.type(input, 'test value');
    
    expect(input.value).toBe('test value');
  });
});
```

### Model Test Example
```typescript
import { describe, it, expect, vi } from 'vitest';
import { MyModel } from '../MyModel';

describe('MyModel', () => {
  it('should validate data correctly', () => {
    const model = new MyModel();
    const result = model.validateData({ field: 'value' });
    
    expect(result).toBe(true);
  });
});
```

## Mocking

The tests use Vitest's mocking capabilities:

- **Models**: Mocked to avoid database dependencies
- **External APIs**: Mocked fetch calls
- **File System**: Mocked File and FileList constructors
- **Browser APIs**: Mocked window.alert, location.reload

## Continuous Integration

The test suite is designed to run in CI environments:

- All tests run in `--run` mode (no watch)
- Coverage reports are generated
- Tests are isolated and don't depend on external services
- Mock data is used for all external dependencies

## Debugging Tests

### Run Tests in Debug Mode
```bash
pnpm test --reporter=verbose
```

### Run Single Test File
```bash
pnpm test src/lib/presenters/__tests__/ExpensePresenter.test.ts
```

### Run Tests Matching Pattern
```bash
pnpm test --grep "validation"
```

## Best Practices

1. **Test Behavior, Not Implementation**: Focus on what the user sees and does
2. **Use Descriptive Test Names**: Make it clear what each test verifies
3. **Arrange-Act-Assert**: Structure tests clearly
4. **Mock External Dependencies**: Keep tests fast and reliable
5. **Test Edge Cases**: Include error scenarios and boundary conditions
6. **Keep Tests Independent**: Each test should be able to run in isolation

## Troubleshooting

### Common Issues

1. **Tests not finding modules**: Check import paths and file extensions
2. **Mock not working**: Ensure mocks are set up before imports
3. **Async test failures**: Use `waitFor` for async operations
4. **DOM not available**: Check jsdom setup in vitest.config.ts

### Getting Help

- Check the [Vitest documentation](https://vitest.dev/)
- Review [Testing Library docs](https://testing-library.com/docs/svelte-testing-library/intro/)
- Look at existing test files for examples

