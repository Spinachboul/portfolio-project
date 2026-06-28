import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { RouterProvider, useRouter, matchRoute } from './lib/router';
import Nav from './components/Nav';
import Footer from './components/Footer';
import Home from './pages/Home';
import BlogList from './pages/BlogList';
import BlogPost from './pages/BlogPost';
import Blueprint from './pages/Blueprint';
import Contact from './pages/Contact';
import Login from './pages/Login';
import Admin from './pages/Admin';

function Routes() {
  const { path } = useRouter();

  if (path === '/' || path === '') return <Home />;
  if (path === '/blog') return <BlogList />;
  const post = matchRoute('/blog/:slug', path);
  if (post) return <BlogPost slug={post.slug} />;
  if (path === '/blueprint') return <Blueprint />;
  if (path === '/contact') return <Contact />;
  if (path === '/login') return <Login />;
  if (path === '/admin') return <Admin />;

  return (
    <div className="container-page py-24 text-center">
      <h1 className="font-serif text-3xl font-semibold mb-2">Page not found</h1>
      <p className="text-muted">The page you're looking for doesn't exist.</p>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <RouterProvider>
          <div className="min-h-screen flex flex-col bg-bg text-text">
            <Nav />
            <main className="flex-1">
              <Routes />
            </main>
            <Footer />
          </div>
        </RouterProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
