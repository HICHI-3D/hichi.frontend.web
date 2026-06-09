const modules = import.meta.glob<string>('/src/shared/assets/icon/**/*.svg', {
  eager: true,
  query: '?url',
  import: 'default',
});

const iconMap = new Map<string, string>();
for (const [path, url] of Object.entries(modules)) {
  const name = path.split('/').pop()!.replace('.svg', '');
  iconMap.set(name, url);
}

export type IconName =
  | 'cube'
  | 'couch'
  | 'sparkle'
  | 'suggest'
  | 'palette'
  | 'arrow-back'
  | 'arrow-undo'
  | 'save'
  | 'enter'
  | 'setting'
  | 'lock'
  | 'camera'
  | 'zoomIn'
  | 'zoomOut'
  | 'zoomFit';

type Props = {
  name: IconName;
  active?: boolean;
  alt?: string;
  className?: string;
};

const resolve = (name: IconName, active: boolean): string => {
  if (active) {
    const activeUrl = iconMap.get(`${name}Activate`);
    if (activeUrl) return activeUrl;
  }
  const url = iconMap.get(name);
  if (!url) throw new Error(`Icon not found: ${name}`);
  return url;
};

const Icon = ({ name, active = false, alt = '', className }: Props) => (
  <img src={resolve(name, active)} alt={alt} className={className} />
);

export default Icon;
