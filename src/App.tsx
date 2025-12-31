import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { LoginForm } from './components/LoginForm';
import { ChatApp } from './components/ChatApp';
import { MobileChatApp } from './components/MobileChatApp';
import { useMobile } from './hooks/useMobile';

const AppContent = () => {
  const { user, loading } = useAuth();
  const isMobile = useMobile(768);

  if (loading) {
    return (
      <div className="h-screen-safe bg-slate-100 dark:bg-neutral-950 flex items-center justify-center">
        <div className="text-slate-600 dark:text-neutral-400">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <LoginForm />;
  }

  return isMobile ? <MobileChatApp /> : <ChatApp />;
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
