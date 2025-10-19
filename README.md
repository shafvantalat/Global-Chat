# 🌐 Global Chat

**Global Chat** is a real-time, minimal, and secure chat platform that connects users worldwide — built with **React + Supabase** and hosted on **Netlify**.  
It includes admin moderation tools, temporary group chats, and automatic message cleanup for a fresh and safe chat experience.

---

## ✨ Features

- 💬 **Instant Messaging** — Real-time chat powered by Supabase subscriptions.  
- 🧑‍🤝‍🧑 **Group Chats** — Anyone can create temporary chat groups.  
- ⏰ **Auto Timeout** — Groups are automatically deleted after 30 minutes of inactivity.  
- 🧹 **Message Auto-Delete** — Every message is auto-deleted 30 minutes after it’s sent.  
- 🔑 **Admin Control Panel** — A protected admin page for banning specific usernames.  
- 🚫 **Secure Admin Auth** — Admin username is fully protected through authentication.  
- 🎨 **Clean Modern UI** — Built with Vite, React, and TailwindCSS for performance and beauty.  
- 🌐 **Netlify Hosted** — Fast and globally distributed hosting.

---

## 🛠️ Tech Stack

| Category | Technologies |
|-----------|--------------|
| **Frontend** | React + Vite + TypeScript + TailwindCSS |
| **Backend / Database** | Supabase (Realtime & Auth) |
| **Hosting** | Netlify |
| **State Management** | React Hooks / Context API |
| **Realtime Communication** | Supabase Realtime (WebSockets) |

---

## ⚡ Demo

🔗 **Live Website:** [https://global-chat.netlify.app](https://global-chat.netlify.app)  

---

## 📦 Installation

Clone the repository and set up locally:

```bash
# Clone this repository
git clone https://github.com/shafvantalat/Global-Chat.git
```

# Navigate to project folder
```
cd Global-Chat
```

# Install dependencies
```
npm install
```

# Run the development server
```
npm run dev
```
⚙️ Configuration
Create a .env file in the root directory and add your Supabase credentials:

bash
```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_ADMIN_USERNAME=your_admin_username
VITE_ADMIN_PASSWORD=your_admin_password
```
🔒 The admin credentials are used to protect access to the admin page.

## 🧠 Core Functionality
🗨️ Real-time Messaging
- Messages are sent and received instantly using Supabase Realtime channels.

 ## 👥 Group Creation
- Any user can create a new group that stays active for 30 minutes.
- Inactive groups are automatically removed from the database.

## ⏳ Message Expiry
- Each message is deleted automatically 30 minutes after it’s sent — keeping the chat lightweight and clean.

## 🧑‍💼 Admin Panel
- Admins can:
- Ban specific usernames
- Monitor active groups
- Manage app activity securely with authentication protection

## 🚧 Roadmap
 - Emoji and media support
 - User avatars and profiles
 Custom group icons
 Push notifications
 Message reactions

## 🤝 Contributing
Contributions, issues, and feature requests are welcome!
Fork the repository
Create your feature branch (git checkout -b feature/amazing-feature)
Commit your changes (git commit -m 'Add new feature')
Push to the branch (git push origin feature/amazing-feature)
Open a Pull Request

## 🧾 License


# 💬 Connect With Me
## 👨‍💻 Muhammed Shafvan

**🌐 Portfolio**

**💼 LinkedIn**

🐙 GitHub

📸 Instagram

✉️ Email

© 2025 All rights reserved – Muhammed Shafvan
