# My Blog

A modern, fast blog built with Next.js 15, featuring markdown support and a clean, responsive design.

##  Project Overview

This is a personal blog application built with the latest web technologies, designed for writing and sharing content with a focus on performance and developer experience.

### ✨ Features
- **Fast & Modern**: Built with Next.js 15 and React 19
- **Markdown Support**: Write posts in markdown with syntax highlighting
- **Responsive Design**: Clean, mobile-friendly layout with Tailwind CSS
- **TypeScript**: Full type safety throughout the application
- **SEO Optimized**: Built-in SEO features with Next.js
- **Dark Mode Ready**: Styled with Tailwind CSS for easy theming

## 🛠️ Tech Stack

- **Framework**: [Next.js 15.3.1](https://nextjs.org/) with App Router
- **Language**: [TypeScript 5](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS 4.1.5](https://tailwindcss.com/)
- **Markdown**: [react-markdown](https://github.com/remarkjs/react-markdown) + [remark](https://remark.js.org/)
- **Content**: Markdown files in `posts/` directory
- **Deployment**: Optimized for [Vercel](https://vercel.com/)

## 📁 Project Structure

```
my-blog/
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── layout.tsx      # Root layout
│   │   ├── page.tsx        # Homepage
│   │   └── posts/[slug]/   # Dynamic post routes
│   ├── components/         # React components
│   │   ├── Header.tsx      # Site header
│   │   ├── Sidebar.tsx     # Navigation sidebar
│   │   ├── PostList.tsx    # Blog post list
│   │   └── CodeBlock.tsx   # Code syntax highlighting
│   ├── lib/               # Utility functions
│   │   └── posts.ts       # Post processing logic
│   └── styles/            # Custom styles
│       └── markdown.css   # Markdown styling
├── posts/                 # Blog posts (markdown files)
├── public/               # Static assets
└── package.json          # Dependencies and scripts
```

## 📚 Learn More

To learn more about the technologies used:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial
- [Tailwind CSS Documentation](https://tailwindcss.com/docs) - styling with Tailwind
- [TypeScript Documentation](https://www.typescriptlang.org/docs/) - TypeScript guide

##  Contributing

This is a personal blog project, but if you find any issues or have suggestions, feel free to open an issue or submit a pull request.

## 📄 License

This project is open source and available under the [MIT License](LICENSE).