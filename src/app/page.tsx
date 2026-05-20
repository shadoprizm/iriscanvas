import Footer from '@/components/Footer';

export default function Home() {
  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 animated-gradient opacity-20" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0a0a0f]" />
        
        {/* Floating orbs */}
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-iris-500/20 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-iris-300/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '3s' }} />
        
        <div className="relative z-10 text-center px-4 max-w-5xl mx-auto">
          <h1 className="text-5xl md:text-7xl font-bold mb-6">
            Turn Your <span className="gradient-text">Iris</span> Into Art
          </h1>
          <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Your eyes are unique. Capture your iris pattern and watch AI transform it 
            into stunning, one-of-a-kind artwork.
          </p>
          <a
            href="/capture"
            className="inline-block px-8 py-4 text-lg font-semibold rounded-full animated-gradient text-white hover:scale-105 transition-transform duration-300 shadow-lg shadow-iris-500/25"
          >
            Capture Your Iris Now ✨
          </a>
          <p className="mt-4 text-gray-500 text-sm">Free to try • No app download • Works in browser</p>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">
            How It <span className="gradient-text">Works</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                title: 'Capture',
                desc: 'Use your phone or webcam to snap a close-up of your eye. Our tool guides you to the perfect shot.',
                icon: '📸',
              },
              {
                step: '02',
                title: 'Generate',
                desc: 'AI analyzes your iris colors and patterns, then transforms them into stunning artwork in your chosen style.',
                icon: '🎨',
              },
              {
                step: '03',
                title: 'Download & Print',
                desc: 'Download your high-res art instantly, or order a professional canvas print delivered to your door.',
                icon: '🖼️',
              },
            ].map((item) => (
              <div key={item.step} className="glass-card rounded-2xl p-8 text-center hover:border-iris-500/50 transition-colors">
                <div className="text-5xl mb-4">{item.icon}</div>
                <div className="text-iris-400 text-sm font-mono mb-2">STEP {item.step}</div>
                <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                <p className="text-gray-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-4 bg-gradient-to-b from-transparent via-iris-900/10 to-transparent">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">
            Why <span className="gradient-text">IrisCanvas</span>?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                title: 'AI-Powered',
                desc: 'Advanced AI extracts your unique color palette and texture patterns.',
                icon: '🤖',
              },
              {
                title: 'Uniquely Yours',
                desc: 'No two irises are alike — your art is literally one of a kind.',
                icon: '👁️',
              },
              {
                title: 'Multiple Styles',
                desc: 'Choose from Abstract, Cosmic, Watercolor, Geometric, and more.',
                icon: '🎭',
              },
              {
                title: 'Instant Results',
                desc: 'Generate your art in seconds. Download or print with one click.',
                icon: '⚡',
              },
            ].map((feature) => (
              <div key={feature.title} className="glass-card rounded-xl p-6 hover:border-iris-500/50 transition-colors">
                <div className="text-3xl mb-3">{feature.icon}</div>
                <h3 className="text-lg font-bold mb-2">{feature.title}</h3>
                <p className="text-gray-400 text-sm">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Art Styles Preview */}
      <section className="py-24 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Art <span className="gradient-text">Styles</span>
          </h2>
          <p className="text-gray-400 mb-12 max-w-xl mx-auto">
            Each style interprets your iris differently — from dreamy watercolors to cosmic explosions.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { name: 'Abstract', emoji: '🌀', color: 'from-purple-600 to-pink-500' },
              { name: 'Cosmic', emoji: '🌌', color: 'from-blue-600 to-purple-600' },
              { name: 'Watercolor', emoji: '🎨', color: 'from-teal-500 to-blue-500' },
              { name: 'Geometric', emoji: '💎', color: 'from-orange-500 to-red-500' },
              { name: 'Surreal', emoji: '🔥', color: 'from-yellow-500 to-purple-600' },
            ].map((style) => (
              <div key={style.name} className="group cursor-pointer">
                <div className={`aspect-square rounded-2xl bg-gradient-to-br ${style.color} flex items-center justify-center text-5xl group-hover:scale-105 transition-transform duration-300 shadow-lg`}>
                  {style.emoji}
                </div>
                <p className="mt-3 font-semibold">{style.name}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-24 px-4 bg-gradient-to-b from-transparent via-iris-900/10 to-transparent">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">
            Simple <span className="gradient-text">Pricing</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                name: 'Free',
                price: '$0',
                desc: 'Try it out',
                features: ['1 generation', 'Low resolution', 'Watermarked', 'Instant download'],
                cta: 'Try Free',
                popular: false,
              },
              {
                name: 'Pro',
                price: '$9.99',
                desc: 'Best for digital art',
                features: ['5 generations', 'High resolution', 'No watermark', 'All styles', 'Instant download'],
                cta: 'Go Pro',
                popular: true,
              },
              {
                name: 'Canvas Print',
                price: '$29.99+',
                desc: 'Ready to hang',
                features: ['1 high-res generation', 'No watermark', 'Canvas print shipped', 'Multiple sizes', 'Free shipping'],
                cta: 'Order Print',
                popular: false,
              },
            ].map((plan) => (
              <div
                key={plan.name}
                className={`glass-card rounded-2xl p-8 text-center hover:border-iris-500/50 transition-colors ${
                  plan.popular ? 'border-iris-500/50 ring-1 ring-iris-500/25 relative' : ''
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-iris-500 rounded-full text-sm font-semibold">
                    Most Popular
                  </div>
                )}
                <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                <div className="text-4xl font-bold mb-1 gradient-text">{plan.price}</div>
                <p className="text-gray-400 text-sm mb-6">{plan.desc}</p>
                <ul className="space-y-3 mb-8 text-left">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-gray-300">
                      <span className="text-iris-400">✓</span> {f}
                    </li>
                  ))}
                </ul>
                <a
                  href="/capture"
                  className={`block w-full py-3 rounded-full font-semibold transition-all ${
                    plan.popular
                      ? 'animated-gradient text-white hover:scale-105'
                      : 'border border-iris-500/50 text-iris-300 hover:bg-iris-500/10'
                  }`}
                >
                  {plan.cta}
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-5xl font-bold mb-6">
            Ready to See Your <span className="gradient-text">Art</span>?
          </h2>
          <p className="text-xl text-gray-400 mb-8">
            Your iris is a masterpiece waiting to happen. Start creating in seconds.
          </p>
          <a
            href="/capture"
            className="inline-block px-10 py-4 text-lg font-semibold rounded-full animated-gradient text-white hover:scale-105 transition-transform duration-300 shadow-lg shadow-iris-500/25"
          >
            Start Now — It&apos;s Free
          </a>
        </div>
      </section>

      <Footer />
    </main>
  );
}
