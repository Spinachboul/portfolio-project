import { Github, Linkedin, Twitter, PenTool } from 'lucide-react';
import { useRouter } from '../lib/router';

const SOCIALS = [
  { href: 'https://github.com', label: 'GitHub', Icon: Github },
  { href: 'https://linkedin.com', label: 'LinkedIn', Icon: Linkedin },
  { href: 'https://x.com', label: 'X', Icon: Twitter },
];

export default function Footer() {
  const { navigate } = useRouter();
  return (
    <footer className="mt-24 border-t border-border bg-surface/50">
      <div className="container-page py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="flex items-center gap-2 font-serif text-base font-semibold"
        >
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary text-primary-fg">
            <PenTool size={14} />
          </span>
          Dev Journal
        </button>

        <div className="flex items-center gap-1">
          {SOCIALS.map(({ href, label, Icon }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={label}
              title={label}
              className="grid h-9 w-9 place-items-center rounded-lg text-muted hover:text-text hover:bg-surface-2 transition-colors"
            >
              <Icon size={18} />
            </a>
          ))}
        </div>

        <p className="text-xs text-muted">
          &copy; {new Date().getFullYear()} Dev Journal. Built with care.
        </p>
      </div>
    </footer>
  );
}
