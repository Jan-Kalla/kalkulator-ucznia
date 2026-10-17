import { MetadataRoute } from 'next'
 
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Kalkulator Śl.TZN',
    short_name: 'Kalkulator',
    description: 'Aplikacja dla uczniów Śląskich Technicznych Zakładów Naukowych',
    start_url: '/',
    display: 'standalone',
    background_color: '#020617', // Nasz ciemny motyw z tailwinda (slate-950)
    theme_color: '#06b6d4',      // Akcent w kolorze cyan-500
    icons: [
      {
        src: '/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}