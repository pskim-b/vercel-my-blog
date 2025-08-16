#!/bin/bash

# Script to set up password authentication for private memos
# This creates a .htpasswd file for nginx basic auth

echo "🔒 Setting up password protection for private memos..."
echo ""

# Check if htpasswd is available
if ! command -v htpasswd &> /dev/null; then
    echo "❌ htpasswd command not found. Please install apache2-utils:"
    echo "   Ubuntu/Debian: sudo apt-get install apache2-utils"
    echo "   CentOS/RHEL: sudo yum install httpd-tools"
    echo "   macOS: brew install httpd"
    exit 1
fi

# Create .htpasswd file
echo "Enter username for private memos access:"
read username

echo "Enter password:"
htpasswd -c .htpasswd $username

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Password file created successfully!"
    echo ""
    echo "📋 Next steps:"
    echo "1. Copy .htpasswd to your server:"
    echo "   sudo cp .htpasswd /etc/nginx/.htpasswd"
    echo ""
    echo "2. Update nginx.conf with your domain name"
    echo ""
    echo "3. Restart nginx:"
    echo "   sudo systemctl restart nginx"
    echo ""
    echo "🔐 Your private memos will now be accessible at:"
    echo "   https://your-domain.com/memos"
    echo "   (with the username/password you just created)"
else
    echo "❌ Failed to create password file"
    exit 1
fi 