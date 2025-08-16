# 🔒 Deployment Guide with Private Memos

This guide explains how to deploy your blog with password-protected private memos.

## 📋 Overview

Your blog now has two types of content:
- **Public Posts**: Accessible to everyone (category: `nextjs`, `project`, etc.)
- **Private Memos**: Password-protected (category: `memo`)

## 🚀 Deployment Steps

### 1. Build Your Application

```bash
cd my-blog
npm run build
```

### 2. Set Up Password Protection

#### Option A: Using the Setup Script (Recommended)

```bash
# Run the setup script
./setup-auth.sh

# Follow the prompts to create username/password
```

#### Option B: Manual Setup

```bash
# Install htpasswd utility
# Ubuntu/Debian:
sudo apt-get install apache2-utils

# CentOS/RHEL:
sudo yum install httpd-tools

# macOS:
brew install httpd

# Create password file
htpasswd -c .htpasswd your-username
```

### 3. Configure Nginx

1. **Copy the nginx configuration**:
   ```bash
   sudo cp nginx.conf /etc/nginx/sites-available/your-blog
   ```

2. **Update the configuration**:
   - Replace `your-domain.com` with your actual domain
   - Update the `root` path to point to your built application
   - Copy the password file:
     ```bash
     sudo cp .htpasswd /etc/nginx/.htpasswd
     ```

3. **Enable the site**:
   ```bash
   sudo ln -s /etc/nginx/sites-available/your-blog /etc/nginx/sites-enabled/
   sudo nginx -t  # Test configuration
   sudo systemctl restart nginx
   ```

### 4. Deploy Your Application

Copy your built application to the web server:

```bash
# Build the application
npm run build

# Copy to server (replace with your server details)
scp -r .next user@your-server:/var/www/html/
scp -r public user@your-server:/var/www/html/
```

## 🔐 Accessing Private Memos

- **Public Blog**: `https://your-domain.com/`
- **Private Memos**: `https://your-domain.com/memos` (password required)

## 📝 Adding New Content

### Public Posts
Create markdown files in `posts/` with any category except `memo`:

```markdown
---
title: "My Public Post"
date: "2025-01-15"
category: "nextjs"
---

Your content here...
```

### Private Memos
Create markdown files in `posts/` with category `memo`:

```markdown
---
title: "My Private Memo"
date: "2025-01-15"
category: "memo"
---

Your private content here...
```

## 🔧 Alternative Solutions

### Option 1: Client-Side Password Protection
If you prefer client-side protection, you can implement a simple password check in your React components.

### Option 2: Environment-Based Protection
Use environment variables to control access:

```bash
# .env.local
NEXT_PUBLIC_ENABLE_MEMOS=false
```

### Option 3: IP Whitelist
Restrict access to specific IP addresses in nginx:

```nginx
location /memos {
    allow 192.168.1.0/24;  # Your local network
    allow 203.0.113.0/24;  # Your office network
    deny all;
    try_files $uri $uri/ /index.html;
}
```

## 🛡️ Security Considerations

1. **Use HTTPS**: Always use SSL/TLS in production
2. **Strong Passwords**: Use complex passwords for authentication
3. **Regular Updates**: Keep nginx and your application updated
4. **Backup Passwords**: Store password securely
5. **Monitor Access**: Check nginx logs for unauthorized access attempts

## 🔍 Troubleshooting

### Common Issues

1. **403 Forbidden**: Check file permissions and nginx configuration
2. **500 Internal Server Error**: Check nginx error logs
3. **Password Not Working**: Verify .htpasswd file location and format

### Useful Commands

```bash
# Check nginx status
sudo systemctl status nginx

# View nginx error logs
sudo tail -f /var/log/nginx/error.log

# Test nginx configuration
sudo nginx -t

# Reload nginx configuration
sudo systemctl reload nginx
```

## 📞 Support

If you encounter issues:
1. Check nginx error logs
2. Verify file permissions
3. Test configuration syntax
4. Ensure all dependencies are installed 