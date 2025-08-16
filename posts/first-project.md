---
title: "first project"
date: "2025-05-03"
category: "nextjs"
---

# 1. Setup project
vercel is hosting service which helps to host web page freely.

before we start, I had to install node first.

``
```
brew install node

node -v
npm -v
npx -v

```

and then gpt recommended to install github cli.

```
brew install gh
gh auth login
```

when I executed ~auth login~ command, it asked me to input some informations and I configured it using ssh which I already set it before 

![[Pasted image 20250503220326.png]]

Finally, we can setup nextjs project by executing below commands 

```
npx create-next-app@latest my-blog --typescript

```
![[Pasted image 20250503220545.png]]

I can start to run nextjs page through run command 
```
cd my-blog
npm run dev 
```
![[Pasted image 20250503220805.png]]



# 2. Simple markdown page 

The gpt asked me continuing implementation of first project and I said okay. 
it recommended to install tailwind CSS (I'm curious why it was named tailwind) by running this command. 
```
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# errors what I got 
**npm** error could not determine executable to run

**npm** error A complete log of this run can be found in: /Users/pskim/.npm/_logs/2025-05-03T13_13_11_993Z-debug-0.log
```

After some attempts, gpt commands were out of date and can't be executed. so I tried to install tailwindcss using below commands which exist in[ tailwindcss website](https://tailwindcss.com/docs/installation/tailwind-cli) .

```
npm install tailwindcss @tailwindcss/cli

# create src/input.css and write below 
@import "tailwindcss";

# Run the CLI tool to scan your source files for classes and build your CSS.
npx @tailwindcss/cli -i ./src/input.css -o ./src/output.css --watch
```


**BTW, what is tailwindCSS?** 
- **Tailwind CSS** is a **utility-first CSS framework** for rapidly building custom user interfaces. Instead of writing traditional CSS classes, you compose your styles **directly in your HTML/JSX** using utility classes like

```
<div class="bg-blue-500 text-white p-4 rounded-lg">
  Hello, world!
</div>
```

