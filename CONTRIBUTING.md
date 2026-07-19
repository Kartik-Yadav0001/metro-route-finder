# Contributing to Metro Route Finder

Thank you for your interest in contributing to the Metro Route Finder project! This document provides guidelines for contributing.

## Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Focus on what is best for the community
- Show empathy towards other community members

## How to Contribute

### Reporting Bugs

Before creating bug reports, please check the existing issues to avoid duplicates. When creating a bug report:

- Use a clear and descriptive title
- Provide steps to reproduce the issue
- Include expected and actual behavior
- Add screenshots if applicable
- Specify your environment (OS, browser, etc.)

### Suggesting Enhancements

Enhancement suggestions are welcome! Please:

- Use a clear and descriptive title
- Provide a detailed description of the enhancement
- Explain why this enhancement would be useful
- Provide examples of how the enhancement would be used

### Pull Requests

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Follow the coding standards (see below)
5. Commit your changes (`git commit -m 'Add some amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## Coding Standards

### C++ Backend

- Follow C++17 standards
- Use `const` and `noexcept` where appropriate
- Use `const&` for passing strings and large objects
- Add meaningful comments for complex logic
- Follow existing naming conventions (camelCase for functions, PascalCase for classes)

### React Frontend

- Use functional components with hooks
- Follow React best practices
- Use meaningful component and variable names
- Add PropTypes or TypeScript for type safety
- Keep components focused and small (<300 lines preferred)

### General

- Write clear, self-documenting code
- Add comments for non-obvious logic
- Follow existing code style
- Test your changes before submitting

## Development Setup

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Backend (C++)

```bash
cd backend
cmake -S . -B build
cmake --build build
./build/MetroRouteFinder  # or .exe on Windows
```

### API (Node.js)

```bash
cd api
npm install
npm start
```

## Testing

- Write unit tests for new features
- Test on multiple browsers (Chrome, Firefox, Safari, Edge)
- Test on different screen sizes (responsive design)
- Ensure all existing tests pass before submitting

## Documentation

- Update README if you change functionality
- Add comments to complex code
- Update API documentation if you add endpoints
- Include examples in documentation

## Project Structure

```
DSA Project/
├── backend/          # C++ route engine
├── frontend/         # React application
├── api/             # Node.js REST API
├── database/        # JSON datasets
├── docs/           # Documentation
└── tests/          # Test files
```

## Questions?

If you have questions, please open an issue with the "question" label.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
