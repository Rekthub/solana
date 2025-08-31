# Contributing to DumpFun 🤝

Thank you for your interest in contributing to DumpFun! We welcome contributions from the community and are excited to see what you'll build.

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally
3. **Follow the setup instructions** in the README
4. **Create a new branch** for your feature or fix
5. **Make your changes** and test thoroughly
6. **Submit a pull request**

## Development Setup

### Prerequisites
Make sure you have completed the [Anchor installation guide](https://www.anchor-lang.com/docs/installation) and have all required tools installed.

### Environment Setup
```bash
# Clone your fork
git clone https://github.com/AdedigbaOluwad1/dumpfun.git
cd dumpfun

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Add your test wallet private keys to .env
# WALLET_PRIVATE_KEY="your_base58_private_key"
# RECIPIENT_PRIVATE_KEY="another_test_private_key"

# Build the program
anchor build

# Run tests
anchor test
```

## How to Contribute

### 🐛 Bug Reports
- **Search existing issues** first to avoid duplicates
- **Use the bug report template** when creating new issues
- **Include detailed steps** to reproduce the problem
- **Provide relevant logs** and error messages
- **Specify your environment** (OS, Anchor version, etc.)

### 💡 Feature Requests
- **Check existing issues** and discussions first
- **Clearly describe the feature** and its use case
- **Explain why it would benefit** the DumpFun ecosystem
- **Consider backwards compatibility** implications

### 🔧 Code Contributions

#### Areas We Welcome Contributions:
- **Smart Contract Improvements**: Gas optimizations, security enhancements
- **Testing**: Additional test cases, edge case coverage
- **Documentation**: Code comments, README improvements, tutorials
- **Tooling**: Development scripts, deployment helpers
- **Frontend Examples**: Integration examples, UI components
- **Analytics**: Event parsing, data visualization tools

#### Coding Standards
- **Follow Rust conventions** and use `cargo fmt`
- **Add comprehensive tests** for new functionality
- **Document public functions** with clear comments
- **Handle errors gracefully** with appropriate error types
- **Use meaningful variable names** and clear logic flow

#### Smart Contract Guidelines
- **Security First**: All changes must maintain or improve security
- **Gas Efficiency**: Consider transaction costs in design decisions
- **Backwards Compatibility**: Avoid breaking existing integrations
- **Event Emission**: Emit appropriate events for off-chain tracking
- **Mathematical Precision**: Use safe math operations, avoid overflows

### 📝 Documentation Contributions
- **Improve clarity** of existing documentation
- **Add code examples** and tutorials
- **Fix typos** and formatting issues
- **Translate documentation** to other languages
- **Create integration guides** for different frameworks

## Pull Request Process

### Before Submitting
1. **Run all tests** and ensure they pass
2. **Run code formatting**: `cargo fmt`
3. **Run linting**: `cargo clippy`
4. **Update documentation** if needed
5. **Add tests** for new functionality

### PR Guidelines
- **One feature per PR** - keep changes focused
- **Write clear commit messages** following conventional commits
- **Provide detailed description** of changes
- **Reference related issues** using keywords (fixes #123)
- **Include breaking change notes** if applicable

### PR Template
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Testing
- [ ] Tests pass locally
- [ ] Added tests for new functionality
- [ ] Manual testing completed

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No new warnings introduced
```

## Code Review Process

1. **Automated checks** must pass (tests, linting, building)
2. **Maintainer review** for code quality and design
3. **Security review** for smart contract changes
4. **Documentation review** for clarity and accuracy
5. **Final approval** and merge

## Smart Contract Security

### Security Considerations
When contributing to smart contract code:
- **Audit mathematical operations** for overflow/underflow
- **Validate all inputs** and account constraints
- **Test edge cases** thoroughly
- **Consider economic attacks** and MEV implications
- **Follow Solana best practices** for account validation

### Reporting Security Issues
**DO NOT** open public issues for security vulnerabilities. Please see our [SECURITY.md](SECURITY.md) for responsible disclosure guidelines.

## Community Guidelines

### Be Respectful
- **Use welcoming language** and be patient with newcomers
- **Provide constructive feedback** and helpful suggestions
- **Respect different perspectives** and experience levels
- **Focus on the code/idea**, not the person

### Communication Channels
- **GitHub Issues**: Bug reports, feature requests
- **GitHub Discussions**: General questions, ideas, community chat
- **Pull Requests**: Code contributions and reviews

## Recognition

All contributors will be recognized in our project. We value every contribution, whether it's:
- Code improvements
- Documentation updates  
- Bug reports
- Testing
- Community support

## Questions?

If you have questions about contributing:
- **Check existing issues** and discussions
- **Read the README** and documentation
- **Ask in GitHub Discussions** for general questions
- **Open an issue** for specific problems

We're here to help and excited to work with you!

---

**Happy coding! 🚀**