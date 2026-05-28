import { useRef, useEffect, useState, type ComponentType } from 'react';

import { ArrowRightIcon } from './ui/arrow-right';
import { BriefcaseBusinessIcon } from './ui/briefcase-business';
import { FileTextIcon } from './ui/file-text';
import { FishSymbolIcon } from './ui/fish-symbol';
import { FolderOpenIcon } from './ui/folder-open';
import { GithubIcon } from './ui/github';
import { LayersIcon } from './ui/layers';
import { LinkedinIcon } from './ui/linkedin';
import { MailboxIcon } from './ui/mailbox';
import { MonitorCheckIcon } from './ui/monitor-check';
import { MoonIcon } from './ui/moon';
import { SunIcon } from './ui/sun';
import { UserIcon } from './ui/user';

type IconHandle = { startAnimation: () => void; stopAnimation: () => void };

const ICON_MAP: Record<string, ComponentType<any>> = {
  'arrow-right': ArrowRightIcon,
  'briefcase-business': BriefcaseBusinessIcon,
  'file-text': FileTextIcon,
  'fish-symbol': FishSymbolIcon,
  'folder-open': FolderOpenIcon,
  'github': GithubIcon,
  'layers': LayersIcon,
  'linkedin': LinkedinIcon,
  'mailbox': MailboxIcon,
  'monitor-check': MonitorCheckIcon,
  'moon': MoonIcon,
  'sun': SunIcon,
  'user': UserIcon,
};

const SIZE_MAP = { sm: 16, md: 20, lg: 24 } as const;

export type IconName = keyof typeof ICON_MAP;
export type IconSize = keyof typeof SIZE_MAP;
export type IconTrigger = 'hover' | 'scroll' | 'click';

interface AnimatedIconProps {
  name: string;
  size?: IconSize;
  trigger?: IconTrigger;
  className?: string;
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return reduced;
}

export default function AnimatedIcon({
  name,
  size = 'md',
  trigger = 'hover',
  className,
}: AnimatedIconProps) {
  const Icon = ICON_MAP[name];
  const reducedMotion = useReducedMotion();
  const iconRef = useRef<IconHandle>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasTriggeredRef = useRef(false);

  const pixelSize = SIZE_MAP[size];

  // For hover trigger: listen on nearest ancestor <a> or <button> so the icon
  // animates when hovering anywhere on the parent link, not just on the icon itself.
  useEffect(() => {
    if (trigger !== 'hover' || reducedMotion || !containerRef.current) return;

    const parent = containerRef.current.closest('a, button');
    if (!parent) return;

    const onEnter = () => iconRef.current?.startAnimation();
    const onLeave = () => iconRef.current?.stopAnimation();

    parent.addEventListener('mouseenter', onEnter);
    parent.addEventListener('mouseleave', onLeave);
    return () => {
      parent.removeEventListener('mouseenter', onEnter);
      parent.removeEventListener('mouseleave', onLeave);
    };
  }, [trigger, reducedMotion]);

  useEffect(() => {
    if (trigger !== 'scroll' || reducedMotion || !containerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && !hasTriggeredRef.current) {
            hasTriggeredRef.current = true;
            iconRef.current?.startAnimation();
            observer.disconnect();
          }
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [trigger, reducedMotion]);

  if (!Icon) return null;

  const handleClick = trigger === 'click' && !reducedMotion
    ? () => iconRef.current?.startAnimation()
    : undefined;

  return (
    <div ref={containerRef} onClick={handleClick} style={{ display: 'inline-flex' }}>
      <Icon ref={iconRef} size={pixelSize} className={className} />
    </div>
  );
}
