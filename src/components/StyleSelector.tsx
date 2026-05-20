'use client';

interface StyleSelectorProps {
  onSelect: (style: string) => void;
}

const styles = [
  {
    id: 'abstract',
    name: 'Abstract',
    desc: 'Fluid shapes and flowing colors',
    emoji: '🌀',
    gradient: 'from-purple-600 to-pink-500',
  },
  {
    id: 'cosmic',
    name: 'Cosmic',
    desc: 'Nebula-inspired deep space art',
    emoji: '🌌',
    gradient: 'from-blue-600 to-indigo-600',
  },
  {
    id: 'watercolor',
    name: 'Watercolor',
    desc: 'Soft, dreamy painted textures',
    emoji: '🎨',
    gradient: 'from-teal-500 to-cyan-500',
  },
  {
    id: 'geometric',
    name: 'Geometric',
    desc: 'Sharp patterns and symmetry',
    emoji: '💎',
    gradient: 'from-orange-500 to-red-500',
  },
  {
    id: 'surreal',
    name: 'Surreal',
    desc: 'Mind-bending dreamscapes',
    emoji: '🔥',
    gradient: 'from-yellow-500 to-purple-600',
  },
];

export default function StyleSelector({ onSelect }: StyleSelectorProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {styles.map((style) => (
        <button
          key={style.id}
          onClick={() => onSelect(style.id)}
          className="group glass-card rounded-xl p-4 text-center hover:border-iris-500/50 transition-all hover:scale-105"
        >
          <div
            className={`w-full aspect-square rounded-lg bg-gradient-to-br ${style.gradient} flex items-center justify-center text-4xl mb-3`}
          >
            {style.emoji}
          </div>
          <h3 className="font-semibold text-sm">{style.name}</h3>
          <p className="text-gray-500 text-xs mt-1">{style.desc}</p>
        </button>
      ))}
    </div>
  );
}
