# 🔒 Security Policy

## 🛡️ Supported Versions

We actively maintain and provide security updates for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

## 🚨 Reporting Security Vulnerabilities

If you identify any security vulnerabilities or concerns within this repository, please report them promptly by emailing us at [security@wgtechlabs.com](mailto:security@wgtechlabs.com).

**Please do NOT report security vulnerabilities through public GitHub issues.**

> [!NOTE]
> As an open-source project, we don't offer monetary bug bounties. However, we provide meaningful recognition and community acknowledgment for security researchers who help improve our project.

### What to Include in Your Report

When reporting a security vulnerability, please include:

- **Description**: A clear description of the vulnerability
- **Impact**: Potential impact and severity assessment
- **Steps to Reproduce**: Detailed steps to reproduce the vulnerability
- **Environment**: Node.js version, operating system, and other relevant details
- **Proof of Concept**: If possible, include a minimal reproduction case

### Response Timeline

- **Initial Response**: Within 48 hours of receiving your report
- **Status Update**: Regular updates every 3-5 business days
- **Resolution**: We aim to resolve critical vulnerabilities within 7 days

### Recognition and Rewards

As an open-source organization, we don't currently offer monetary rewards for vulnerability reports. However, we deeply value your contributions and offer the following recognition:

- **Public Acknowledgment**: Credit in our security advisories and release notes (with your permission)
- **Hall of Fame**: Recognition in our project's security contributors section
- **Professional Reference**: LinkedIn recommendations or professional references for your security research skills

We believe in building a collaborative security community and greatly appreciate researchers who help improve our project's security posture.

## 🔐 Security Considerations

This webhook server handles sensitive operations and external requests. Key security areas include:

### HMAC Signature Verification
- All webhook requests must include valid HMAC-SHA256 signatures
- Signatures are verified against your Unthread webhook secret
- Invalid signatures are rejected immediately

### Environment Security
- Store your `UNTHREAD_WEBHOOK_SECRET` securely
- Use environment variables, never hardcode secrets
- Regularly rotate your webhook secrets

### Redis Security
- Secure your Redis instance with authentication
- Use TLS encryption for Redis connections in production
- Limit Redis access to authorized applications only

### Network Security
- Deploy behind a reverse proxy or load balancer
- Use HTTPS/TLS for all webhook endpoints
- Implement rate limiting to prevent abuse

### Input Validation
- All webhook payloads are validated before processing
- Malformed requests are rejected with appropriate error responses
- Event deduplication prevents replay attacks

## 🏭 Production Security Checklist

Before deploying to production:

- [ ] Use HTTPS/TLS for all endpoints
- [ ] Secure Redis with authentication and encryption
- [ ] Set strong, unique webhook secrets
- [ ] Implement proper logging and monitoring
- [ ] Use environment variables for all secrets
- [ ] Deploy behind a reverse proxy
- [ ] Enable rate limiting
- [ ] Regular security updates for dependencies

## 🆘 Security Support

Your efforts to help us maintain the safety and integrity of this open-source project are greatly appreciated. Thank you for contributing to a more secure community!

For general security questions or guidance, you can also reach out through:
- Email: [security@wgtechlabs.com](mailto:security@wgtechlabs.com)
- GitHub Security Advisories (for coordinated disclosure)

---

🔐 with ❤️ by [Waren Gonzaga](https://warengonzaga.com) under [WG Technology Labs](https://wgtechlabs.com) and [Him](https://www.youtube.com/watch?v=HHrxS4diLew&t=44s) 🙏
