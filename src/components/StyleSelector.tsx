'use client';

interface StyleSelectorProps {
  onSelect: (style: string) => void;
}

const styles = [
  {
    id: 'cosmic',
    name: 'Cosmic Nebula',
    desc: 'Deep space nebula with stars and cosmic dust',
    emoji: '🌌',
    gradient: 'from-blue-600 to-indigo-600',
  },
  {
    id: 'abstract',
    name: 'Liquid Abstract',
    desc: 'Fluid shapes with luminous saturated colors',
    emoji: '🌀',
    gradient: 'from-purple-600 to-pink-500',
  },
  {
    id: 'geometric',
    name: 'Sacred Geometry',
    desc: 'Precise patterns with metallic gold accents',
    emoji: '💎',
    gradient: 'from-orange-500 to-red-500',
  },
  {
    id: 'watercolor',
    name: 'Watercolor',
    desc: 'Soft, dreamy painted textures on white',
    emoji: '🎨',
    gradient: 'from-teal-500 to-cyan-500',
  },
  {
    id: 'surreal',
    name: 'Surreal Portal',
    desc: 'Mind-bending dreamscape with infinite depth',
    emoji: '🔥',
    gradient: 'from-yellow-500 to-purple-600',
  },
  {
    id: 'elemental',
    name: 'Elemental',
    desc: 'Fire, ice, water — your iris meets nature',
    emoji: '🌊',
    gradient: 'from-cyan-500 to-orange-500',
  },
];

export default function StyleSelector({ onSelect }: StyleSelectorProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
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
